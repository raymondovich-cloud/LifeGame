# LifeGame 3.0 — Security Architecture

Version: 1.0
Status: APPROVED
Date: 2026-10-01

## 1. Purpose

This document is the mandatory security architecture contract for LifeGame 3.0.

It defines Identity, Authentication, Authorization, Session Security, Password Security, User Data Encryption, Key Management, Security Events, Audit, Trust Boundaries, and Infrastructure responsibilities.

Security decisions in this document take precedence over convenience and local implementation shortcuts.

## 2. Core Security Principles

1. User passwords are never stored in plaintext.
2. Passwords are not reversibly encrypted for storage.
3. Password hashing is delegated to a dedicated authentication system.
4. Authentication and authorization are separate concerns.
5. The frontend is never trusted.
6. Authorization must be enforced server-side.
7. User data must be isolated by user identity.
8. Sensitive user data must be encrypted at rest.
9. Encryption keys must be separated from encrypted data.
10. Secrets must never be committed to Git.
11. Domain code must not depend on authentication providers, databases, browser APIs, or encryption implementations.
12. Memory is runtime/application state, not the security source of truth.
13. Security events must be auditable without storing secrets.
14. Security mechanisms must be replaceable without rewriting the Domain.
15. Web, Telegram and iOS clients must use the same Identity model.

## 3. Architectural Position

LifeGame uses six architectural layers plus an independent Design System:

- source/core
- source/domain
- source/application
- source/presentation
- source/infrastructure
- source/memory
- source/design — independent visual system

Identity follows the same Clean Architecture / DDD boundaries.

Identity directories:

source/domain/identity/
source/application/identity/
source/presentation/auth/
source/infrastructure/identity/
source/infrastructure/security/

The Domain must not import authentication SDKs, database clients, JWT libraries, browser storage, HTTP clients, encryption provider implementations, Memory, or Supabase-specific modules.

## 4. Identity Bounded Context

Identity is a dedicated bounded context.

Conceptual model:

User
 ├── Identity
 ├── Credentials
 │    ├── Password
 │    ├── Passkey
 │    └── MFA
 ├── Sessions
 ├── Devices
 └── Security Events

The initial implementation may support email/password while keeping the model extensible for Passkeys, MFA and other authenticators.

## 5. Authentication Provider

The first production implementation is planned around:

- Supabase Auth
- PostgreSQL
- PostgreSQL Row Level Security (RLS)

Supabase is an Infrastructure implementation detail.

The LifeGame Domain must not know that Supabase exists.

A provider adapter must allow the authentication implementation to be replaced in the future without changing Domain rules.

## 6. Registration

Registration flow:

Client
  ↓
Presentation
  ↓
Application / Identity
  ↓
Authentication Provider
  ↓
User creation
  ↓
Email verification
  ↓
Active account
  ↓
Authenticated session

The client sends credentials only over HTTPS/TLS.

The raw password must never be written to application logs, analytics, audit logs, Memory, database records, Git, URLs, or query parameters.

## 7. Password Security

LifeGame does not implement its own password hashing algorithm.

Password storage is delegated to the authentication provider.

Conceptual model:

password
   ↓
salted password hashing / KDF
   ↓
password hash

The original password cannot be recovered from the stored hash.

Password reset uses a short-lived, single-use recovery mechanism.

After a successful password reset, existing sessions should be invalidated or rotated according to the provider's supported security model.

## 8. Authentication

Login flow:

email + password
       ↓
TLS
       ↓
Authentication Provider
       ↓
credential verification
       ↓
session
       ↓
LifeGame Application

LifeGame does not implement a custom JWT authentication system unless a future architecture decision explicitly requires it.

## 9. Session Security

A session represents an authenticated interaction between a user and LifeGame.

Conceptual model:

Session
 ├── id
 ├── userId
 ├── createdAt
 ├── expiresAt
 ├── lastActivityAt
 ├── revokedAt
 └── device metadata

Rules:

