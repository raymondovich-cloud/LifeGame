<!-- docs/changes/8.10.2026/20-20-00-health-memory-contract.md — Version 1.0 -->

# Health Memory Contract

**Дата:** 08.10.2026  
**Время:** 20:20:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED

## Запрос

Создать Health Memory contract для пользовательских Health facts и подготовить архитектуру к будущему HealthKit adapter.

## Изменённые файлы

- source/memory/health/health.memory.js — Version 1.0
- source/application/health/health.memory.port.js — Version 1.0
- source/application/health/health.memory.test.mjs — Version 1.0
- docs/changes/8.10.2026/20-20-00-health-memory-contract.md — Version 1.0

## Реализовано

- Изоляция Health Memory по userId.
- Категории: body, activity, recovery, lifestyle.
- Сохранение recordedAt.
- Получение фактов по диапазону времени.
- Получение последних фактов.
- Defensive copies.
- Application Memory Port с минимальным контрактом.
- Тесты пользовательской изоляции и контракта.

## Архитектурное решение

Health Memory хранит факты, но не рассчитывает Health Index и не содержит медицинской бизнес-логики.

Будущий HealthKit adapter должен преобразовывать внешние данные в этот контракт, не меняя Index.

Следующий этап: связать Memory Port с Health Application и добавить сборку текущего 28-дневного набора фактов.
