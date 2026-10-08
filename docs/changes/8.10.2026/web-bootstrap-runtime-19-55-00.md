# LifeGame — критическое исправление Web Bootstrap

Дата: 08.10.2026
Время: 19:55 MSK

## Симптом

Production открывался со статическим header и нижней навигацией, но центральный `module-content` оставался пустым.

## Установленная причина

Предыдущие исправления защищали hydration и Composition Root, но сам `platforms/web/web.js` всё ещё содержал множество статических ES module imports.

Следовательно, ошибка в любой транзитивной зависимости presentation/application/infrastructure могла остановить выполнение entrypoint ещё до `startWeb()`. В этом сценарии браузер показывал ровно статический HTML shell.

## Исправление

Введено разделение на два уровня:

- `platforms/web/web.js` — минимальный failure-safe bootstrap;
- `platforms/web/web.runtime.js` — полноценный application runtime.

Bootstrap:

1. не импортирует Application, Presentation или Infrastructure;
2. сразу отрисовывает безопасную Finance surface;
3. затем динамически загружает runtime;
4. ошибка runtime больше не превращает приложение в пустой центр.

Также добавлен cache-busting параметр к entrypoint script в `index.html`.

## Архитектура

Это не обход Clean Architecture. Bootstrap является отдельным Web infrastructure boundary и не содержит бизнес-логики. Application runtime сохраняет существующую структуру и Composition Root.

## Статус

Исправление внесено в `main`.

Основные commits:
- `3d69f0eb1eec4c7c8c9b1c8610ec0a2f1863c6d0` — выделение runtime;
- `4ac552e3c82d7305cb3a27e4fb83014eee434e41` — failure-safe bootstrap;
- `b75dbc441c54cdb49c0cd5c7ae6848c649ec997b` — cache busting.

После deployment production должен показывать Finance даже при полном падении runtime.
