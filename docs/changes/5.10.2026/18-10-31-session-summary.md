# Итог сессии

**Дата/время (Москва):** 05.10.2026 18:10

## Изменено

- Реализована атомарная операция Assets через PostgreSQL RPC finance_mutate_asset.
- Создание/изменение/удаление актива и исторический snapshot теперь являются одной транзакцией.
- Application переведён на Finance Memory.mutateAsset; отдельный snapshot после CRUD больше не вызывается.
- Finance Memory Port обновлён до Version 2.1.
- Runtime Finance Memory обновлён до Version 2.1.
- Supabase Finance Memory Adapter обновлён до Version 2.1.
- Добавлен unit-тест полного create → update → delete lifecycle с проверкой snapshots.
- Добавлены две SQL migration: 20261005150724_add_atomic_finance_asset_mutations и 20261005151100_optimize_finance_rls_auth_uid.
- Все Finance RLS-политики переведены на оптимизированный вызов (select auth.uid()).

## Проверка

- RPC: SECURITY INVOKER — PASS.
- RPC EXECUTE: authenticated — PASS; anon — DENY.
- User isolation через auth.uid() сохранён.
- Успешный transactional smoke-test — PASS; после rollback тестовых данных нет.
- Rollback smoke-test при ошибке snapshot — PASS; актив не сохраняется без snapshot.
- Performance Advisor: Finance RLS warnings устранены.
- Security Advisor: новых Finance security findings нет.
- Node unit-тесты и реальный browser authenticated E2E в текущем окружении не запускались.

## Зафиксировано

Production persistence для Assets теперь имеет атомарную границу:

Domain → Application → Finance Memory Port → Supabase Adapter → PostgreSQL transaction

## Запланировано

Реальный authenticated E2E через GitHub Pages:
1. создание актива;
2. reload и восстановление;
3. Liquid → Illiquid;
4. Illiquid → Liquid;
5. удаление;
6. проверка FSI;
7. проверка истории;
8. проверка отсутствия logout/session regression.
