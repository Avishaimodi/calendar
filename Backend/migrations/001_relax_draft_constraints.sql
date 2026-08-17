-- ============================================================
-- Migration 001 — Allow partial data on drafts
-- ============================================================
-- Original schema required title/description/category/date etc.
-- as NOT NULL on every row, and had CHECK constraints on `tasks`
-- that always demanded due_date/difficulty for normal tasks (or
-- their absence for daily tasks) — regardless of status.
--
-- Drafts now need to hold incomplete data. This migration:
--   1. Drops NOT NULL on fields that must be fillable-later.
--   2. Replaces the "always on" CHECK constraints with ones that
--      only bind when status = 'active' — i.e. a row can be saved
--      incomplete as a draft, but cannot be promoted to (or
--      created directly as) 'active' unless it is fully valid.
-- ============================================================

-- ---------------- events ----------------
ALTER TABLE events ALTER COLUMN title             DROP NOT NULL;
ALTER TABLE events ALTER COLUMN description        DROP NOT NULL;
ALTER TABLE events ALTER COLUMN event_category_id   DROP NOT NULL;
ALTER TABLE events ALTER COLUMN event_date          DROP NOT NULL;

ALTER TABLE events ADD CONSTRAINT chk_events_active_complete CHECK (
    status <> 'active' OR (
        title IS NOT NULL AND btrim(title) <> '' AND
        description IS NOT NULL AND btrim(description) <> '' AND
        event_category_id IS NOT NULL AND
        event_date IS NOT NULL
    )
);

-- ---------------- tasks ----------------
ALTER TABLE tasks ALTER COLUMN title            DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN description       DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN task_category_id  DROP NOT NULL;

-- Drop the old always-on constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_daily_task_fields;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_normal_task_fields;

-- Replace with a single constraint that only binds for active rows
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_active_complete CHECK (
    status <> 'active' OR (
        title IS NOT NULL AND btrim(title) <> '' AND
        description IS NOT NULL AND btrim(description) <> '' AND
        task_category_id IS NOT NULL AND
        (
            (task_type = 'daily'  AND due_date IS NULL     AND due_time IS NULL AND difficulty IS NULL)
            OR
            (task_type = 'normal' AND due_date IS NOT NULL AND difficulty IS NOT NULL)
        )
    )
);

-- task_type itself stays NOT NULL — the UI always has a type selected
-- (radio defaults to Daily), so there's no "typeless" draft state to support.
