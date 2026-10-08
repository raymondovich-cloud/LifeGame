# Исправление Web Runtime — 8.10.2026

## Время
20:05 (МСК)

## Проблема
При недоступности Infrastructure/Composition Root основной runtime загружался, но `renderRoute()` сразу обращался к `application.auth`. В результате публичная навигация не могла нормально отрисовать модули до завершения композиции.

## Исправление
- `platforms/web/web.runtime.js` обновлён до версии 5.1.
- Добавлен режим public-first.
- Finance, Health, Development и Profile теперь получают публичный render до готовности Supabase/Application Composition.
- Ошибка инфраструктуры больше не блокирует маршрутизацию интерфейса.
- После успешной готовности Composition Root существующая authenticated-логика продолжает работать без изменения доменной логики.

## Архитектура
Persistence и Supabase остаются Infrastructure-слоем и не блокируют первоначальную отрисовку интерфейса.

## Статус
Изменение применено в `main`.
