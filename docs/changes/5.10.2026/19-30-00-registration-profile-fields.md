# Регистрация: профиль пользователя

## Дата и время
5 октября 2026, 19:30 МСК

## Изменения
- Убрана кнопка `Back` из окна Create account.
- Добавлены обязательные поля «Как к вам обращаться?» и «Дата рождения».
- Registration Domain Policy валидирует новые поля.
- Supabase adapter передаёт их через signup metadata.
- Данные сохраняются в существующую user-scoped таблицу `public.profiles`.
- Добавлено поле `birth_date date`.
- Существующий trigger профиля расширен для bootstrap имени и даты рождения.
- RLS `profiles` сохранён.

## Тестирование
- Расширены database tests bootstrap-полей профиля.
- Сгенерированные Supabase types подтверждают `profiles.birth_date`.
- Security advisor не показывает новую проблему для `profiles`.

## Архитектурное решение
Отдельная физическая таблица на каждого пользователя не создаётся. Один пользователь = одна строка в `public.profiles`, связанная через `profiles.id = auth.users.id`.

Имя и дата рождения относятся к Profile/Identity и не попадают в Finance Memory.