- Session secrets must be unpredictable.
- Access tokens must be short-lived where supported.
- Refresh tokens must be protected and rotated where supported.
- Logout must revoke or invalidate the relevant session.
- Password reset and critical security changes must invalidate or rotate affected sessions.
- Tokens must never be logged.
- Tokens must never be placed in URLs.
- The application must not expose internal session secrets through Domain objects.

## 10. Authorization

Authentication answers: Who is the user?

Authorization answers: What is this user allowed to access?

Every user-owned record must be associated with an unambiguous user identity.

Conceptually:

User A
 ├── Finance A       ✓
 ├── Health A        ✓
 └── Development A  ✓

User B
 └── User A data     ✗

Authorization must not rely only on frontend checks.

## 11. Database Isolation

PostgreSQL Row Level Security (RLS) is part of the authorization boundary.

User-owned tables must use policies that restrict access to the authenticated user's identity.

Conceptually:

record.user_id == authenticated_user_id

A malicious or modified client must not be able to bypass user isolation by changing a request parameter.

RLS is a defense layer, not a replacement for correct Application authorization.

## 12. Data Classification

LifeGame data is divided into four security classes.

### A. Identity data

Examples:

- user ID
- email
- account status
- verification state
- timestamps

### B. Authentication secrets

Examples:

- passwords
- session secrets
- refresh tokens
- recovery tokens
- MFA secrets

These require the strictest handling.

### C. Private LifeGame data

Examples:

- Finance
- Health
- Development
- goals
- notes
- statistics
- personal records

These are user-owned and must be protected by authorization and encryption.

### D. Security/system data

Examples:

- security events
- audit metadata
- key versions
- session metadata
- rate-limit state

Security data must never contain raw credentials or encryption keys.

## 13. Encryption Architecture

LifeGame uses multiple security layers.

TLS
 ↓
Authentication
 ↓
Authorization / RLS
 ↓
Database encryption at rest
 ↓
Application-level encryption
 ↓
Key separation
 ↓
Audit

Database/storage encryption at rest protects infrastructure-level storage.

Application-level encryption protects sensitive user data even when the application requires stronger isolation from database exposure.

## 14. Envelope Encryption

The planned application-level encryption model is envelope encryption.

                 Key Management
                       │
                      KEK
                       │
                encrypted DEK
                       │
             ┌─────────┴─────────┐
             │                   │
          Finance              Health
             │                   │
          ciphertext          ciphertext

DEK means Data Encryption Key and is used to encrypt data.

KEK means Key Encryption Key and is used to protect or encrypt DEKs.

Encryption keys must not be stored next to plaintext data.

Keys must never be hardcoded in source code.

Keys must never be committed to Git.

## 15. Authenticated Encryption

Application-level encryption must provide confidentiality and integrity.

The implementation should use an authenticated encryption construction such as AES-256-GCM or an approved equivalent.

Encrypted records should conceptually contain:

- ciphertext
- nonce / IV
- authentication data/tag
- keyVersion
- metadata required for decryption

The exact cryptographic implementation belongs to Infrastructure.

Domain code must not perform cryptography directly.

## 16. Email Protection

Email is both identity information and a lookup key.

If email is encrypted at application level, the architecture may use:

normalized email
       ↓
keyed lookup fingerprint
       +
encrypted email

This permits account lookup without making plaintext email the primary storage representation.

The exact mechanism must be implemented and reviewed separately before production use.

## 17. Key Management

Key hierarchy:

Key Management System
        │
       KEK
        │
   encrypted DEK
        │
 encrypted user data

Rules:

- Keys are infrastructure secrets.
- Keys are never stored in frontend source.
- Keys are never stored in Git.
- Keys are not returned to Presentation.
- Key versions must be tracked.
- Rotation must be possible.
- Old key versions must remain available only as long as required to decrypt existing data during migration.
- Destruction of keys must be treated as a potentially destructive data operation.

## 18. No Password-Derived Global Encryption Key in V1

LifeGame 3.0 V1 will not make the user's password the sole recovery mechanism for all encrypted LifeGame data.

Reason:

