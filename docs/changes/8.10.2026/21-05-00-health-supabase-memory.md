<!-- docs/changes/8.10.2026/21-05-00-health-supabase-memory.md — Version 1.0 -->

# Health Supabase Memory

**Дата:** 08.10.2026  
**Время:** 21:05:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED / REQUIRES VERIFICATION

## Запрос

Подключить Health Memory к постоянному Supabase storage.

## Изменения

- Добавлен user-scoped table `public.health_facts`.
- Добавлен Infrastructure adapter `health.memory.supabase.js`.
- Добавлен Health adapter test.
- Включён RLS для каждой операции.
- В Composition Root runtime Health Memory заменён на Supabase adapter.
- Health Application и Index не получили зависимости от Supabase.

## Модель

Каждый факт хранится как:
- user_id
- category
- recorded_at
- source
- payload JSONB

Индекс и diagnosis не сохраняются как первичные данные.

## Security

Authorization enforced by PostgreSQL RLS:
`auth.uid() = user_id`.

## Верификация

Миграция создана в репозитории, но её применение к production Supabase требует отдельного подтверждения/проверки проекта и состояния миграций.
