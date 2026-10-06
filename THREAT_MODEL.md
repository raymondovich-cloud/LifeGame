# LifeGame 3.0 — Threat Model

Version: 1.1
Status: APPROVED
Date: 2026-10-01

## 1. Purpose

This document defines the primary security threats for LifeGame 3.0 and maps each threat to required controls.

It is a security threat contract derived from SECURITY_ARCHITECTURE.md. It defines required controls and does not imply that every control is currently implemented.

The objective is not to eliminate every theoretical risk. The objective is to identify realistic attack paths, establish explicit security boundaries, and ensure that every important threat has a defined mitigation or an explicitly accepted residual risk.

---

## 2. Security Objectives

LifeGame must protect:

1. Account identity.
2. Authentication credentials.
3. Active sessions.
4. User-owned LifeGame data.
5. Encryption keys.
6. Authorization boundaries.
7. Security and audit information.
8. Availability of user data where reasonably practical.
9. Integrity of user data.
10. Confidentiality of user data.

Primary security properties:

- Confidentiality
- Integrity
- Authentication
- Authorization
- Availability
- Accountability

---

## 3. Assets

### Critical assets

- Password authentication material.
- Session credentials.
- Refresh tokens.
- Recovery mechanisms.
- Encryption keys.
- User Finance data.
- User Health data.
- User Development data.
- Personal notes and records.
- Account ownership information.

### Important assets

- Email address.
- User profile metadata.
- Device/session metadata.
- Security events.
- Audit records.
- Application configuration.

---

## 4. Trust Boundaries

### Boundary A — Client

Includes:

- Web browser.
- JavaScript.
- Telegram Mini App.
- iOS application.

The client is untrusted.

Anything controlled by the client can be modified by an attacker.

Therefore:

- UI restrictions are not authorization.
- Hidden fields are not security.
- Client-side user IDs are not trusted.
- Client-side role information is not trusted.
- Client-side validation is not the final security control.

### Boundary B — Authentication

Dedicated authentication infrastructure is trusted to perform credential verification and session management according to its security model.

### Boundary C — Application Backend

Trusted server-side application logic performs authorization and business orchestration.

### Boundary D — Database

PostgreSQL is protected by authentication, authorization and RLS.

### Boundary E — Key Management

Encryption keys exist in a separate protected secret/key management boundary.

A database compromise must not automatically expose application encryption keys.

### Boundary F — Repository

GitHub is a source-code repository, not a secret store.

---

## 5. Threat: Account Takeover

### Attack

An attacker obtains a user's password or otherwise compromises authentication.

### Possible causes

- Credential stuffing.
- Password reuse.
- Phishing.
- Brute force.
- Password database compromise.
- Malware on the user's device.
- Compromised recovery mechanism.

### Impact

Critical.

An attacker could access the user's LifeGame data.

### Controls

- Dedicated authentication provider.
- Secure password hashing.
- TLS.
- Rate limiting.
- Email verification.
- Session security.
- Password recovery security.
- MFA readiness.
- Passkey readiness.
- Session revocation.
- Security event logging.

### V1

Required:

- secure password authentication;
- rate limiting;
- secure sessions;
- recovery;
- session invalidation after critical security changes.

Future:

- MFA;
- Passkeys;
- suspicious-login detection.

---

## 6. Threat: Credential Stuffing

### Attack

Previously leaked credentials from another service are tested against LifeGame.

### Impact

High.

### Controls

- Do not rely on password complexity alone.
- Rate limiting.
- Authentication-provider abuse protection.
- Failed-login monitoring.
- MFA support.
- Passkey support.

### Design rule

LifeGame must never expose whether an email account exists through detailed login errors.

Use generic authentication failure responses.

---

## 7. Threat: Brute Force

### Attack

An attacker repeatedly guesses passwords.

### Impact

High if unrestricted.

### Controls

Rate limiting at multiple dimensions where supported:

- identifier/account;
- IP/source;
- repeated failures;
- device/session signals.

Do not implement an overly aggressive lockout that creates an account-denial attack.