forgot password
      ↓
lost password-derived key
      ↓
potentially lost data

A future end-to-end encryption architecture may be introduced after a dedicated recovery/key-management design.

This decision prevents authentication recovery from becoming accidental data destruction.

## 19. Security Events

The Core Event Bus may carry neutral security events.

Examples:

identity.user.registered
identity.email.verified
identity.authentication.succeeded
identity.authentication.failed
identity.session.created
identity.session.revoked
identity.password.changed
identity.password.reset
identity.mfa.enabled
identity.security.alert

Events must not contain passwords, access tokens, refresh tokens, recovery secrets, encryption keys, or decrypted private user data unless explicitly required and reviewed.

## 20. Audit

Security events should be auditable.

Conceptual audit record:

SecurityEvent
 ├── id
 ├── eventType
 ├── userId
 ├── occurredAt
 ├── sessionId
 ├── metadata
 └── security context

IP addresses and user-agent data require separate privacy consideration and must not be collected merely because they are technically available.

Audit data must not become a secondary source of sensitive personal information.

## 21. Brute Force and Abuse Protection

Authentication endpoints must have rate limiting and abuse controls.

Protection should consider multiple dimensions, including account/identifier, source/IP, session/device signals where appropriate, and repeated failed attempts.

Rate limiting must not make account enumeration unnecessarily easy.

## 22. Account States

Initial account lifecycle:

PENDING_EMAIL_VERIFICATION
          │
          ▼
        ACTIVE
          │
      ┌───┴───┐
      ▼       ▼
  SUSPENDED  DELETED

The exact lifecycle rules belong to Identity Domain and Application.

## 23. Recovery

Password recovery:

Request recovery
      ↓
short-lived single-use mechanism
      ↓
user verification
      ↓
new password
      ↓
session security update

Recovery tokens must never be logged or persisted as plaintext outside the authentication provider's protected mechanism.

## 24. MFA and Passkeys

Identity must be extensible for:

- TOTP MFA
- WebAuthn/passkeys
- platform authenticators
- future iOS biometric authentication through platform APIs

Conceptual model:

Authenticator
 ├── Password
 ├── Passkey
 └── MFA

Password is an authenticator, not the entire Identity model.

## 25. Device Model

Devices and sessions are separate concepts.

User
 ├── Device
 │    ├── iPhone
 │    ├── Safari
 │    └── Telegram
 │
 └── Session
      ├── active
      └── revoked

This allows future security features such as active session management, device revocation, suspicious login notifications, and trusted device controls.

## 26. Trust Boundaries

### Untrusted

- browser
- JavaScript running on client
- URL parameters
- client-provided user IDs
- client-provided authorization claims
- local storage controlled by the client

### Trusted

- authentication provider
- protected backend infrastructure
- database authorization policies
- server-side application logic
- key management system
- protected secrets environment

The client is never considered a trusted security boundary.

## 27. GitHub Security

The repository is not a secret store.

Never commit:

- passwords
- API secrets
- service-role keys
- database credentials
- encryption keys
- JWT signing secrets
- recovery secrets
- production environment files containing secrets

Public frontend code must be assumed visible to an attacker.

Closed-source project visibility does not replace runtime security.

## 28. Web Architecture

GitHub Pages is a frontend deployment target.

It is not the trusted authentication backend.

GitHub Pages
     │
     │ HTTPS
     ▼
Auth / Backend Infrastructure
     │
     ├── Authentication
     ├── Authorization
     ├── Database
     └── Encryption / Key Management

No server secret may be shipped to GitHub Pages.

## 29. Multi-Platform Identity

The same Identity model must support:

             Identity
                │
      ┌─────────┼─────────┐
      │         │         │
     Web     Telegram     iOS

The client platform is not the identity.

A user has one LifeGame identity and may have multiple sessions, devices, and platform authenticators.

## 30. Domain Dependency Rule

Forbidden:

domain → Supabase
domain → PostgreSQL
domain → browser
domain → JWT
domain → encryption implementation
domain → Memory

