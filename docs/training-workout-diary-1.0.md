<!-- docs/training-workout-diary-1.0.md — Version 1.9 -->

# LifeGame — Дневник тренировок 1.9

**Статус:** EXPERIMENTAL — доменная модель, каталог, lifecycle, Application orchestration, persistence schema/adapter и encryption port в репозитории; добавлен UI-каркас Training Overview и Domain/Application-модель программы, реализован отдельный server-side persistence boundary программ с шифрованием payload, но запуск занятия и создание/изменение сессий из UI ещё не подключены.  
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

## 5.1. Доменная модель тренировочной программы

`source/domain/training/training-program.js` определяет неизменяемую `TrainingProgram`: UUID, название, дату начала, продолжительность 1–52 недели, статус active/paused/completed, недельные шаблоны занятий и timestamps. Каждый шаблон задаёт стабильный ID, название, день недели, необязательную длительность и упражнения. Назначение упражнения хранит целевые группы мышц, подходы, повторения, отдых и необязательное сопротивление; для собственного веса числовая нагрузка не выдумывается.

`get-training-program.js` возвращает программу текущего пользователя или `null`. `save-training-program.js` создаёт программу с revision 1 либо обновляет её с optimistic concurrency, сохраняя ID и createdAt. Repository port изолирует владельца, а `updateForUser(userId, program, expectedRevision)` выполняет атомарный compare-and-swap. Application-контекст сам по себе не является авторизацией. Защищённый server-side persistence-адаптер программ реализован отдельной Edge Function boundary; фактическое подключение remote функции и миграции остаётся отдельным deployment шагом.

`TrainingProgram` описывает недельный шаблон, а не историю выполненных занятий. Текущая неделя, фактический прогресс и рекомендация по прошлому весу должны вычисляться отдельным Application read model на основании даты начала, расписания и завершённых `TrainingSession`; они не должны быть вручную изменяемыми полями программы.

## 5.2. Application read model экрана тренировок

`source/application/training/training-overview.read-model.js` формирует производную модель экрана из программы и сохранённых `TrainingSession`: номер недели, количество выполненных занятий по расписанию, ближайшую незавершённую тренировку и рекомендацию по предыдущим завершённым подходам. Расчёт не записывает производные значения в программу и не генерирует фиктивный прогресс. Для сопоставления занятия с шаблоном используются дата, ISO-день недели и полный набор ID упражнений шаблона.

Рекомендация показывает только завершённые подходы с одинаковыми повторениями и числовым сопротивлением в килограммах. Собственный вес и другие единицы не конвертируются и не подменяются числовым значением. Read model покрыт unit-тестами, но пока не подключён к удалённому репозиторию и Training Overview UI.

## 5.3. Защищённое хранение TrainingProgram

`source/infrastructure/supabase/training-program.repository.js` реализует `findForUser`, `insertForUser` и атомарное обновление через фильтр `user_id + id + revision`. Программа уникальна для пользователя на уровне схемы. В открытом виде остаются только UUID владельца/программы, дата начала, статус, revision и timestamps. Название, длительность и недельные шаблоны передаются только в AES-256-GCM ciphertext.

`supabase/functions/training-programs/handler.js` проверяет bearer token через Supabase Auth до создания привилегированного клиента, получает user ID только из проверенной identity, не принимает клиентские persistence metadata и не раскрывает детали внутренних ошибок. `supabase/functions/training-programs/index.ts` композирует серверные зависимости; для локальной разработки предусмотрен software master-key provider с HKDF, а не реальный AWS KMS. Он не считается production KMS: до production необходим утверждённый managed-key adapter, ротация ключей и проверка секретов/прав доступа.

Миграция `supabase/migrations/20261011150000_create_training_programs.sql` запрещает прямые SELECT/INSERT/UPDATE для anon/authenticated, оставляет RLS включённым, ограничивает доступ server_role и фиксирует identity/owner/revision на стороне БД. Remote migration и реальные secrets здесь не применялись и не настраивались.

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

Добавлен презентационный каркас `source/presentation/training/training-overview.js` и отдельные стили `source/design/patterns/training.css`. Компонент поддерживает отображение переданных данных программы и прошлой тренировки, но пока получает пустое состояние: Application-контракты программ, получение пользовательской программы, запуск занятия и подключение сохранённых TrainingSession ещё не связаны с UI. Health Index и NEXT BEST ACTION не изменялись. Также не реализованы синхронизация web/Telegram/iOS, импорт Apple Health, пользовательские упражнения и production-проверка remote persistence.

## 9. Обязательная проверка перед production

- RLS и grants проверены тестами на реальной PostgreSQL/Supabase-среде.
- Нельзя читать/изменять/удалять сессию другого пользователя.
- Нельзя передать чужой user_id через INSERT/UPDATE.
- CAS конфликтует при stale revision и не теряет данные.
- Повторный ID не перезаписывает существующую запись.
- Криптографическая проверка отвергает неверный nonce/tag, поддерживает key version и безопасную ротацию.
- Payload, токены и ключи отсутствуют в логах.

Текущие unit-тесты Application не доказывают безопасность будущего адаптера или БД.


## 10. Статус этапа read model

Добавлен изолированный Application read model и тесты вычисления прогресса/рекомендации. Экран по-прежнему не подключён к данным пользователя. Следующий этап — защищённое серверное хранение `TrainingProgram` с отдельным криптографическим контекстом, затем загрузка программы и истории сессий через серверный API и подключение read model к Presentation. До этого UI не должен отображать примеры как реальные пользовательские данные.


## 11. Статус защищённого хранения программы

Добавлены отдельная таблица, server-side repository, Edge Function boundary и handler tests. Не заявляется, что production AWS KMS настроен или что миграция применена к удалённой базе.

## 12. Подключение Training Overview к удалённым данным

`source/infrastructure/supabase/training-overview.api.js` вызывает только authenticated Edge Functions через browser Supabase client; server-only repository/encryption modules не импортируются в клиентский bundle. `source/application/training/load-training-overview.js` параллельно загружает TrainingProgram и список сессий и передаёт фактические записи в read model. `training-sessions` handler и owner-scoped repository предоставляют `list` для текущей verified identity; список сортируется по дате, ограничен последними 100 записями и каждый payload расшифровывается на сервере.

`platforms/web/composition/root.js` создаёт per-user Application wrapper, а Health Presentation отображает состояние загрузки, реальные прогресс и рекомендацию либо нейтральную ошибку. UI не создаёт фиктивные записи и кнопка «НАЧАТЬ» остаётся отключённой, пока lifecycle занятия не подключён к пользовательскому интерфейсу. Новые сценарии Application и handler list покрыты тестами, включёнными в Preview CI.

Эта интеграция требует, чтобы обновлённая Edge Function `training-sessions` была развернута в целевом Supabase-проекте. Здесь remote Edge Function и миграции не развёртывались; до проверки deployment экран безопасно покажет ошибку загрузки, а не выдуманный прогресс.
