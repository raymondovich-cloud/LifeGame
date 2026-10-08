<!-- docs/life-system-interaction-architecture-1.0.md — Version 1.0 -->

# Life System Interaction Engine 1.0

**Статус:** IMPLEMENTED  
**Дата:** 08.10.2026

## Назначение

Interaction Engine является междоменным контуром LifeGame. Он работает после независимого расчёта Finance, Health и Development и до будущего Life Quality Index.

Finance Index + Health Index + Development Index → Interaction Engine → Life System State → Life Quality Index

## Границы

Finance, Health и Development не импортируют друг друга и не изменяют собственные индексы через Interaction Engine.

Interaction Engine получает только:
- значения компонентных индексов;
- их структурные ограничения;
- производные междоменные отношения.

Сырые пользовательские данные не передаются в Engine.

## Анализ

Engine выполняет попарное сравнение трёх доменов, определение разброса значений, междоменной асимметрии и наиболее сильного структурного ограничителя.

Порог различия для сигнала асимметрии: 20 пунктов.

## Guardrails

- компонентные индексы immutable;
- Engine не переписывает score;
- Engine не заявляет причинность;
- Engine не вычисляет Life Quality Index;
- отсутствие данных не трактуется как низкое качество домена.

## Life System State

Engine возвращает входные значения, pair states, system state, system mean, spread, strongest constraint, полный список доступных constraints и guardrails.

Основные состояния:
- stable;
- system_imbalance;
- cross_domain_asymmetry;
- structural_constraint;
- no_material_conflict;
- insufficient.

## Application boundary

source/application/life-system/life-system.js координирует три независимых Application-модуля и передаёт их результаты в Index Engine.

Presentation не выполняет междоменный расчёт.

## Следующий уровень

Life Quality Index должен быть отдельным расчётным контуром и не должен появляться автоматически как среднее трёх индексов. Его модель требует отдельной валидации.