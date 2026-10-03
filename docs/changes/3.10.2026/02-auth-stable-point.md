# Контрольная точка: регистрация и авторизация работают

Дата и время: 04.10.2026 01:00–02:00 MSK (UTC+03:00)

## Статус

Регистрация и авторизация LifeGame успешно запущены в тестовом режиме.

Фактическая проверка в браузере пройдена:
- регистрация нового пользователя работает;
- пользователь создаётся в Supabase Auth;
- после регистрации создаётся активная сессия;
- приложение корректно переходит в авторизованное состояние;
- GitHub Pages и Supabase Redirect URL работают совместно.

## Текущая конфигурация теста

Supabase:
- Site URL: https://raymondovich-cloud.github.io/LifeGame/
- Redirect URL: https://raymondovich-cloud.github.io/LifeGame/
- Confirm email: временно отключён для тестирования регистрации без подтверждения почты.

Эта конфигурация предназначена только для текущего тестового этапа.

## Архитектурная точка возврата

При дальнейшем развитии Identity/Auth необходимо продолжать с текущей реализации, а не создавать новую систему авторизации поверх неё.

Основные файлы Identity/Auth:
- source/application/identity/identity.error.js
- source/application/identity/identity.js
- source/application/identity/registration.js
- source/application/identity/login.js
- source/infrastructure/identity/supabase.identity.mapper.js
- source/infrastructure/identity/supabase.identity.adapter.js
- source/infrastructure/supabase/supabase.client.js
- source/infrastructure/config/supabase.config.js
- source/presentation/auth/auth.controller.js
- source/presentation/auth/register.js
- source/presentation/auth/login.js
- platforms/web/composition/root.js

## Архитектурные ограничения

Не нарушать:
1. Domain не зависит от Supabase, browser API, storage, repositories или migrations.
2. Application не зависит от Supabase.
3. Supabase Auth изолирован в Infrastructure.
4. Provider-specific ошибки преобразуются Infrastructure mapper/adapter в provider-independent контракты.
5. Session tokens не передаются в Domain/Application/Presentation.
6. Не использовать fake-auth, localStorage как источник истины авторизации или ручное изменение auth.users в обход Supabase Auth.
7. Redirect URL формируется Composition Root и не хардкодится внутри Infrastructure adapter.
8. Все дальнейшие изменения должны сохранять Clean Architecture и DDD.

## Что ещё необходимо завершить в Identity/Auth

Рабочая регистрация/авторизация — зафиксированная базовая точка. При возвращении к этому блоку следующий этап:

1. Проверить восстановление сессии после перезагрузки страницы.
2. Проверить корректный logout.
3. Завершить password reset.
4. Проверить защиту приложения для unauthenticated состояния.
5. Убедиться, что состояния loading / authenticated / unauthenticated разделены.
6. После стабилизации вернуть Confirm email перед production.
7. Для production подключить Custom SMTP и настроить защиту от утечек паролей/rate abuse.

## Связанный Change

Предыдущая техническая фиксация:
docs/changes/3.10.2026/01-26-24.md

## Точка продолжения

Если разработка LifeGame будет продолжена с блока регистрации и авторизации, начинать анализ именно с этой контрольной точки и существующих файлов Identity/Auth. Не переписывать рабочую регистрацию заново без отдельного архитектурного решения.

## Итог

AUTH FOUNDATION — TEST CHECKPOINT: STABLE

Регистрация и авторизация подтверждены фактическим браузерным тестом.
