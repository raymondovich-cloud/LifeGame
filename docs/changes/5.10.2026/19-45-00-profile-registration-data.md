# Профиль: отображение данных регистрации

## Дата и время
5 октября 2026, 19:45 МСК

## Изменено
- Добавлен provider-independent Profile Application.
- Добавлен Supabase Profile Adapter.
- После авторизации Profile загружает данные текущего пользователя из `public.profiles`.
- В профиле отображаются имя, дата рождения и email.
- Для вывода пользовательских данных используется `textContent`, а не `innerHTML`.
- Существующий logout сохранён.

## Архитектура
`Web → Profile Application → Profile Adapter → Supabase public.profiles`.

Profile Adapter использует обычный authenticated Supabase client. Доступ к строке профиля дополнительно ограничивается существующим RLS по `auth.uid()`.

## Проверка
В Supabase подтверждено наличие `profiles.id`, `profiles.display_name` и `profiles.birth_date`.
Security advisor не обнаружил новой проблемы в `public.profiles`; существующие предупреждения относятся к `private.security_events` и leaked password protection.

## Статус
Реализовано. Ручной browser E2E не заявляется выполненным без запуска опубликованного приложения.
