<!-- docs/security/IDENTITY_DATABASE_SCHEMA.md — Version 1.1 -->

# LifeGame 3.0 — Identity Database Schema

**Статус:** CURRENT  
**Дата проверки:** 06.10.2026

## 1. Назначение

Документ описывает фактически реализованную Identity database foundation и отдельно разделяет:

- IMPLEMENTED;
- PLANNED;
- FUTURE.

Он не утверждает реализацию, которой нет в миграциях.

## 2. IMPLEMENTED — Authentication source

Supabase Auth является текущим источником истины для authentication identity.

LifeGame не создаёт собственную таблицу паролей.

Authentication state остаётся в Supabase Auth.

Канонический пользовательский UUID:

`auth.users.id`.

## 3. IMPLEMENTED — LifeGame profile

Фактическая таблица:

`public.profiles`

Текущие поля, сформированные миграциями:

- `id uuid primary key`;
- `display_name text`;
- `birth_date date`;
- `created_at timestamptz`;
- `updated_at timestamptz`.

`profiles.id` связан с `auth.users.id` через foreign key с `ON DELETE CASCADE`.

Регистрация создаёт профиль автоматически через database trigger.

Registration profile data поступает из Auth signup metadata и сохраняется в `public.profiles`.

## 4. IMPLEMENTED — RLS и grants

Для `public.profiles` реализованы:

- RLS;
- explicit grants для authenticated;
- запрет доступа anon;
- SELECT policy для собственной строки;
- INSERT policy для собственной строки;
- UPDATE policy с проверкой ownership;
- DELETE policy для собственной строки.

Ownership определяется через `auth.uid()`.

Изменить `id` на идентификатор другого пользователя через UPDATE политика не позволяет.

## 5. IMPLEMENTED — Security events

Фактическая таблица:

`private.security_events`

Она содержит:

- `id`;
- `user_id`;
- `event_type`;
- `occurred_at`;
- `session_id`;
- `metadata`;
- `created_at`.

Для неё:

- API-роли не получают grants;
- RLS включён;
- политики для клиентских ролей не созданы;
- события регистрации создаются database trigger.

Текущая миграционная реализация не делает `security_events` источником клиентской авторизации.

## 6. IMPLEMENTED — Identity migrations

Фактическая последовательность Identity migrations:

1. `0001_identity_foundation.sql`;
2. `0002_identity_profile_bootstrap.sql`;
3. `0003_identity_profile_fields.sql`;
4. `0004_identity_profile_birth_date_validation.sql`.

Эти миграции формируют текущую Identity database foundation.

## 7. IMPLEMENTED — Finance user-scoped storage

В репозитории также существуют миграции пользовательского Finance storage и snapshots.

Они относятся к persistence Finance и не должны смешиваться с Identity schema.

User-scoped Finance storage использует user ownership/RLS в соответствии с текущими миграциями.

## 8. PLANNED

Без дополнительного подтверждения не считать реализованными:

- отдельную application sessions table;
- devices table;
- custom authenticator table;
- user encryption key metadata table;
- account recovery metadata table;
- subscriptions/organizations/sharing schema;
- application-level encrypted user-data persistence как полностью реализованный контур.

## 9. FUTURE

Возможные будущие расширения:

- device/session management projection;
- Passkeys/WebAuthn;
- MFA;
- расширенная security/audit projection;
- key lifecycle metadata;
- Telegram/iOS Identity persistence.

Эти направления не являются текущей database implementation.

## 10. Database boundaries

Текущая архитектурная граница:

```
Supabase Auth
    └── auth.users

LifeGame
    ├── public.profiles
    └── private.security_events

Finance persistence
    └── user-scoped Finance tables
```

Supabase Auth остаётся источником authentication identity.

Identity database не создаёт второй пользовательский UUID.

## 11. Технические правила

- Не хранить пароли LifeGame в `public` таблицах.
- Не дублировать authentication tokens в application tables.
- Не использовать client-provided user ID как самостоятельную authorization boundary.
- User-owned exposed tables должны иметь соответствующую RLS/ownership protection.
- Service role не должен попадать во frontend.

Эти правила являются архитектурными требованиями; их конкретная реализация должна подтверждаться актуальными миграциями и тестами.

## 12. Статус

**CURRENT — фактическая Identity database foundation подтверждена миграциями репозитория.**
