# Восстановление web runtime — 08.10.2026

Время: 20:20 (Москва)

## Изменения

- platforms/web/composition/root.js → Version 3.0
  - убраны статические импорты Finance / Health / Development;
  - модульные application dependencies загружаются лениво;
  - Authentication/Profile остаются доступными независимо от загрузки конкретного модуля;
  - Life System создаётся только при открытии Development и использует Finance + Health + Development applications.

- platforms/web/web.runtime.js → Version 5.2
  - убраны статические импорты presentation-модулей;
  - Finance / Health / Development / Profile / Auth загружаются по требованию;
  - ошибка одного presentation-модуля больше не должна обрушивать весь runtime;
  - исправлена загрузка registration/login через async presentation loader.

- platforms/web/web.js → Version 5.2
  - добавлен cache-busting для runtime.

- platforms/web/index.html → Version 1.16
  - обновлён cache-busting bootstrap.

## Цель

Вернуть полноценный Web Runtime вместо аварийного bootstrap fallback и сохранить изоляцию модулей.

## Статус

Изменения внесены. Требуется дождаться GitHub Pages deployment и прогнать application/database tests перед подтверждением восстановления.
