-- PROPOSED – NOT APPLIED. Review only.
-- 001: add new role values. Must be its own transaction/migration because
-- Postgres cannot use a newly added enum value in the same transaction.
-- Additive: existing 'admin' / 'moderator' / 'user' values and rows are untouched.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';

-- ROLLBACK: Postgres cannot drop enum values. Harmless if unused; to "disable",
-- simply delete user_roles rows with these roles.
