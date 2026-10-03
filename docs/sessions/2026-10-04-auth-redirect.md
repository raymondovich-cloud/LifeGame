# LifeGame — Session Summary
Version: 1.0

Дата и время (Москва): 04.10.2026 01:04

## Изменено

- Исправлен Supabase Auth registration redirect.
- `source/infrastructure/identity/supabase.identity.adapter.js` — Version 1.3.
- `platforms/web/composition/root.js` — Version 1.2.
- `source/infrastructure/identity/supabase.identity.adapter.test.mjs` — Version 1.2.
- Web composition root теперь передаёт текущий публичный URL приложения в Supabase Auth как `emailRedirectTo`.
- Redirect также применяется при повторной отправке confirmation email.
- Добавлен тест, проверяющий передачу `emailRedirectTo`.

## Согласовано

- На этапе разработки используем GitHub Pages как бесплатный публичный Auth redirect.
- Production-домен пока не покупаем.
- Архитектурные слои Domain/Application не изменялись.
- Supabase остаётся провайдером Identity/Auth.
- Production-домен будет заменён позже без изменения Domain/Application логики.

## Требуется в Supabase Dashboard

Site URL:
`https://raymondovich-cloud.github.io/LifeGame/`

Additional Redirect URL:
`https://raymondovich-cloud.github.io/LifeGame/`

Для локальной разработки также оставить:
`http://localhost:3000/**`

## Следующий тест

1. Сохранить URL Configuration в Supabase.
2. Создать новую тестовую регистрацию.
3. Открыть новое письмо подтверждения.
4. Проверить возврат на GitHub Pages.
5. Проверить автоматическое получение сессии и открытие Finance.
6. Проверить повторный Login после выхода.

Старую ссылку с `otp_expired` повторно не использовать.
