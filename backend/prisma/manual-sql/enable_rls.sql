-- =============================================================================
-- Database security hardening for Supabase
-- =============================================================================
-- Applied: 2026-05-14
--
-- Goal:
--   Ensure that the only path to data is through the backend Express API.
--   Direct PostgREST access using the anon or authenticated keys must fail.
--
-- Strategy (defense in depth):
--   1. Enable + FORCE row-level security on every public table
--   2. Add an explicit deny-all RLS policy per table (so the advisor stops
--      flagging "RLS Enabled No Policy")
--   3. REVOKE all grants on tables/sequences/functions from anon and
--      authenticated, and from future objects via ALTER DEFAULT PRIVILEGES
--
-- Why the backend keeps working:
--   The backend connects through the Supabase pooler as `postgres`.
--   In Supabase the `postgres` role has the BYPASSRLS attribute, so RLS is
--   ignored for queries from the backend. The deny-all policy applies only
--   to anon/authenticated coming through PostgREST.
--
-- To re-apply (e.g. after a schema reset):
--   psql "$DATABASE_URL" -f enable_rls.sql
-- =============================================================================

-- 1. Enable + FORCE RLS on every public table
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- 2. Add deny-all policy on every public table
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS deny_all_non_owner ON public.%I;', r.tablename);
    EXECUTE format(
      'CREATE POLICY deny_all_non_owner ON public.%I FOR ALL USING (false) WITH CHECK (false);',
      r.tablename
    );
  END LOOP;
END $$;

-- 3. Revoke all grants from anon and authenticated (current + future objects)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;

-- =============================================================================
-- Note about the remaining "Extension in Public: vector" advisor warning
-- =============================================================================
-- The pgvector extension is installed in the public schema. Moving it to a
-- dedicated `extensions` schema would require DROP EXTENSION ... CASCADE,
-- which drops the `document_chunks.embedding` column and all stored vectors.
-- This is left as-is because the extension itself does not expose data — only
-- the type/operators. Data security comes from the RLS + REVOKE above.
-- =============================================================================
