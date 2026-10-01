# LifeGame 3.0 — Identity UI Boundary

## Status

Approved architectural decision.

## Core rule

Registration, authentication, and user Profile are separate concepts.

- Registration is an unauthenticated entry flow.
- Login is an unauthenticated entry flow.
- Email verification is part of the identity flow.
- Profile is an authenticated application section.
- Profile is not the registration screen.
- Profile is not the login screen.
- Identity/Auth is not a Finance/Health navigation module.

## User flow

Unauthenticated:

Welcome → Create account / Login → Email verification when required → Authenticated application

Authenticated:

Finance / Health / Development / Profile

Logout:

Authenticated application → Logout → Unauthenticated Auth UI

## Authentication state boundary

The application must distinguish at minimum:

- UNAUTHENTICATED
- AUTHENTICATED

Future states may include:

- AUTHENTICATION_PENDING
- EMAIL_VERIFICATION_REQUIRED
- ACCOUNT_SUSPENDED

The authenticated state is authoritative for access to the main application. The browser UI must not be treated as the security boundary.

## Presentation structure

```text
source/presentation/
├── auth/
│   ├── register.js
│   ├── login.js
│   └── ...
└── profile/
    └── profile.js
```

Auth presentation is responsible for entry and identity interactions.

Profile presentation is responsible for the authenticated user's account area.

## Navigation rule

Profile must only appear as a normal application navigation destination after authentication.

Registration must never be rendered through `moduleId === "profile"`.

The current registration-under-Profile implementation is considered temporary smoke-test wiring and must be removed before the final authentication UI is implemented.

## Architecture rule

Identity remains a separate bounded context.

```text
Presentation Auth
      ↓
Application Identity
      ↓
Domain Identity

Infrastructure Identity
      ↓
provider implementation
```

Profile may consume authenticated user information through Application contracts, but Profile must not access Supabase, database tables, tokens, or cryptographic implementations directly.

## Security rule

Authentication state controls presentation flow, but authorization and data isolation remain server-side responsibilities.

No client-side route or UI condition may be treated as sufficient protection for private data.

## Next implementation order

1. Define provider-independent authentication/session result contracts.
2. Define authentication state model.
3. Define Auth/Application routing boundary.
4. Remove registration from Profile navigation.
5. Create standalone Registration screen/window.
6. Create standalone Login screen/window.
7. Integrate session restoration.
8. Expose Profile only after authentication.
9. Add logout transition back to Auth UI.
10. Add authenticated Profile data flow.

## Explicitly deferred

Do not implement Login by returning raw Supabase responses through Application or Presentation.

Before Login UI, normalize provider-specific authentication results and errors at the Infrastructure boundary.

Do not introduce custom JWT/session infrastructure.

Do not move private identity data into browser-local storage as a substitute for server-side authorization.
