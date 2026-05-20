-- Drop unused NextAuth-style tables left over from the original Prisma schema.
-- They have never been populated by HackCentral; the runtime uses public."User"
-- plus Forge service-role inserts for identity. Keeping them exposed via
-- PostgREST triggered rls_disabled_in_public and sensitive_columns_exposed
-- security advisor errors (refresh_token, access_token, token columns).
DROP TABLE IF EXISTS public."VerificationToken" CASCADE;
DROP TABLE IF EXISTS public."Session" CASCADE;
DROP TABLE IF EXISTS public."Account" CASCADE;

-- handle_new_user is a SECURITY DEFINER trigger function on auth.users.
-- It must not be callable via the PostgREST /rpc/handle_new_user endpoint by
-- anon or authenticated roles. Triggers continue to execute it because they
-- run as the function owner, not the caller.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
