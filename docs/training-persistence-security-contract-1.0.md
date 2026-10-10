<!-- docs/training-persistence-security-contract-1.0.md — Version 1.9 -->

# LifeGame — Контракт безопасного хранения дневника тренировок

**Статус:** PARTIALLY IMPLEMENTED — миграция, RLS/trigger, Supabase repository и AES-256-GCM encryption port добавлены в репозиторий. Production provider для envelope encryption не выбран; remote DB migration, cloud keys, secrets и production deployment не подключены. Прямые table grants для клиентских ролей отзываются в локальной миграции; privileged server path требует отдельной проверки перед deployment. Разработка должна оставаться в бесплатном контуре до отдельного согласования расходов.  
**Дата:** 10.10.2026

## 1. Цель и границы

Документ определяет контракт безопасного хранения дневника тренировок. Миграция и адаптер находятся в GitHub; миграция не применялась к удалённой Supabase-базе. CI подтверждает локальные PostgreSQL/RLS tests и unit-тесты Edge handler; реальный AWS KMS smoke test ещё не выполнялся.

Текущая реализация Domain/Application не является доказательством безопасности хранения. Существующие Health/Development адаптеры и их RLS — полезная отправная точка, но не готовая реализация дневника тренировок.

## 2. Предметная граница и размещение

- Domain: `source/domain/training/` — модель и правила жизненного цикла.
- Application: `source/application/training/` — сценарии и порты репозитория.
- Infrastructure: `source/infrastructure/supabase/training-session.repository.js`.
- Persistence: `supabase/migrations/20261010160000_create_training_sessions.sql`.
- Database security tests: `supabase/tests/database/002_training_sessions_test.sql`; adapter and encryption unit tests in `source/infrastructure/`.

Не переносить SQL, Supabase SDK, RLS-детали или криптографические библиотеки в Domain. Не подключать UI к Supabase напрямую.

## 3. Целевая модель хранения

Целевая таблица: `public.training_sessions`, одна запись на одну тренировочную сессию.

Минимальные технические поля:

- `id uuid primary key` — UUID сессии;
- `user_id uuid not null references auth.users(id) on delete cascade` — владелец;
- `session_date date not null` — календарная дата;
- `status text not null` — planned / in_progress / completed;
- `revision bigint not null` — монотонная версия для optimistic concurrency;
- `payload_ciphertext bytea not null` — AES-256-GCM ciphertext приватного payload;
- `payload_nonce bytea not null` — 12-byte nonce;
- `payload_tag bytea not null` — 16-byte GCM authentication tag;
- `payload_key_envelope bytea not null` — provider-specific key envelope (development: random HKDF salt; future managed-KMS provider: wrapped DEK);
- `payload_key_version text not null` — version label used to resolve a KMS key ARN;
- `created_at timestamptz not null`;
- `updated_at timestamptz not null`.

Схема зафиксирована в миграции, но пока не применена к удалённой базе. Ограничения размеров, nonce/tag и ключевого конверта заданы в PostgreSQL.

Открытые поля ограничиваются ID, owner, session_date, status, revision и timestamps. Они всё ещё раскрывают факт и частоту тренировок. Приватный payload включает activityType, intensity, durationMinutes, notes, exercises и sets. Если продукту понадобится поиск по зашифрованным полям, отдельный дизайн индексов должен пройти security review.

Для календарных выборок нужен индекс по `(user_id, session_date)`. Индексы добавляются только под подтверждённые запросы.

## 4. Авторизация и изоляция пользователя

1. Владелец записи определяется доверенной identity Supabase Auth, а не значением `userId`, переданным клиентом.
2. Прямые grants для `authenticated` и `anon` отозваны: клиент не может читать или изменять таблицу напрямую.
3. Доступ к таблице выдаётся только `service_role`, используемой исключительно внутри Edge Function после проверки JWT. Репозиторий обязан добавлять `user_id` в каждый SELECT/UPDATE и назначать `user_id` только из проверенного `userContext`.
4. RLS остаётся включённой как defense in depth; прямой клиентский доступ блокируется grants, а не только RLS.
5. SELECT и UPDATE policies используют ownership predicate, эквивалентный `(select auth.uid()) = user_id`; INSERT policy требует того же владельца. Эти policies остаются дополнительным слоем защиты, но пользовательские роли не имеют table grants. DELETE клиенту не выдан, удаление при удалении аккаунта идёт через FK cascade.
6. INSERT policy требует `WITH CHECK ((select auth.uid()) = user_id)`.
7. UPDATE policy требует `USING ((select auth.uid()) = user_id)` и `WITH CHECK ((select auth.uid()) = user_id)`.
8. Табличные grants для `authenticated` и `anon` отсутствуют. `service_role` имеет минимально необходимые здесь SELECT/INSERT/UPDATE grants; ключ никогда не попадает в клиентский код.
9. Не выдавать доступ роли `anon`. Не использовать `service_role` или secret key во frontend, Telegram WebApp либо iOS-клиенте.
10. Не добавлять обход RLS через `SECURITY DEFINER` без отдельного security review. Текущий trigger — `SECURITY INVOKER`; он разрешает trusted `service_role` работу без `auth.uid()`, но при наличии user claim продолжает проверять владельца.
11. При отсутствии записи или недоступности чужой записи возвращается единый результат «не найдено/недоступно».

