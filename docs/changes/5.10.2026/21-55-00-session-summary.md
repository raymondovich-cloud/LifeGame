# Сессия разработки — 05.10.2026 21:55 MSK

## Изменено

- Убрана module-global переменная `financeMemory` из Finance Application.
- Введён явный `createFinanceApplication({ memory })`, который создаёт user-scoped экземпляр Application.
- Finance Application больше не хранит состояние пользователя на уровне ES-модуля.
- Web Composition Root теперь создаёт Finance Application отдельно для каждого `userId`.
- При logout scoped Finance Application удаляется до сброса активного пользователя.
- Finance Presentation больше не импортирует глобальные Finance operations.
- Finance Application передаётся в Presentation явно.
- Entry Editor также получает scoped Finance Application явно.
- Snapshot-read операции Assets Analytics доступны через Finance Application, без обхода Application → Memory.
- Добавлен unit-тест user isolation для Finance Application.
- CI workflow расширен запуском Finance Application и Finance Memory тестов.

## Проверено

- В актуальных Finance Application, Web и Finance Presentation файлах отсутствуют `configureAssetsMemory`, `clearFinanceMemory`, `requireFinanceMemory` и module-global `financeMemory`.
- Web не получает Finance Memory напрямую.
- Supabase Finance Memory остаётся инфраструктурной реализацией.
- Finance Memory остаётся user-scoped через `userContext.userId`.
- GitHub Actions workflow содержит запуск новых Finance unit tests.

## Ограничение проверки

- GitHub не вернул status checks для новых direct commits, поэтому результат CI не объявляется успешным без фактического workflow run.
- Следующий обязательный этап — запустить/получить CI и затем перейти к полному Finance lifecycle: create → update → delete → logout/login → reload persistence → user A/B isolation.

## Согласовано

- Убрать global Finance Memory.
- Закрепить границу Application → Memory.
- Перевести Web на user-scoped Finance Application.
- Не менять Domain и не добавлять Domain → Memory зависимости.

## План

1. Получить зелёный CI по текущему архитектурному срезу.
2. Добавить и проверить полный Finance lifecycle test suite.
3. Проверить persistence через Supabase и RLS для пользователей A/B.
4. Провести повторный архитектурный аудит.
5. Зафиксировать следующий этап отдельным session summary.
