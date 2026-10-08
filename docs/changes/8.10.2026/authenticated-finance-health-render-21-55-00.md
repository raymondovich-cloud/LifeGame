# Исправление пустых Finance и Health после авторизации

Дата: 08.10.2026
Время: 21:55 МСК

## Причина
После добавления режима скрытия presentation header в авторизованном рендере Finance и Health использовалась переменная showPresentationHeader, но она не была инициализирована внутри соответствующих render-функций. Это вызывало ReferenceError именно после создания авторизованного Application.

## Исправления
- source/presentation/finance/finance.js — Version 7.11: инициализирован showPresentationHeader из options.
- source/presentation/health/health.js — Version 1.3: инициализирован showPresentationHeader из options.
- source/presentation/finance/finance.js — Version 7.12: исправлена аналогичная ошибка в renderFinanceData.
- source/presentation/health/health.js — Version 1.4: исправлена аналогичная ошибка в renderHealthData.

## Коммиты
- 53351e9ee290f1710cb6d37073198fa4b84b2d79
- 03e6836f405c0e8a0477e20af8c840f9ad5c1182
- 3084562b867081c8d8d47bb862c4219eb07d5273
- b37359b2459eae3e2fd7b8fd3a952f353aafe807

## Статус
Исправлено в main. Следующий шаг — проверить авторизованный Finance и Health на устройстве пользователя.
