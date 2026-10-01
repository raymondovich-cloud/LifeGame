# LifeGame 3.0 — Identity Database Schema

Version: 1.0
Status: APPROVED
Date: 2026-10-01

## 1. Purpose

This document defines the V1 database model for LifeGame Identity and its security boundaries.

It is derived from:

- SECURITY_ARCHITECTURE.md
- THREAT_MODEL.md

This document defines the logical schema before production migrations are created.

The schema intentionally keeps authentication credentials inside Supabase Auth and keeps LifeGame-owned application data in separate tables.

---

## 2. Core Decision

LifeGame does not create its own password table.

Supabase Auth owns:

- users;
- authentication identities;
- password credentials;
- email verification state;
- authentication sessions/tokens;
- provider-specific authentication state.

LifeGame owns only application-level Identity metadata and security records that are required outside the Auth service.

Supabase stores Auth information in the protected auth schema, which is not exposed through the generated Data API. User-owned application tables may reference auth.users by UUID. [Supabase Auth documentation](https://supabase.com/docs/guides/auth)

---

## 3. V1 Logical Model

The initial model is intentionally small:

auth.users
    │
    ├── public.profiles
    │
    └── user-owned domain data
          ├── Finance
          ├── Health
          └── Development

private.security_events

Future entities:

- devices
- authenticators
- user encryption key metadata
- account recovery metadata
- subscriptions
- organizations/sharing

These are not added to V1 until their requirements are defined.

---

## 4. auth.users

Owner: Supabase Auth.

LifeGame must treat auth.users as an external Identity source.

Conceptually available identity information includes:

- id
- email
- email_confirmed_at
- created_at
- updated_at

LifeGame must not duplicate the password, password hash, refresh token, or provider-specific credential state into public tables.

The Auth schema is intentionally not exposed through the auto-generated API. [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data)

---

## 5. public.profiles

Purpose:

Store minimal non-sensitive application profile data that LifeGame itself needs.

Recommended V1 schema:

profiles
- id uuid primary key
- display_name text nullable
- created_at timestamptz not null
- updated_at timestamptz not null

Relationship:

profiles.id → auth.users.id

Delete behavior:

ON DELETE CASCADE

No password, token, encryption key, recovery secret, or sensitive personal record belongs in profiles.

The table must have RLS enabled.

The authenticated user may access only the profile whose id equals auth.uid().

Supabase recommends user-owned public tables reference auth.users and be protected by RLS. [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data)

---

## 6. Why profiles.id is the user identity

We do not create a second LifeGame user UUID in V1.

The canonical user identity is:

auth.users.id

The application profile uses the same UUID:

profiles.id = auth.users.id

This avoids identity mapping errors and simplifies RLS.

Conceptually:

User Identity
     │
     └── UUID
          │
          ├── profiles.id
          ├── finance.user_id
          ├── health.user_id
          └── development.user_id

---

## 7. User-Owned Domain Tables

Every persistent user-owned table must have:

user_id uuid not null references auth.users(id) on delete cascade

Example:

finance_records
- id uuid
- user_id uuid
- ...
- created_at timestamptz
- updated_at timestamptz

Required index:

index on user_id

The user_id column is part of the authorization boundary, not merely application metadata.

---

## 8. RLS Standard

Every user-owned exposed table must:

1. Enable RLS.
2. Explicitly define grants.
3. Define SELECT policy.
4. Define INSERT policy.
5. Define UPDATE policy.
6. Define DELETE policy where deletion is supported.
7. Use authenticated role explicitly.
8. Compare ownership with auth.uid().
9. Prevent changing ownership during UPDATE.

Conceptual policy:

SELECT:
auth.uid() = user_id

INSERT:
auth.uid() = user_id

UPDATE:
existing user_id = auth.uid()
AND resulting user_id = auth.uid()

DELETE:
auth.uid() = user_id

Supabase recommends explicit policies per operation and use of auth.uid() for ownership checks. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## 9. Anonymous Access

Identity tables are not public.

V1 rules:

anon:
- no profile access;
- no user-owned data access;
- no security-event access.

authenticated:
- access only to the authenticated user's permitted rows.

service_role:
- server-side administrative access only;
- never shipped to frontend;
- never embedded in public JavaScript.

Supabase documents that service_role bypasses RLS and therefore must remain server-side. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## 10. private.security_events

Purpose:

Store security/audit events that must not be directly readable by normal users through the public Data API.

Schema:

security_events
- id uuid primary key
- user_id uuid nullable references auth.users(id) on delete set null
- event_type text not null
- occurred_at timestamptz not null
- session_id text nullable
- metadata jsonb nullable
- created_at timestamptz not null

Location:

private schema, not an exposed API schema.

Important:

- never store passwords;
- never store access tokens;
- never store refresh tokens;
- never store recovery tokens;
- never store encryption keys;
- never store plaintext private user data unless explicitly required.

IP/user-agent information is not mandatory. If introduced, it requires a separate privacy decision.

---

## 11. Why security_events is private

Security events are not ordinary user data.

Allowing a normal client to query them could reveal:

- login patterns;
- security metadata;
- internal event types;
- operational information;
- information useful for account enumeration or reconnaissance.

Therefore the default rule is:

client → security_events = DENIED

Only trusted server-side security infrastructure may write/read them as required.

---

## 12. Sessions

LifeGame V1 does not create a duplicate application sessions table.

Supabase Auth owns authentication session state.

LifeGame may maintain a future security projection of sessions if the product needs:

- active-session management;
- device management;
- manual revocation;
- security dashboard;
- suspicious-login history.

That projection will not become the authentication source of truth.

---

## 13. Devices

No devices table in V1.

Future conceptual schema:

devices
- id
- user_id
- platform
- device_label
- created_at
- last_seen_at
- revoked_at

A device is not a session and must not replace the authentication provider's session model.

---

## 14. Authenticators

No custom authenticator table in V1.

Future support may include:

- password;
- passkey/WebAuthn;
- TOTP;
- platform authenticators.

Supabase Auth remains the authentication authority.

---

## 15. Encryption Metadata

No plaintext encryption keys are stored in the database.

No master key is stored in the database.

No frontend-accessible table contains encryption secrets.

Future encrypted-data records may contain non-secret metadata such as:

- key_version
- encryption_algorithm
- nonce/IV
- ciphertext
- authenticated tag where represented separately

Actual key material belongs to the protected key-management boundary.

---

## 16. User Encryption Key Metadata

This is a future table, not V1.

Possible conceptual model:

user_key_metadata
- user_id
- key_version
- encrypted_dek
- created_at
- retired_at

The encrypted DEK is not the same thing as a plaintext encryption key.

The actual KEK remains outside the database.

Before implementation, this table requires a dedicated key lifecycle design covering:

- generation;
- rotation;
- recovery;
- re-encryption;
- retirement;
- destruction.

---

## 17. Email Storage

V1 does not duplicate email into profiles.

Canonical email remains owned by Supabase Auth.

Reason:

- prevents duplicate identity sources;
- avoids synchronization problems;
- avoids unnecessary PII replication;
- keeps authentication identity in the Auth boundary.

If LifeGame later needs application-level encrypted email search, that will be a separate architecture decision.

---

## 18. Account Status

V1 does not duplicate Auth account status into profiles unless a LifeGame-specific business status is required.

Authentication state belongs to Auth.

LifeGame-specific account state may later include:

- active;
- suspended;
- pending deletion;
- deleted.

Such a state must have explicit ownership semantics and must not conflict with Auth's security state.

---

## 19. Data Classification by Table

| Table | Owner | Sensitive | Client Access | Encryption |
|---|---|---:|---|---|
| auth.users | Auth Provider | High | Auth APIs only | Provider-managed |
| auth.identities | Auth Provider | High | Auth APIs only | Provider-managed |
| public.profiles | LifeGame | Low/Medium | Own row | At-rest; application encryption only if needed |
| private.security_events | LifeGame Security | High | No direct client access | At-rest; selective application protection |
| Finance tables | Finance Domain | High | Own rows only | Application-level encryption planned |
| Health tables | Health Domain | Very High | Own rows only | Application-level encryption planned |
| Development tables | Development Domain | Medium/High | Own rows only | Application-level encryption as required |

---

## 20. Foreign Key Rule

User-owned tables must reference:

auth.users(id)

with:

ON DELETE CASCADE

This guarantees that application-owned rows cannot remain orphaned after Auth user deletion.

Exceptions require explicit architecture approval.

Security/audit records may use:

ON DELETE SET NULL

when retaining a security event is required after account deletion.

---

## 21. Timestamp Rules

Persistent tables use:

created_at timestamptz not null
updated_at timestamptz not null

All timestamps are stored with timezone information.

Application code must not assume the database timezone is the user's local timezone.

Presentation may convert timestamps for the user.

---

## 22. UUID Rules

User and persistent entity IDs use UUIDs.

The canonical Identity UUID comes from auth.users.

Application entities use independent UUIDs unless an explicit aggregate boundary requires another strategy.

Sequential IDs must not be used as user identifiers or authorization identifiers.

---

## 23. Database Schema Boundaries

Conceptually:

auth
 └── Supabase-owned authentication data

public
 ├── profiles
 └── user-owned application tables protected by RLS

private
 └── security/internal infrastructure data

The public schema is not automatically safe merely because RLS exists.

Grants and RLS must both be configured deliberately. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## 24. RLS Performance Rule

Every user-owned table must have an index supporting its RLS ownership predicate.

Standard:

CREATE INDEX ... ON table(user_id)

For policies using auth.uid(), Supabase recommends wrapping the function as a SELECT expression where appropriate and indexing the policy filter column. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

Security must not be achieved by creating an authorization model that becomes unusably slow as LifeGame grows.

---

## 25. RLS Test Contract

Every user-owned table must have database tests covering at minimum:

### User A

- can SELECT own row;
- can INSERT own row;
- can UPDATE own row;
- can DELETE own row where permitted.

### User B

- cannot SELECT User A row;
- cannot UPDATE User A row;
- cannot DELETE User A row.

### Ownership mutation

User A cannot update:

user_id = User B

### Anonymous

Anonymous access is denied unless a specific feature explicitly requires public access.

Supabase supports database-level RLS tests with pgTAP and recommends a test file per protected table. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## 26. Service Role Rule

The service role is an administrative capability.

It bypasses RLS.

Therefore:

- never expose it to browser;
- never expose it to Telegram client;
- never expose it to iOS client;
- never store it in frontend environment variables;
- never commit it;
- use it only in trusted server-side infrastructure.

---

## 27. V1 Schema Decision

The minimum approved Identity schema is:

1. Supabase Auth:
   - auth.users
   - auth.identities
   - provider-managed authentication state

2. LifeGame:
   - public.profiles
   - private.security_events

3. Domain data:
   - each user-owned domain table contains user_id → auth.users.id
   - each exposed user-owned table uses RLS

No custom password table.
No custom session source of truth.
No plaintext encryption-key table.
No duplicate email identity table.

---

## 28. Implementation Order

The database implementation must follow:

1. Create Supabase project.
2. Configure Auth.
3. Configure email verification/recovery.
4. Create private schema.
5. Create public.profiles.
6. Enable RLS.
7. Configure explicit grants.
8. Create four operation-specific profile policies.
9. Create security-event infrastructure.
10. Create RLS test suite.
11. Verify cross-user denial.
12. Only then connect the LifeGame Identity Application layer.

Domain and Presentation must not be implemented against an insecure or untested database boundary.

---

## 29. Security Acceptance Criteria

The database foundation is accepted only when:

- auth.users remains the canonical authentication identity;
- no password data is duplicated;
- no tokens are duplicated;
- profiles has RLS;
- anon cannot access profiles;
- authenticated users can access only their own profile;
- user_id cannot be reassigned;
- security_events is not client-readable;
- every future user-owned table has RLS;
- every RLS ownership field is indexed;
- service_role is server-only;
- no secret is committed to Git;
- RLS tests prove cross-user denial.

---

## 30. Next Step

The next implementation artifact is:

supabase/migrations/0001_identity_foundation.sql

It must implement only the schema and security boundary defined in this document.

Authentication UI, Finance persistence, encryption implementation, and application logic are separate subsequent steps.