---

## 8. Threat: Account Enumeration

### Attack

An attacker determines which email addresses have LifeGame accounts.

### Examples

- Registration response reveals existing account.
- Login response differs for unknown email vs wrong password.
- Password recovery reveals account existence.

### Impact

Medium.

It can enable targeted phishing and credential attacks.

### Controls

Use generic responses where practical.

Example conceptual response:

"Unable to authenticate."

rather than:

"Email does not exist."

Recovery requests should not reveal whether an account exists.

---

## 9. Threat: Session Hijacking

### Attack

An attacker obtains a valid session or refresh token.

### Possible causes

- XSS.
- Malware.
- Unsafe token storage.
- Logging.
- URL leakage.
- Compromised device.
- Network interception without TLS.

### Impact

Critical.

### Controls

- HTTPS/TLS.
- Provider-managed session mechanisms.
- Short-lived access tokens where supported.
- Refresh-token protection and rotation where supported.
- No tokens in URLs.
- No tokens in logs.
- Secure browser storage strategy.
- Session revocation.
- Session/device management in future versions.

### Prohibited

Do not invent a custom session/token system without a dedicated security review.

---

## 10. Threat: XSS

### Attack

An attacker causes JavaScript to execute in the LifeGame origin.

### Impact

Critical because authenticated browser state may become accessible to malicious code.

### Controls

- Avoid unsafe HTML injection.
- Prefer DOM APIs and textContent.
- Sanitize any unavoidable HTML.
- Content Security Policy where supported.
- Secure dependency management.
- No secrets in frontend source.
- No sensitive data embedded in HTML unnecessarily.

### Design rule

Any user-generated text must be treated as untrusted input.

---

## 11. Threat: CSRF

### Attack

A malicious site causes an authenticated browser to perform an unintended state-changing action.

### Impact

High depending on authentication/session mechanism.

### Controls

- Follow the authentication provider's recommended browser session model.
- SameSite cookie protections where cookies are used.
- CSRF protection for state-changing endpoints where required.
- Origin/Referer validation where appropriate.
- Do not rely on frontend UI restrictions.

### Note

The exact CSRF control depends on the final backend/session architecture and must be verified before production.

---

## 12. Threat: Broken Authorization / IDOR

### Attack

A user changes an identifier in a request:

user A request:
data/user-A

attacker changes it to:
data/user-B

### Impact

Critical.

### Controls

- Application authorization.
- PostgreSQL RLS.
- Every user-owned record has an ownership boundary.
- Server derives authenticated user identity from the trusted session context.
- Never trust client-provided userId for authorization.

### Required security test

Every user-owned resource must have a negative test proving another user cannot access it.

---

## 13. Threat: Database Leak

### Attack

An attacker obtains a database dump or unauthorized database access.

### Impact

Critical.

### Controls

- Database access controls.
- RLS.
- Database encryption at rest.
- Application-level encryption for sensitive data.
- Key separation.
- Least-privilege database access.
- No service-role credentials in frontend.

### Desired result

A database leak must not automatically produce readable private LifeGame data.

---

## 14. Threat: Encryption Key Compromise

### Attack

An attacker obtains an application encryption key.

### Impact

Critical.

### Controls

- Separate key management.
- Keys outside Git.
- Keys outside frontend.
- Key versioning.
- Least privilege.
- Key rotation.
- Envelope encryption.
- Separate key/data storage.

### Residual risk

A fully compromised trusted backend environment may still expose plaintext while data is actively being decrypted.

This is why future E2EE is a separate architectural phase.

---

## 15. Threat: Secret Leakage in Git

### Attack

A developer accidentally commits:

- service key;
- database password;
- encryption key;
- JWT secret;
- API secret.

### Impact

Critical.

### Controls

- No secrets in source.
- Environment/secret management.
- Secret scanning.
- Pre-commit checks where appropriate.
- CI secret scanning.
- Immediate rotation after any confirmed exposure.

### Rule

Once a secret is committed, assume it is compromised even if the commit is later deleted.

