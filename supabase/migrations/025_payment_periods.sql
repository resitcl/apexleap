-- ============================================================
-- Payment Periods & Subscription Billing Improvements
-- Adds period tracking to payments and improves subscription model
-- ============================================================

-- Add period columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_waived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS waived_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS waived_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS waiver_reason TEXT;

-- Add billing anchor to subscriptions (day of month when billing occurs)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Create index for period queries
CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(club_id, period_start, period_end) WHERE period_start IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_overdue ON payments(club_id, status, due_date) WHERE status = 'overdue';
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON subscriptions(club_id, next_billing_date) WHERE status = 'active';

-- Helper function to calculate period end based on billing cycle
CREATE OR REPLACE FUNCTION calculate_period_end(
  p_start DATE,
  p_cycle billing_cycle
) RETURNS DATE AS $$
BEGIN
  RETURN CASE p_cycle
    WHEN 'monthly' THEN p_start + INTERVAL '1 month' - INTERVAL '1 day'
    WHEN 'quarterly' THEN p_start + INTERVAL '3 months' - INTERVAL '1 day'
    WHEN 'semiannual' THEN p_start + INTERVAL '6 months' - INTERVAL '1 day'
    WHEN 'annual' THEN p_start + INTERVAL '1 year' - INTERVAL '1 day'
    WHEN 'single' THEN NULL
    ELSE p_start + INTERVAL '1 month' - INTERVAL '1 day'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to calculate next period start
CREATE OR REPLACE FUNCTION calculate_next_period_start(
  p_current_start DATE,
  p_cycle billing_cycle
) RETURNS DATE AS $$
BEGIN
  RETURN CASE p_cycle
    WHEN 'monthly' THEN p_current_start + INTERVAL '1 month'
    WHEN 'quarterly' THEN p_current_start + INTERVAL '3 months'
    WHEN 'semiannual' THEN p_current_start + INTERVAL '6 months'
    WHEN 'annual' THEN p_current_start + INTERVAL '1 year'
    WHEN 'single' THEN NULL
    ELSE p_current_start + INTERVAL '1 month'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing payments to have period_start = due_date (migration of existing data)
UPDATE payments 
SET period_start = due_date,
    period_end = calculate_period_end(due_date, COALESCE(
      (SELECT billing_cycle FROM plans WHERE plans.id = payments.plan_id),
      'monthly'
    ))
WHERE period_start IS NULL AND plan_id IS NOT NULL;

-- Update existing subscriptions to set current period info
UPDATE subscriptions s
SET 
  billing_anchor_day = EXTRACT(DAY FROM start_date)::INTEGER,
  current_period_start = COALESCE(
    (SELECT MAX(period_start) FROM payments p WHERE p.subscription_id = s.id AND p.status = 'paid'),
    start_date
  ),
  current_period_end = calculate_period_end(
    COALESCE(
      (SELECT MAX(period_start) FROM payments p WHERE p.subscription_id = s.id AND p.status = 'paid'),
      start_date
    ),
    (SELECT billing_cycle FROM plans WHERE plans.id = s.plan_id)
  ),
  next_billing_date = calculate_next_period_start(
    COALESCE(
      (SELECT MAX(period_start) FROM payments p WHERE p.subscription_id = s.id AND p.status = 'paid'),
      start_date
    ),
    (SELECT billing_cycle FROM plans WHERE plans.id = s.plan_id)
  )
WHERE current_period_start IS NULL;

-- Comments for documentation
COMMENT ON COLUMN payments.period_start IS 'Start date of the coverage period this payment covers';
COMMENT ON COLUMN payments.period_end IS 'End date of the coverage period this payment covers';
COMMENT ON COLUMN payments.is_waived IS 'Whether this payment was waived/forgiven by admin';
COMMENT ON COLUMN subscriptions.billing_anchor_day IS 'Day of month when billing occurs (1-28)';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of current active subscription period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of current active subscription period';
COMMENT ON COLUMN subscriptions.next_billing_date IS 'Date when next payment is due';
