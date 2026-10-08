<!-- docs/changes/8.10.2026/20-12-00-health-application-integration.md — Version 1.0 -->

# Изменение: Health Application + интеграционные тесты

**Дата:** 08.10.2026  
**Время:** 20:12:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED

## Запрос

Продолжить реализацию Health после вычислительного контура: добавить Application layer и интеграционно проверить цепочку Index → Diagnosis.

## Изменённые файлы

- source/application/health/health.js — Version 1.0
- source/application/health/health.test.mjs — Version 1.0
- docs/changes/8.10.2026/20-12-00-health-application-integration.md — Version 1.0

## Реализовано

1. Создан Health Application.
2. Application принимает Health input и координирует calculateHealthIndex.
3. Diagnosis формируется на основании Index.constraints.
4. Недостаток данных сохраняется как отдельное состояние, а не превращается в низкий индекс.
5. Добавлена валидация входного Health input.
6. Добавлены интеграционные тесты Index + Diagnosis, insufficient data, invalid input и независимости Diagnosis от UI state.

## Архитектура

Текущий поток:

Health Facts → Health Application → Health Index → Constraints → Health Diagnosis → Presentation

Health Application не хранит пользовательские данные.

Health Index не зависит от Application, Memory, Infrastructure или Presentation.

Diagnosis не рассчитывает индекс повторно и не получает данные из UI.

## Ограничения

1. Реальный Health Memory пока не создаётся.
2. Apple Health / HealthKit ещё не подключён.
3. Web Composition Root пока не подключает Health Application.
4. Это намеренно оставлено отдельным следующим этапом: сначала требуется зафиксировать контракт Health Memory и источник фактов.

## Следующий этап

Создать Health Memory contract для пользовательских Health facts и подключить его к Web Composition Root, сохранив изоляцию пользователя и возможность будущего HealthKit adapter.
