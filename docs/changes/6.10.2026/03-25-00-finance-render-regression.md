# Исправление: регрессия отображения Finance

Дата: 6.10.2026

## Причина

После разделения Finance и DATA была изменена сигнатура `renderFinance()`, но `platforms/web/web.js` продолжал вызывать её по старой сигнатуре. В результате Application не передавался как `financeApplication`.

## Исправлено

- `platforms/web/web.js` → Version 4.4.
- Вызов `renderFinance()` приведен к новой сигнатуре.
- Отдельный DATA-экран сохранен.
- Верхний экран Finance и существующий CRUD не менялись.

## Проверка

Тесты не запускались.
Проверить Finance на GitHub Pages после обновления Pages.