Allowed direction:

Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure adapters

Infrastructure implements interfaces required by Application or Domain without leaking technical details into the Domain.

## 31. Memory Rule

Memory remains a runtime state mechanism.

Identity and security state must not depend on Memory as the ultimate persistence or authorization source.

The existing LifeGame rule remains:

Domain
  ↓
Core Event Bus
  ↓
Application / Infrastructure
  ↓
Memory / Persistence

Domain must never directly import Memory.

## 32. Security by Default

Every new feature must answer:

1. Who owns this data?
2. Who can read it?
3. Who can change it?
4. How is ownership enforced server-side?
5. Is it sensitive?
6. Does it require encryption?
7. Where are the encryption keys?
8. Can the data appear in logs?
9. Can the client manipulate the security decision?
10. What happens after logout, password change or account deletion?

If these questions cannot be answered, the feature is not security-complete.

## 33. Forbidden Shortcuts

The following are explicitly prohibited:

- plaintext password storage
- custom password hashing
- encryption keys in frontend code
- secrets in Git
- authorization based only on hidden UI
- authorization based only on client-provided user IDs
- Domain imports from Memory
- Domain imports from Supabase
- storing access or refresh tokens in logs
- placing credentials in URLs
- using localStorage as the sole security boundary
- custom JWT implementation without a separate architecture review
- custom cryptographic algorithms
- mixing encryption logic into Finance, Health, or Development domains

## 34. Implementation Order

### Phase 1 — Contract

- this document
- threat model
- trust boundaries
- data classification

### Phase 2 — Infrastructure

- authentication provider
- PostgreSQL
- RLS
- secret management
- environment configuration

### Phase 3 — Identity Domain

- User
- Identity
- account states
- authentication abstractions

### Phase 4 — Application

- registration
- login
- logout
- current session
- email verification
- password recovery

### Phase 5 — Presentation

- registration screen
- login screen
- verification
- recovery

### Phase 6 — User Data Security

- encryption service
- key management
- encrypted persistence
- key versioning

### Phase 7 — Security Operations

- security events
- audit
- rate limiting
- session management
- suspicious activity handling

### Phase 8 — Advanced Identity

- MFA
- Passkeys
- device management
- Telegram
- iOS

## 35. Current Architecture Decision

| Area | Decision |
|---|---|
| Architecture | DDD + Clean Architecture |
| Identity | Separate bounded context |
| Authentication | Dedicated Auth Provider |
| Initial provider | Supabase Auth |
| Database | PostgreSQL |
| Authorization | Application rules + PostgreSQL RLS |
| Passwords | Provider-managed secure hashing |
| Sessions | Provider-managed secure sessions |
| Transport | HTTPS/TLS |
| User data | Encryption at rest + application-level encryption |
| Key model | Envelope encryption |
| Key storage | Separate protected key/secret management |
| Memory | Runtime state only |
| Domain → Memory | Forbidden |
| Domain → Auth Provider | Forbidden |
| Domain → Database | Forbidden |
| Frontend | Never trusted |
| GitHub Pages | Frontend only |
| MFA | Architecture-ready |
| Passkeys | Architecture-ready |
| E2EE | Future dedicated architecture |
| Audit | Security event stream |
| Secrets in Git | Forbidden |

## 36. Definition of Done for Authentication

Registration/authentication is not considered complete when a login form works.

It is complete only when:

- credentials are protected
- email verification works
- sessions are secure
- logout works
- recovery works
- user isolation works
- RLS is verified
- sensitive data is protected
- secrets are absent from the repository
- security events are defined
- failure cases are handled
- frontend manipulation cannot bypass authorization
- architecture remains provider-independent at Domain level

## 37. Next Implementation Step

The next code step is not Finance modification.

Create the Identity infrastructure boundary first:

source/domain/identity/
source/application/identity/
source/presentation/auth/
source/infrastructure/identity/
source/infrastructure/security/

Then implement the authentication provider adapter and database/RLS foundation before building the registration and login UI.

This document is the security contract against which those changes must be reviewed.
