<!-- docs/changes/8.10.2026/17-55-00-health-data-accordion.md — Version 1.0 -->

# Health Data Accordion

**Дата:** 08.10.2026  
**Время:** 17:55:00 MSK (UTC+03:00)  
**Статус:** IMPLEMENTED / REQUIRES VERIFICATION

## Изменение

В управление данными Health добавлена механика единственного открытого блока, аналогичная Finance Data.

## Поведение

При открытии одной категории Health любая ранее открытая категория автоматически закрывается.

## Ограничения

Изменена только presentation-логика accordion в `source/presentation/health/health.js`. Модель данных, расчёты Health Index и сохранение данных не изменялись.
