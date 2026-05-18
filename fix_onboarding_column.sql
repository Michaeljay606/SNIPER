-- Ephata Tech — Rename onboarding_complete to onboarding_completed
-- This ensures consistency between the DB and the application code.

ALTER TABLE tenants RENAME COLUMN onboarding_complete TO onboarding_completed;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
