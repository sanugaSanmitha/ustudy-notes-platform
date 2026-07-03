-- Store only SHA-256 hashes of email verification tokens.
-- Existing plaintext tokens are intentionally invalidated by this migration.

delete from public.verification_tokens
where used_at is null;

drop index if exists idx_verification_tokens_token;

alter table public.verification_tokens
  drop constraint if exists verification_tokens_token_key;

alter table public.verification_tokens
  drop column if exists token;

alter table public.verification_tokens
  add column if not exists token_hash text unique;

create index if not exists idx_verification_tokens_token_hash
  on public.verification_tokens(token_hash);
