<!-- docs/architecture/IDENTITY_UI_BOUNDARY.md — Version 1.1 -->

# LifeGame 3.0 — Identity UI Boundary

**Статус:** CURRENT  
**Дата проверки:** 06.10.2026

## 1. Назначение

Документ фиксирует фактическую границу Identity/Auth и Profile в текущем Web-приложении.

Registration, Login и Profile являются разными понятиями:

- Registration — создание аккаунта;
- Login — вход в существующий аккаунт;
- email verification — часть Identity flow;
- Profile — раздел аутентифицированного приложения.

## 2. IMPLEMENTED

### Auth Presentation

В `source/presentation/auth/` реализованы отдельные:

- `register.js`;
- `login.js`.

Они работают через Auth Controller и не обращаются напрямую к Supabase, PostgreSQL, токенам или persistence.

### Web Auth flow

`platforms/web/web.js` реализует:

- проверку текущей сессии;
- public/authenticated mode;
- Registration modal;
- Login modal;
- переход Registration ↔ Login;
- обработку email verification;
- повторную отправку verification email;
- переход в authenticated application после успешной аутентификации;
- logout с возвратом в public mode.

### Profile

После аутентификации:

- Profile доступен как отдельный маршрут приложения;
- `renderProfile()` получает authenticated session;
- Profile использует Profile Application;
- Profile не обращается напрямую к Supabase.

Profile поддерживает текущие операции с display name и birth date.

### Public Profile route

В public mode переход к Profile не открывает приватный Profile. Web открывает Registration flow.

Это фактическое поведение текущего `platforms/web/web.js`.

## 3. Архитектурная граница

Текущая схема:

```
Web Presentation
      ↓
Auth Controller
      ↓
Identity Application
      ↓
Identity Domain
      ↑
Infrastructure Identity adapter
      ↓
Supabase Auth

Web Presentation
      ↓
Profile Presentation
      ↓
Profile Application
      ↓
Profile Infrastructure adapter
      ↓
Supabase
```

Конкретные provider/storage детали не должны проникать в Domain и Presentation.

## 4. Authentication state

Текущий Web-контур различает:

- unauthenticated/public mode;
- authenticated mode;
- внутреннее состояние проверки сессии.

После успешной аутентификации приложение может удерживать authenticated shell до завершения повторной проверки сессии, чтобы кратковременный null session не возвращал пользователя в public mode.

Это поведение реализовано в Web composition.

## 5. PLANNED

В текущем коде не следует считать реализованными без отдельного подтверждения:

- отдельную полноэкранную страницу Registration вместо текущего modal flow;
- отдельную полноэкранную страницу Login вместо текущего modal flow;
- отдельный пользовательский session-management UI;
- device management UI.

## 6. FUTURE

Следующие Identity UI возможности не являются текущей реализацией:

- Passkeys/WebAuthn UI;
- MFA UI;
- Telegram Mini App Identity UI;
- iOS Identity UI;
- расширенный security dashboard.

## 7. Ограничения

- Profile не должен напрямую обращаться к Supabase или базе данных.
- Auth Presentation не должен реализовывать хранение или криптографию.
- Client-side UI не является границей авторизации.
- Registration и Login не должны становиться бизнес-модулями Finance/Health/Development.

## 8. Статус

**CURRENT — подтверждено кодом Web, Identity Presentation/Application/Infrastructure и Profile implementation.**
