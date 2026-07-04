-- ============================================================
-- Subscription & payment integrity constraints
-- ============================================================

-- Cancel duplicate active subscriptions (keep the newest per athlete)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY club_id, athlete_id
           ORDER BY created_at DESC
         ) AS rn
  FROM subscriptions
  WHERE status = 'active'
)
UPDATE subscriptions
SET status = 'cancelled'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- One active subscription per athlete per club
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active_per_athlete
  ON subscriptions (club_id, athlete_id)
  WHERE status = 'active';

-- Prevent duplicate period payments for the same athlete/plan
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_period
  ON payments (club_id, athlete_id, plan_id, period_start)
  WHERE period_start IS NOT NULL
    AND status IN ('pending', 'overdue', 'paid');