---

## 16. Threat: Frontend Tampering

### Attack

A user modifies JavaScript in the browser.

Example:

- removes UI restrictions;
- changes userId;
- changes amounts;
- calls API manually;
- changes hidden flags.

### Impact

Potentially critical.

### Controls

All security decisions are server-side.

Frontend is presentation only.

The backend must independently validate:

- identity;
- authorization;
- input;
- ownership;
- allowed state transitions.

---

## 17. Threat: Input Manipulation

### Attack

A malicious client submits invalid or hostile data.

Examples:

- negative financial amounts;
- extremely large numbers;
- malformed IDs;
- oversized strings;
- unexpected JSON;
- malicious text.

### Impact

Medium to high depending on the endpoint.

### Controls

- Domain validation.
- Application validation.
- Infrastructure/schema validation.
- Maximum input sizes.
- Strict data types.
- Database constraints.

Client-side validation is only a UX optimization.

---

## 18. Threat: Data Tampering

### Attack

An attacker modifies stored user data.

### Impact

Critical for financial and personal records.

### Controls

- Authorization.
- RLS.
- Database constraints.
- Authenticated encryption.
- Audit events.
- Versioning where needed.
- Transactional updates.

Encryption must provide integrity, not only confidentiality.

---

## 19. Threat: Replay of Security Tokens

### Attack

A captured token is reused.

### Impact

High to critical.

### Controls

- Short-lived access tokens where supported.
- Refresh-token rotation where supported.
- Session revocation.
- TLS.
- No token logging.
- Secure token handling.

Critical operations may require fresh authentication or additional verification.

---

## 20. Threat: Password Reset Abuse

### Attack

An attacker abuses password recovery to take over an account.

### Controls

- Short-lived recovery tokens.
- Single-use recovery mechanism.
- Secure reset endpoint.
- No account enumeration.
- Session invalidation/rotation after reset.
- Email verification through trusted infrastructure.

Recovery is part of the authentication boundary and must receive the same security priority as login.

---

## 21. Threat: Email Account Compromise

### Attack

An attacker controls the user's email account.

### Impact

High.

Password reset and verification can potentially be compromised.

### Controls

- MFA/passkeys in future.
- Security notifications.
- Session management.
- Recovery design that does not silently weaken authentication.

### Residual risk

LifeGame cannot fully protect an email account that the user has already lost control of.

---

## 22. Threat: Insider / Privileged Access

### Attack

A person with legitimate infrastructure access abuses that access.

### Impact

Critical.

### Controls

- Least privilege.
- Separate production credentials.
- Key separation.
- Audit.
- Minimal access to plaintext.
- No unnecessary administrative access.
- Secret rotation.
- Operational logging.

Application-level encryption reduces the usefulness of raw database access.

---

## 23. Threat: Malicious Dependency

### Attack

A compromised npm/package dependency introduces malicious code.

### Impact

High to critical.

### Controls

- Minimize dependencies.
- Pin/lock versions.
- Review dependency changes.
- Automated vulnerability scanning.
- Remove unused dependencies.
- Prefer standard platform APIs for simple security-sensitive operations.
- Review transitive dependencies for critical infrastructure.

---

## 24. Threat: Supply-Chain / CI Compromise

### Attack

An attacker compromises GitHub Actions or a build/deployment dependency.

### Impact

Critical.

### Controls

- Least-privilege GitHub Actions permissions.
- Protected branches.
- Review workflow changes.
- Never expose long-lived secrets unnecessarily.
- Prefer short-lived credentials.
- Separate deployment credentials from application secrets.
- Audit workflow changes.

---

## 25. Threat: Database Destruction

### Attack

Data is deleted or corrupted.

### Impact

Critical.

### Controls

- Backups.
- Point-in-time recovery where available.
- Restricted destructive permissions.
- Migration review.
- Audit.
- Recovery testing.

Availability and recoverability are security properties.

---

## 26. Threat: Accidental Data Loss

### Attack / Failure

A software bug or migration accidentally removes user data.

