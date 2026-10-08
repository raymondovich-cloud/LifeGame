<!-- docs/changes/8.10.2026/21-25-00-health-presentation.md — Version 1.0 -->

# Health Presentation

**Дата:** 08.10.2026  
**Время:** 21:25:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED / REQUIRES VERIFICATION

## Запрос

Подключить Health к пользовательскому Web Presentation и добавить первый ручной ввод данных.

## Изменения

- Добавлен Health Presentation.
- Health route теперь получает Health Application из Composition Root.
- Добавлена визуализация Health Index, статуса, диагноза, Coverage-факторов.
- Добавлен ручной ввод базовых показателей восстановления, активности и образа жизни.
- Сохранение идёт только через Health Application → Memory.
- Добавлен отдельный Health pattern stylesheet.

## Архитектура

Presentation не обращается напрямую к Supabase или Memory.  
Все чтение и запись проходят через Health Application.

## Ограничение

Body/часть Nutrition метрик пока не получают полноценного raw-to-normalized преобразования; UI не должен интерпретировать отсутствие этих данных как плохое здоровье. Это отдельный следующий этап методологии.

## Верификация

Требуется browser smoke test после публикации.