Application use case может передавать user context как параметр порта, но это само по себе не является авторизацией. Handler проверяет JWT через Supabase Auth до создания привилегированного repository client. Все repository-запросы фильтруются по проверенному user ID; сервисный ключ никогда не передаётся клиенту. Любая ошибка в серверном коде, который формирует фильтры, становится риском повышенных привилегий, поэтому owner-scope тесты обязательны.

## 5. Контракт репозитория и конкурентные изменения

Application port фиксируется следующим образом:

- `findForUser(userId, sessionId)` → `{ session, revision }` или `null`;
- `insertForUser(userId, session)` → `{ session, revision: 1 }`; существующий ID не перезаписывается;
- `updateForUser(userId, session, expectedRevision)` → атомарное обновление при совпадении владельца и версии; возвращает `{ session, revision: expectedRevision + 1 }`;
- если expectedRevision устарел или CAS больше не совпадает, `updateForUser` возвращает `null`; Application переводит это в `TRAINING_SESSION_CONFLICT`;
- версия — положительное safe integer в Application; PostgreSQL хранит её как bigint и адаптер проверяет диапазон до преобразования;
- ID сессии — UUID в каноническом формате.

Проверка версии и UPDATE должны быть одной атомарной операцией в БД. Последовательность «прочитать → сравнить в JavaScript → безусловно записать» запрещена. Клиент передаёт revision, с которой редактировал запись, чтобы устаревшие формы не применялись поверх новых данных.

## 6. Валидация и целостность

- PostgreSQL constraints ограничивают обязательные поля и допустимые значения статуса.
- Domain повторно валидирует каждую загруженную сессию.
- Payload проходит версионированную сериализацию, ограничение размера и криптографическую проверку до Domain.
- Сервер не принимает owner, created_at, updated_at или revision из клиентского payload как доверенные значения.
- ID не может быть использован для перезаписи другой записи.
- Все мутации проходят через утверждённые Application-сценарии и доменные переходы.
- Revision увеличивается ровно на 1 при каждом успешном обновлении.

## 7. Модель прикладного шифрования

Целевой контракт:

- приватный payload (тип активности, интенсивность, длительность, заметки, упражнения и подходы) шифруется алгоритмом AES-256-GCM;
- для каждого шифрования генерируется уникальный криптографически случайный nonce; nonce хранится рядом с ciphertext, но не является секретом; authentication tag обязателен и проверяется при расшифровании;
- для текущей бесплатной разработки используется software-only HKDF-SHA-256 derivation от 32-байтового server-side master key и случайного 32-байтового salt; приватный payload шифруется AES-256-GCM;
- software-only provider предназначен только для development/staging: секрет хранится в окружении Edge Function, не защищён отдельным KMS, а полноценная ротация и управляемое восстановление ключей отсутствуют;
- перед production software provider должен быть заменён на утверждённый managed-key envelope-encryption provider; до этого production deployment запрещён;
- открытый DEK, KEK и другие секреты не хранятся рядом с данными, в Git, клиентском коде или логах;
- ciphertext, nonce и key version хранятся раздельными техническими полями;
- AWS KMS adapter сохранён как кандидат для будущего production-контура, но сейчас не подключается; AWS SDK и AWS credentials не требуются для бесплатного development path.

Эта модель обеспечивает шифрование на уровне приложения в доверенном серверном контуре, но **не является end-to-end encryption**: доверенный сервер, имеющий право получить ключ, сможет расшифровать payload. Не следует заявлять E2EE без отдельной архитектуры клиентских ключей и recovery.

