<!-- docs/training-workout-diary-1.0.md — Version 1.4 -->

# LifeGame — Дневник тренировок 1.4

**Статус:** EXPERIMENTAL — доменная модель, каталог, lifecycle, Application orchestration, persistence schema/adapter и encryption port в репозитории; UI и remote persistence не подключены.  
**Дата:** 10.10.2026

## 1. Цель и границы

Дневник тренировок — самостоятельный предметный модуль Health для фиксации фактически выполненной нагрузки и анализа прогресса. Это не медицинская карта и не источник автоматической диагностики. Версия задаёт контракт данных, стартовый каталог упражнений, допустимые переходы сессии и прикладные сценарии изменения существующей сессии. UI, Health Memory и БД не подключены.

## 2. Доменная модель

TrainingSession содержит UUID-идентификатор, календарную дату ISO YYYY-MM-DD, тип активности (strength/cardio/mobility/other), статус (planned/in_progress/completed), явно заданную интенсивность (light/moderate/vigorous/unknown), необязательные длительность и заметки, упражнения, дату создания и обновления.

Упражнение содержит идентификатор, название, явно заданные целевые группы мышц и подходы. Подход содержит повторения, явный статус выполнения и необязательное сопротивление. Сопротивление может иметь единицу kg/lb либо тип bodyweight/band/machine/other. Неизвестная масса не заменяется вымышленным весом.

## 3. Каталог упражнений

source/domain/training/exercise-catalog.js содержит стартовый неизменяемый каталог из 18 силовых упражнений. У каждого упражнения есть стабильный ID, русское и английское отображаемые название, нормализованные группы мышц и тип оборудования. Название можно локализовать или изменить без изменения ID. Каталог можно искать по ID, группе мышц, оборудованию и названию.

Канонические группы мышц: chest, back, shoulders, biceps, triceps, forearms, quadriceps, hamstrings, glutes, calves, core. Это текущий словарь для подготовки данных; он не является медицинской классификацией. Каталог — стартовый набор, а не полный перечень упражнений. Произвольные пользовательские упражнения, их жизненный цикл и хранение пока не реализованы.

## 4. Жизненный цикл сессии

source/domain/training/training-session-lifecycle.js реализует чистые доменные операции:
- startTrainingSession: только planned → in_progress.
- completeTrainingSession: только in_progress → completed; итоговая сущность повторно валидируется.
- reviseTrainingSession: исправление даты, типа активности, интенсивности, длительности, заметок и упражнений, включая исправление завершённой записи. ID, статус, createdAt, userId и неизвестные поля редактировать нельзя.

Каждая операция создаёт новую неизменяемую сущность, сохраняет ID и время создания, повторно валидирует данные и требует неубывающий updatedAt.

## 5. Application-сценарии и persistence port

source/application/training/save-training-session.js создаёт ID и timestamps на стороне Application и вызывает `repository.insertForUser(userId, session)`. Вставка не должна выполнять upsert. Успешный результат — envelope `{ session, revision: 1 }`.

source/application/training/manage-training-session.js предоставляет:
- start({ userContext, sessionId, expectedRevision });
- complete({ userContext, sessionId, expectedRevision });
- revise({ userContext, sessionId, expectedRevision, changes }).

Порт репозитория:
- `findForUser(userId, sessionId)` возвращает `{ session, revision }` или `null`;
- `insertForUser(userId, session)` вставляет новую запись и возвращает `{ session, revision: 1 }`, не перезаписывая существующую;
- `updateForUser(userId, session, expectedRevision)` выполняет атомарный compare-and-swap и возвращает `{ session, revision: expectedRevision + 1 }`; `null` означает конфликт версии.

Все revision — положительные safe integers. ID сессии — UUID в каноническом формате. При несовпадении ожидаемой версии Application возвращает `TRAINING_SESSION_CONFLICT`; отсутствие записи в scope пользователя — `TRAINING_SESSION_NOT_FOUND`. Конкретный адаптер обязан обеспечить атомарную проверку версии в БД, а не проверять её только в JavaScript.

Передача userId в порт задаёт scope, но не является авторизацией. Серверная identity и политики БД обязаны независимо проверять владельца при каждой операции. Токены и service-role secrets не должны попадать во frontend.

## 6. Шифрование и открытые метаданные

Целевой контракт для будущего persistence-адаптера:
- содержимое тренировки (тип активности, интенсивность, длительность, заметки, упражнения и подходы) хранится в аутентифицированном шифротексте;
- для payload целевой алгоритм — AES-256-GCM с уникальным nonce для каждой операции шифрования и проверкой authentication tag;
- применяется envelope encryption: отдельный DEK шифрует payload, а KMS-managed KEK защищает DEK; ключи и открытый DEK не хранятся рядом с шифротекстом и не попадают в Git или клиентский код;
- открытые метаданные ограничиваются техническим ID, user_id, датой сессии, статусом, revision и необходимыми timestamps. Дата и частота активности остаются потенциально раскрывающей метаинформацией;
- конкретный KMS-провайдер, key lifecycle, ротация, recovery и multi-device access должны быть выбраны и проверены до реализации.

Это целевой контракт, а не текущая реализация. Не заявляется end-to-end encryption: доверенный серверный контур в целевой модели сможет расшифровывать payload. TLS и provider encryption-at-rest остаются дополнительными слоями, но не заменяют прикладное шифрование.

## 7. Persistence и прикладное шифрование

- Миграция supabase/migrations/20261010160000_create_training_sessions.sql задаёт таблицу training_sessions, RLS, grants, immutable ownership, разрешённые lifecycle transitions и DB-managed revision.
- source/infrastructure/supabase/training-session.repository.js реализует findForUser, insertForUser и optimistic update через атомарный фильтр revision = expectedRevision. Адаптер работает только с шифрованным payload и требует server-side encryption port.
- source/infrastructure/security/aws-kms-training-payload-encryption.js реализует AES-256-GCM и envelope-encryption orchestration через AWS KMS port. Для каждого сохранения создаётся DEK; AAD/KMS context привязаны к владельцу, сессии, дате, статусу и revision.
- Целевой KMS-провайдер — AWS KMS. Key ARN, restricted IAM credentials и Edge Function wiring не настроены; миграция не применена к remote DB.
- Database RLS/trigger tests находятся в supabase/tests/database/002_training_sessions_test.sql; crypto/repository unit tests проверяют mock KMS и mock Supabase, не реальный облачный KMS или remote database.

## 8. Проверка и границы архитектуры

Domain не знает о UI, Memory, Infrastructure, пользователях, БД, сети, Apple Health или криптографии. Application координирует сценарии через внедрённый репозиторий и часы; конкретная БД не подключена.

Не изменялись текущий Health UI, общий Health Index и подготовка недельной силовой активности. Не реализованы постоянное хранение, Supabase-адаптер, миграция, прикладное шифрование, синхронизация web/Telegram/iOS, импорт Apple Health, программы тренировок, пользовательские упражнения и защита от конкурентных записей на уровне БД.

## 9. Обязательная проверка перед production

- RLS и grants проверены тестами на реальной PostgreSQL/Supabase-среде.
- Нельзя читать/изменять/удалять сессию другого пользователя.
- Нельзя передать чужой user_id через INSERT/UPDATE.
- CAS конфликтует при stale revision и не теряет данные.
- Повторный ID не перезаписывает существующую запись.
- Криптографическая проверка отвергает неверный nonce/tag, поддерживает key version и безопасную ротацию.
- Payload, токены и ключи отсутствуют в логах.

Текущие unit-тесты Application не доказывают безопасность будущего адаптера или БД.
