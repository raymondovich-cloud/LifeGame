# Сессия 12.10.2026 — исправление SQL database tests

- Дата: 12.10.2026, 18:00 MSK (UTC+03:00)
- Ветка: `feature/pwa-static-cache`
- Основание: CI PR #24 выявил SQL syntax error в identity test; соседние тесты создавали auth.users без обязательного `gender`.
- Исправления: исправлены dollar-quote delimiters в identity test; в training sessions/programs tests добавлены валидные gender metadata.
- Границы: production-код, миграции и `main` не менялись; PR не объединён.
- Следующий шаг: дождаться CI на обновлённой ветке и проверить полный результат database suite.
