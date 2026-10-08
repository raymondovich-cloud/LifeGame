<!-- docs/changes/8.10.2026/21-15-00-shared-data-management-design.md — Version 1.0 -->

# Shared Data Management Design

**Дата:** 08.10.2026  
**Время:** 21:15:00 MSK (UTC+03:00)  
**Статус:** IMPLEMENTED / REQUIRES VERIFICATION

## Запрос

Синхронизировать визуальный дизайн управления данными Health с существующим Finance data screen и убрать отдельные Health-specific стили для этой поверхности.

## Изменения

- Общий premium data-management accordion вынесен в Design System.
- Finance переведён на общий CSS-паттерн без изменения поведения.
- Health переведён на тот же accordion-паттерн: градиент, рамка, верхняя акцентная линия, spacing и состояния раскрытия.
- Удалены Health-specific стили, дублировавшие внешний вид Finance.
- Health сохранил собственную структуру факторов и поля внутри них.

## Архитектура

Общая визуальная механика находится в `source/design/components/data-management.css`.
Finance и Health используют один Design System паттерн; Presentation определяет только содержимое и данные.

## Верификация

Проверить Finance и Health на mobile/desktop: внешний вид закрытых/открытых секций, отступы, кнопки и сохранение данных.