AAD связывает ciphertext с user_id, session_id, датой, статусом и revision. Software provider использует random salt и HKDF-SHA-256 для выведения отдельного AES key; managed-KMS provider может использовать key envelope с wrapped DEK. Для AES-GCM используется 12-byte nonce и 16-byte tag. Модуль source/infrastructure/security/software-master-key-training-payload-encryption.js используется в бесплатной среде; его тесты проверяют криптографический контракт, но не защищённость хранения секретов Supabase. Модуль source/infrastructure/security/aws-kms-training-payload-encryption.js оставлен для отдельной production-интеграции и покрыт mock KMS tests.

Если после отдельного согласования будет выбран AWS KMS или другой managed provider, его policy должна ограничивать доступ только необходимыми криптографическими операциями для серверного workload. Key mapping задаётся server-side; старые версии нельзя удалять, пока данные не перешифрованы или не удалены. Ключи и credentials не добавляются в Git. До такого согласования не создавать cloud resources.

TLS и шифрование at rest провайдера остаются дополнительными слоями, но не заменяют application-layer encryption. Шифрование реализовано через Infrastructure port; Edge Function использует software-only provider и ожидает секреты Supabase Edge Function, но secrets не настроены и endpoint не развёрнут.

## 8. Удаление и жизненный цикл

- Удаление аккаунта должно иметь согласованную политику удаления тренировок через FK cascade или явно описанный процесс.
- Не копировать содержимое тренировки в логи или аналитические таблицы без отдельной цели и срока хранения.
- Аудит безопасности хранится отдельно от содержимого тренировки.
- До запуска определить retention, backup/restore и проверку удаления из активного хранилища и резервных копий.
- Ротация KEK и key version должны иметь документированную процедуру, не допускающую потери доступа к существующему ciphertext.

## 9. Обязательные проверки перед интеграцией

1. Пользователь A читает собственную сессию.
2. Пользователь A не может прочитать сессию пользователя B по известному ID.
3. Пользователь A не может обновить или удалить сессию пользователя B.
4. INSERT/UPDATE с чужим `user_id` отклоняется БД.
5. Нельзя сменить `user_id` существующей записи.
6. `anon` не может читать или изменять тренировочные записи.
7. Отсутствующий, просроченный или некорректный JWT не даёт доступ.
8. Два обновления одной revision: одно успешно, второе получает конфликт.
9. Повторная вставка ID не перезаписывает существующую запись.
10. Ошибка репозитория не выдаёт несохранённое состояние как сохранённое.
11. Смена пользователя не возвращает данные предыдущего аккаунта из cache.
12. Логи не содержат payload, токены или ключи.
13. Неверный GCM tag приводит к отказу расшифрования без возврата частичных данных.
14. Key version и ротация проверяются на тестовом наборе данных.

RLS, grants и CAS должны тестироваться на реальной тестовой PostgreSQL/Supabase-среде. Unit-тесты с mock repository не доказывают изоляцию БД.

## 10. Решения до production

- UUID для ID сессии — принят и закреплён в Domain.
- Revision-based optimistic concurrency — принят как контракт Application.
- Для бесплатной разработки реализован software-only AES-256-GCM + HKDF-SHA-256 provider с секретом окружения. Он предназначен только для development/staging и не эквивалентен управляемому KMS. До production необходимо заменить его на утверждённый managed-key provider, проверить ротацию и восстановление, и отдельно согласовать расходы.
- Подготовить миграцию и интеграционные тесты, не затрагивая существующие Health/Development таблицы.
- Проверить SQL, RLS, grants, тесты и CI до подключения UI.

## 11. Статус

**PARTIALLY IMPLEMENTED.** В репозитории есть migration, RLS policies, ownership/lifecycle trigger, compare-and-swap repository adapter и AES-256-GCM encryption port; mock KMS покрывает криптографический контракт в unit-тестах. AWS KMS adapter сохранён, но не подключён к бесплатному development entrypoint и не является утверждённым production-решением. Entry point использует software-only provider с секретом окружения; deployment и secrets не настроены. Не создан AWS KMS key, не добавлены cloud credentials/secrets, миграция не применена к remote Supabase. CI подтверждает unit tests и локальные PostgreSQL/RLS tests для соответствующего коммита. Бесплатный software-only provider не считается production-ready; до выбора managed-key provider, проверки ротации и явного согласования расходов не развёртывать production endpoint и не ослаблять требования безопасности.
