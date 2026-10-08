# LifeGame — Development + Life System interaction
Дата: 08.10.2026
Статус: реализовано, отправлено в main

## Что изменено

### Development
- Development Application переведён на реальный 28-дневный контур.
- Добавлена фильтрация будущих записей.
- Используется актуальный факт внутри рабочего периода.
- Диагностика ограничителя получила уровни critical / weak / attention.
- Сохранена независимость Development от Finance и Health.

### Interaction Engine
- Порог междоменной асимметрии закреплён на 20 пунктов.
- Добавлен детерминированный приоритет состояний:
  1. structural_constraint
  2. system_imbalance
  3. cross_domain_asymmetry
  4. stable
  5. insufficient
- Добавлено текстовое объяснение состояния.
- Компонентные индексы не изменяются Interaction Engine.
- Причинность между доменами не утверждается.
- Расчёт Life Quality Index в Interaction Engine не выполняется.

### Presentation
- Development получил полноценный экран индекса.
- Отображаются пять факторов и их значения.
- Добавлен рабочий ввод данных по всем метрикам.
- Последние сохранённые значения подставляются обратно в форму.
- Добавлен Life System с Finance / Health / Development.
- Добавлены попарные взаимодействия индексов, разница в пунктах и системное состояние.
- Отображается strongest constraint.

### Tests
- Добавлены тесты Development Application.
- Расширены тесты Interaction Engine.
- CI теперь запускает Development Application tests.

## Проверка
- Кодовая структура сохранена по Clean Architecture.
- Все изменённые файлы имеют Version marker.
- Finance, Health и Development остаются независимыми доменами.
- Interaction Engine находится над компонентными индексами и не мутирует их.

## Следующий этап
- Проверить production click-through после деплоя: авторизация → Development → ввод данных → пересчёт Development → Life System.
