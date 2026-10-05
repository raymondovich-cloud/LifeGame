# Profile lifecycle

Дата: 05.10.2026
Время: 21:03 MSK

## Изменено

- Profile lifecycle доведён до проверяемого end-to-end boundary на уровне Application и Infrastructure tests.
- Добавлены lifecycle-тесты: чтение профиля, изменение профиля, повторное чтение сохранённых данных и проверка user-scoped поведения.
- Зафиксирована цепочка: `Presentation → Profile Application → Profile Port → Supabase Profile Adapter → public.profiles`.
- `public.profiles` остаётся canonical source of truth для `display_name` и `birth_date`.
- Profile mutation не затрагивает email, password или session: эти данные остаются в Identity/Supabase Auth.
- Profile Memory не вводится.
- CI workflow расширен запуском Profile Application и Profile Infrastructure tests вместе с Identity tests.
- Для bootstrap даты рождения добавлена валидация значения из Auth metadata перед записью в `public.profiles`.
- Исправлена runtime-безопасность lifecycle trace для запуска тестов в Node.js.
- Восстановлена отсутствовавшая в репозитории Finance storage migration, необходимая для полного локального запуска Supabase database tests.
- Исправлены pgTAP dollar-quoted expected-query блоки в `001_identity_foundation_test.sql` без изменения состава тестов.

## Проверка

GitHub Actions workflow:

- Workflow: `LifeGame Database Tests`
- Run: #595
- Commit: `62b8db91bed0903f24c2f0c4a847a14577fecbef`
- Общий результат: **SUCCESS**

Проверены все этапы:

1. Identity и Profile Application tests — успешно.
2. Identity и Profile Infrastructure tests — успешно.
3. Локальный Supabase — успешно запущен.
4. Database / pgTAP tests — успешно выполнены.

Таким образом, Profile lifecycle и связанные database boundaries проходят полный CI pipeline.

## Архитектурное решение

Profile остаётся самостоятельным bounded context.

Canonical ownership:

- display name → Profile → `public.profiles.display_name`;
- birth date → Profile → `public.profiles.birth_date`;
- email → Identity → Supabase Auth;
- password → Identity → Supabase Auth;
- session → Identity → Supabase Auth.

Domain/Profile не получает прямого доступа к Supabase, Memory или техническим persistence-механизмам.

## Статус

**Profile Lifecycle зафиксирован и принят как рабочая архитектурная граница.**

Следующие изменения Profile должны сохранять:

- один canonical source of truth на каждый тип пользовательских данных;
- один Application mutation boundary;
- отсутствие прямой связи Presentation → Supabase;
- обязательные Application/Infrastructure tests;
- прохождение полного CI pipeline перед фиксацией этапа.
