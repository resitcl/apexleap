-- Fix: deduplicate payments before unique period index (safe if 033 partially applied)

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY club_id, athlete_id, plan_id, period_start
           ORDER BY
             CASE status
               WHEN 'paid' THEN 1
               WHEN 'overdue' THEN 2
               WHEN 'pending' THEN 3
               ELSE 4
             END,
             paid_at DESC NULLS LAST,
             created_at DESC
         ) AS rn
  FROM payments
  WHERE period_start IS NOT NULL
    AND plan_id IS NOT NULL
    AND status IN ('pending', 'overdue', 'paid')
)
UPDATE payments
SET
  status = 'cancelled',
  notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes <> '' THEN E'\n' ELSE '' END
    || 'Duplicado consolidado por migración 034 (índice único por período).'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_period
  ON payments (club_id, athlete_id, plan_id, period_start)
  WHERE period_start IS NOT NULL
    AND status IN ('pending', 'overdue', 'paid');
