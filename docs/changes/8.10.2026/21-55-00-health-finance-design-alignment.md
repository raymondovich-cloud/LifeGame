<!-- docs/changes/8.10.2026/21-55-00-health-finance-design-alignment.md — Version 1.0 -->

# Health / Finance Design Alignment

**Дата:** 08.10.2026  
**Время:** 21:55:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED / REQUIRES VERIFICATION

## Запрос

Привести визуальный интерфейс Health к единой визуальной системе Finance.

## Изменения

- Health Presentation перестроен по композиционному паттерну Finance.
- Добавлен единый Finance-style header для Health.
- Health Index теперь использует тот же визуальный язык, что и Financial Health.
- Диагностика открывается через тот же текстовый action.
- Факторы Health вынесены в отдельную системную секцию без отдельного карточного дизайна.
- Управление Health данными приведено к тому же паттерну, что и Finance data entry.
- Сохранены текущие Health Index, Diagnosis, Memory и manual input механизмы.

## Архитектурные решения

Presentation использует существующие Design System tokens и Finance visual patterns.  
Health-specific CSS содержит только Health-specific композицию и не дублирует глобальные токены.

## Ограничения

Требуется browser smoke test на авторизованном Health route после публикации.

## Верификация

Проверить: login → Health → Health Index → диагностика → добавление данных → повторный расчёт.
