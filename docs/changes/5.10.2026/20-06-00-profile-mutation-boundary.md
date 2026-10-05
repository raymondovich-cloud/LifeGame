# Profile mutation boundary

Дата: 05.10.2026
Время: 20:06 MSK

## Изменено

- В Profile Application Port добавлена операция `updateProfile`.
- Введён отдельный use case `update-profile.js` для provider-independent валидации имени и даты рождения.
- Profile Application теперь проводит мутацию по цепочке:
  `Presentation → Profile Application → Profile Port → Supabase Profile Adapter → public.profiles`.
- Supabase Profile Adapter обновляет только `display_name` и `birth_date`.
- Результат мутации возвращается через существующий Profile mapping.
- Добавлены unit tests для Application boundary и Supabase adapter boundary.
- Email, password и session не затрагиваются и продолжают принадлежать Identity/Supabase Auth.
- Новая миграция Supabase не требуется: таблица `public.profiles` уже содержит необходимые поля и RLS-boundary.

## Архитектурное решение

`public.profiles` остаётся единственным canonical source of truth для display name и birth date.

`auth.users.raw_user_meta_data` не используется как ongoing storage и не обновляется из Profile mutation flow.

Profile Memory не вводится: для этих данных отдельное runtime-хранилище не требуется.

## Проверка

Тесты построены на `node:test` и не требуют подключения к Supabase.

Supabase JavaScript API поддерживает цепочку `.update(...).eq(...).select(...)`, что соответствует реализованному adapter boundary.

## Статус

Mutation boundary реализован. UI редактирования имени и даты рождения намеренно не добавлялся на этом этапе.
