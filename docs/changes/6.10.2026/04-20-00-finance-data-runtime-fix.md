# Исправление пустого DATA

## Дата и время
6.10.2026

## Изменено
Исправлен runtime-регресс экрана DATA в Finance.

Причина пустого экрана: восстановленный renderer `createSubblock()` ссылался на `createAssetsSummary()` и `createFinancialStabilityIndexPanel()`, но эти функции отсутствовали в текущем `finance.js`. При рендеринге первого блока возникала ошибка JavaScript после очистки presentation root.

В `source/presentation/finance/finance.js` восстановлены обе функции из проверенного рабочего состояния до эксперимента и адаптированы к текущему hybrid DATA renderer.

Версия файла повышена до 4.8.

## Проверено
- `createAssetsSummary` — 1 определение.
- `createFinancialStabilityIndexPanel` — 1 определение.
- `createSubblock` — 1 определение.
- `renderFinanceData` — 1 определение.
- Блоки DATA 01–06 присутствуют.
- Основной Finance renderer не заменён.

Автотесты не запускались.

## Утверждено
Hybrid-архитектура сохраняется:
- основной Finance — современный Life OS экран;
- DATA — отдельный экран с шестью карточками/блоками.

## План
Проверить DATA визуально после публикации GitHub Pages. Затем отдельно проверить раскрытие каждого из шести блоков, CRUD, редактирование и swipe-delete.