### Controls

- Database backups.
- Migration discipline.
- Transactional operations.
- Versioned schemas.
- Audit.
- Staged deployment.
- Restore testing.

No destructive migration should be treated as routine.

---

## 27. Threat: Logging Sensitive Data

### Attack / Failure

Credentials or private data accidentally enter logs.

### Impact

High.

### Prohibited log content

- passwords;
- access tokens;
- refresh tokens;
- recovery tokens;
- encryption keys;
- full payment secrets;
- unnecessary private user data.

### Control

Define a structured security logging policy before production.

---

## 28. Threat: Metadata Leakage

Even encrypted content may reveal metadata.

Examples:

- record creation time;
- frequency of activity;
- approximate data volume;
- account existence;
- session activity.

### Control

Collect only metadata required for functionality, security, or legal obligations.

Do not collect data merely because it is technically available.

---

## 29. Threat: Local Device Compromise

### Attack

An attacker controls the user's phone/computer.

### Impact

Potentially critical.

### Controls

- Platform secure storage where available.
- Passkeys/platform authenticators in future.
- Session revocation.
- Device/session management.
- Minimize sensitive local persistence.

### Residual risk

A fully compromised device can observe information after legitimate decryption/display.

Server-side encryption cannot solve a compromised endpoint.

---

## 30. Threat: Telegram Mini App Abuse

Future Telegram integration must not treat Telegram client-provided identity information as sufficient authorization by itself.

### Controls

- Verify Telegram authentication data server-side according to Telegram's official protocol.
- Map verified Telegram identity to LifeGame Identity.
- Never trust a client-provided user ID.
- Apply the same authorization and RLS rules as Web.

This threat is deferred until Telegram integration but is part of the Identity architecture.

---

## 31. Threat: iOS Client Compromise

Future iOS implementation must use platform security mechanisms for local secrets and authentication.

### Controls

- Keychain.
- Secure Enclave where appropriate.
- Passkeys.
- Biometric platform authentication.
- Short-lived sessions.
- Server-side authorization.

iOS UI state is not a security boundary.

---

## 32. Threat: Account Deletion Abuse

An attacker or compromised session may attempt destructive account actions.

### Controls

- Re-authentication for destructive operations where appropriate.
- Explicit confirmation.
- Authorization.
- Audit.
- Delayed deletion/recovery policy where appropriate.
- Backup policy must be defined.

Deletion semantics must be designed before implementing account deletion.

---

## 33. Threat: Denial of Service

### Attack

An attacker overwhelms authentication or application infrastructure.

### Controls

- Provider-level abuse protection.
- Rate limiting.
- Request size limits.
- Resource limits.
- Infrastructure monitoring.
- Graceful degradation where practical.

Full DDoS protection depends on deployment infrastructure and is not solely an application-code concern.

---

## 34. Threat Matrix

`V1` means that the control is required by the V1 security target. It does not mean the control is currently implemented.

| Threat | Severity | Primary Controls | V1 |
|---|---|---|---|
| Account takeover | Critical | Auth, sessions, recovery, rate limits | Yes |
| Credential stuffing | High | Rate limits, MFA-ready auth | Yes |
| Brute force | High | Rate limits | Yes |
| Account enumeration | Medium | Generic responses | Yes |
| Session hijacking | Critical | TLS, secure sessions, token controls | Yes |
| XSS | Critical | Safe DOM, CSP, dependency control | Yes |
| CSRF | High | Session/provider controls | Yes |
| Broken authorization / IDOR | Critical | Application auth + RLS | Yes |
| Database leak | Critical | Encryption + RLS + key separation | Yes |
| Key compromise | Critical | KMS, envelope encryption | Yes |
| Git secret leak | Critical | Secret management + scanning | Yes |
| Frontend tampering | Critical | Server-side validation | Yes |
| Input manipulation | High | Domain/Application validation | Yes |
| Data tampering | Critical | Authenticated encryption + auth | Yes |
| Token replay | High | Rotation/revocation | Yes |
| Recovery abuse | Critical | Secure recovery flow | Yes |
| Email compromise | High | MFA/passkeys later | Partial |
| Insider access | Critical | Least privilege + encryption | Yes |
| Dependency compromise | High | Locking/scanning/review | Yes |
| CI compromise | Critical | Least privilege + protected workflows | Yes |
| Database destruction | Critical | Backups/PITR | Yes |
| Logging secrets | High | Structured logging policy | Yes |
| Metadata leakage | Medium | Data minimization | Yes |
| Device compromise | Critical | Platform secure storage/session control | Partial |
| Telegram abuse | High | Server-side verification | Future |
| iOS compromise | High | Keychain/Passkeys | Future |
| Account deletion abuse | High | Re-auth + authorization | Future |
| DoS | High | Rate/resource limits | Partial |

