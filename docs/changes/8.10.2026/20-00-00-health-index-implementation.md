<!-- docs/changes/8.10.2026/20-00-00-health-index-implementation.md — Version 1.0 -->

# Изменение: Health Index 1.0 — первый вычислительный контур

**Дата:** 08.10.2026  
**Время:** 20:00:00 MSK (UTC+03)  
**Статус:** IMPLEMENTED

## Запрос

Перейти от согласованной методологии Health Index к программной реализации вычислительного контура.

## Изменённые файлы

- source/index/health/health.normalization.js — Version 1.0
- source/index/health/health.factors.js — Version 1.0
- source/index/health/health.index.js — Version 1.0 → Version 1.1
- source/index/health/health.index.test.mjs — Version 1.0 → Version 1.1
- docs/health-1.0-methodology.md — Version 1.1 → Version 1.2
- docs/changes/8.10.2026/20-00-00-health-index-implementation.md — Version 1.0

## Реализовано

1. Нормализаторы для сна, регулярности сна, субъективного восстановления, персонального baseline, активности, шагов и частоты тренировок.
2. Расчёт шести верхнеуровневых факторов Health Index.
3. Weighted factor aggregation с корректным пропуском отсутствующих метрик.
4. Health Index 0–100.
5. Coverage с учётом фактически заполненного веса метрик, а не только наличия фактора.
6. Статусы Insufficient / Preliminary / Full.
7. Recency через half-life.
8. Smoothing α=0.35.
9. Daily change limit ±8.
10. Main Constraint.
11. Автоматические Node tests для нормализаторов, Coverage, smoothing, recency, daily cap, Constraint и границ индекса.

## Важное исправление

До коммита выявлена проблема в первоначальной реализации Coverage: одна заполненная метрика ошибочно могла засчитать весь вес фактора.

Исправлено: Coverage теперь учитывает именно долю заполненного внутреннего веса фактора.

## Архитектура

Index не хранит пользовательские данные и не зависит от UI, Memory, Supabase или HealthKit.

Поток:

Health raw/normalized input → Index normalization → Factors → Health Index → Constraint signals → Application/Diagnosis → Presentation

## Ограничения текущей версии

- Nutrition, Lifestyle и Body сейчас принимают уже нормализованные значения.
- Полный автоматический расчёт всех raw-метрик ещё не реализован.
- Recency пока предоставляет вычислительный primitive; привязка к timestamp-сериям должна выполняться Application layer.
- Diagnosis остаётся отдельной ответственностью Application.
- Apple Health / HealthKit integration отсутствует.

## Следующий этап

Провести интеграционные тесты Health Index и затем подключить его к Application layer без переноса вычислительной логики в Presentation.
