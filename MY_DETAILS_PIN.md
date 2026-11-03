# My Details PIN

Each authenticated account creates and confirms a four-digit PIN once. Later unlocks require that PIN. PINs are salted bcrypt hashes in a separate, RLS-protected table; they are not saved in the profile JSON or browser storage. The implementation uses PostgreSQL's [password hashing functions](https://www.postgresql.org/docs/15/pgcrypto.html).

Successful verification issues a random, account-bound grant for 15 minutes. Only its SHA-256 hash is stored on the server; the browser keeps the grant in memory. Refreshing, signing out, switching accounts, expiry, and the Lock My Details button remove browser access. Five wrong attempts lock PIN verification for 15 minutes, with attempts serialized in the database to avoid concurrent-request bypasses. Setting up again cannot replace an existing PIN. Resetting profile details does not reset the PIN.

GET, POST, and DELETE on `/api/citizen/details` require a verified Supabase access token plus the unlock grant. Caller-supplied account IDs cannot authorize another person's data. Demo tokens and anonymous access are rejected. The web page no longer hydrates the vault before unlock or mirrors the full applicant into local storage. Existing extension consumers must obtain authorized access rather than relying on the old public details endpoint.

## Deployment

Apply `supabase/migrations/20261103000004_details_pin.sql` to the application's Supabase project before releasing this code. It installs the private tables and service-role-only `details_pin_gate` RPC. No application environment secrets or plaintext PINs are added.

This checkout has no linked Supabase project, and the local Docker database is not running. The migration was **not applied** during implementation. Until it is applied, PIN setup/unlock fails closed with a retry message; it must not fall back to local or demo verification. API and browser-grant tests use mocked database responses; database bcrypt, concurrency, and permissions still need verification against the deployed migration.

No forgot-PIN bypass is provided. Recovery requires a separately designed, authenticated account-recovery flow. This PIN protects My Details access; it does not encrypt already-shared chat messages or replace the application's account authentication and database authorization policies.