---

## 35. Security Testing Requirements

The following are acceptance requirements. A listed test is not evidence that the corresponding feature is already implemented until the test has actually passed.

Before production authentication is considered complete, test at minimum:

### Authentication

- correct password succeeds;
- incorrect password fails;
- unknown account response is not distinguishable;
- repeated failures are rate limited;
- verification flow works;
- recovery flow works;
- logout invalidates the expected session.

### Authorization

- User A cannot read User B data;
- User A cannot modify User B data;
- User A cannot delete User B data;
- changing client-provided userId does not bypass authorization;
- RLS denies cross-user access.

### Security

- no password appears in logs;
- no token appears in logs;
- no encryption key appears in frontend;
- no service-role key appears in frontend;
- no secrets exist in repository;
- XSS payloads are rendered as text;
- invalid input is rejected server-side.

### Encryption

- ciphertext cannot be interpreted without keys;
- authentication/tag failures are rejected;
- key versions are handled correctly;
- key rotation can be performed without losing data.

---

## 36. Residual Risks

The following risks cannot be eliminated completely by application architecture:

1. User's device is fully compromised.
2. User's email account is fully compromised.
3. Trusted backend environment is fully compromised.
4. A legitimate authenticated user intentionally exposes their own data.
5. Availability failure at a third-party infrastructure provider.
6. Future client platform vulnerabilities.

These risks must be reduced where practical and explicitly documented rather than hidden.

---

## 37. V1 Security Priorities

These are security priorities/requirements, not a CURRENT implementation inventory.

The first production Identity implementation must prioritize:

1. Secure authentication.
2. Secure session handling.
3. Server-side authorization.
4. PostgreSQL RLS.
5. Secure password recovery.
6. Rate limiting.
7. Secret management.
8. User-data encryption architecture.
9. Security event model.
10. Backup and recovery strategy.
11. Security testing.

MFA, Passkeys, advanced device management, Telegram verification, iOS secure hardware integration, and full E2EE are subsequent stages.

---

## 38. Final Security Rule

No feature is considered secure because the UI prevents a user from doing something.

LifeGame considers a feature secure only when an attacker controlling the client cannot bypass the corresponding server-side security boundary.

The security boundary must exist independently of the interface.

---

## 39. Current Implementation Boundary

The currently confirmed security implementation includes:

- Supabase Auth as the authentication provider;
- server-side identity handling through the Infrastructure adapter;
- PostgreSQL RLS for user-owned data;
- private security events with restricted client access;
- registration security event creation;
- client-side separation from Supabase and database infrastructure.

Controls that remain PLANNED or require verification include:

- application-level encryption;
- envelope encryption and key management;
- custom session/device management;
- complete password recovery controls;
- expanded security event coverage;
- LifeGame-owned multi-dimensional rate limiting;
- MFA and Passkeys;
- advanced suspicious-activity detection;
- complete backup/recovery security operations.

Current implementation status must be verified against code, tests and `docs/project-state.md`.

## 40. Relationship to SECURITY_ARCHITECTURE.md

SECURITY_ARCHITECTURE.md defines the approved security architecture.

THREAT_MODEL.md defines the threats and required controls that architecture must address.

Future security-sensitive implementation changes must be reviewed against both documents.
