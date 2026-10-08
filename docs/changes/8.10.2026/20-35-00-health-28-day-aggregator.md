<!-- docs/changes/8.10.2026/20-35-00-health-28-day-aggregator.md — Version 1.0 -->

# Health 28-Day Aggregator

**Дата:** 08.10.2026  
**Время:** 20:35:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED

## Запрос

Подключить Health Memory к Application через 28-дневный агрегатор.

## Изменения

- Добавлен Health Aggregator с фиксированным 28-дневным окном.
- Добавлено recency-взвешивание с утверждёнными half-life: fast 3, medium 14, slow 28 дней.
- Activity workout events используются для расчёта trainingsPerWeek.
- Nutrition facts пока читаются из lifestyle storage, без отдельного Memory-категории.
- Health Application получил calculateFromMemory().
- Добавлены тесты окна, recency, training events и отсутствующих данных.

## Важное решение

Не введены новые неподтверждённые формулы для duration, regularity и load/recovery balance. Они будут добавлены только после отдельной валидации методологии.

## Следующий этап

Подключить Health Application к Web Composition Root и затем подготовить Infrastructure adapter для постоянного хранения Health facts.
