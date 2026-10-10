# Изменение публичных экранов Health и Development

Дата: 08.10.2026

## Изменено

- Удалён legacy preview fallback для публичных маршрутов Health и Development.
- При переключении неавторизованный пользователь теперь получает полноценный экран соответствующего модуля.
- Публичный экран использует тот же presentation-компонент, что и основной продукт.
- Описательный presentation header остаётся только для неавторизованного режима.
- Для авторизованного режима сохранено скрытие presentation header.
- Legacy текстовый набор:
  - LIFE GAME
  - SYSTEM ONLINE
  - DEVELOPMENT SYSTEM
  - Знания и личный рост.
  - 01 Навыки
  - 02 Цели
  - 03 Прогресс
  больше не используется как fallback при навигации.

## Архитектура

Изменение выполнено только на уровне Web Runtime / Presentation routing. Расчёты индексов, Application, Domain, Memory, Supabase и Interaction Engine не изменялись.

## Версия

platforms/web/web.runtime.js — Version 5.6

## Статус

Дополнительно исправлено: ошибка проверки auth не блокирует публичные Finance/Health/Development presentation-маршруты.\n\nГотово к проверке в браузере.
