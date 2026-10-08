<!-- docs/changes/8.10.2026/20-50-00-health-composition-root.md — Version 1.0 -->

# Health Composition Root

**Дата:** 08.10.2026  
**Время:** 20:50:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED

## Запрос

Подключить Health Application к Web Composition Root.

## Изменения

- Web Composition Root получил Health Application factory.
- Health создаётся только для authenticated userId.
- UserContext используется при создании Health Memory.
- Memory проходит через Health Memory Port перед передачей в Application.
- Добавлена очистка Health Application по пользователю при завершении сессии.

## Ограничение

На этом этапе Health Memory является runtime memory и не переживает перезагрузку страницы.

Это сделано намеренно: постоянное хранение будет добавлено отдельным Infrastructure adapter через Supabase, без изменения Health Domain/Index/Application contract.
