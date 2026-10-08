# Восстановление web runtime — 08.10.2026

Время начала: 20:20 (Москва)
Статус: завершено и проверено.

## Исправления

- platforms/web/composition/root.js → Version 3.0
  - Finance / Health / Development application dependencies переведены на lazy loading;
  - Authentication и Profile больше не зависят от статической загрузки необязательных модулей;
  - Life System создаётся из трёх независимых application-контуров при открытии Development.

- platforms/web/web.runtime.js → Version 5.3
  - presentation-модули загружаются по требованию;
  - Auth Login / Registration загружаются независимо;
  - неавторизованный Profile открывает Login;
  - ошибка отдельного presentation-модуля не должна обрушивать весь runtime.

- platforms/web/web.js → Version 5.3
  - добавлен cache-busting для актуального runtime.

- platforms/web/index.html → Version 1.17
  - обновлён cache-busting bootstrap.

- source/memory/finance/finance.memory.js → Version 3.1
  - исправлен выбор последнего Finance snapshot при одинаковом timestamp.

- source/infrastructure/supabase/finance.memory.supabase.js → Version 3.1
  - применено то же исправление для persisted Finance snapshots.

- source/infrastructure/supabase/finance.memory.supabase.integration.test.mjs → Version 1.6
  - исправлены тестовые ссылки на recreated memory;
  - creator metadata нормализуется только для проверки бизнес-данных.

- .github/workflows/database-tests.yml → Version 1.1
  - добавлена проверка синтаксиса Web bootstrap;
  - добавлен interaction.engine.test.mjs в CI.

- Supabase production:
  - создана и проверена public.development_facts;
  - включён RLS;
  - присутствуют SELECT / INSERT / UPDATE / DELETE политики только для владельца;
  - миграция выровнена с production-версией 20261008170208.

- supabase/migrations/20261008193000_development_user_scoped_storage.sql удалена как дублирующая;
- supabase/migrations/20261008170208_development_user_scoped_storage.sql добавлена как canonical migration для production.

## Проверка

- Web bootstrap syntax: PASS.
- Application / Finance / Identity / Profile tests: PASS.
- Finance Supabase persistence + user isolation: PASS.
- Supabase database tests: PASS.
- Life System interaction engine tests: PASS.
- GitHub Pages Web Deploy для итогового commit: PASS.

## Итог

Fallback больше не является рабочим маршрутом приложения: он сохранён только как аварийный контур.
Полноценный Web Runtime восстановлен, Development подключён к user-scoped storage, а Interaction Engine включён в CI-проверку.
