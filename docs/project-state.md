<!-- docs/project-state.md — Version 1.5 -->

# LifeGame — текущее состояние проекта

**Статус:** CURRENT  
**Дата аудита:** 06.10.2026  
**Репозиторий:** `raymondovich-cloud/LifeGame`  
**Основная ветка:** `main`

> Документ отражает подтверждённое текущее состояние. BASELINE хранится отдельно в `docs/fixed-version-project.md`.

## 1. Архитектура

В проекте присутствуют:

- `core/`;
- `domain/`;
- `application/`;
- `presentation/`;
- `infrastructure/`;
- `memory/`;
- `index/`;
- `design/`.

`index/` является отдельной архитектурной подсистемой расчётных показателей.

`design/` является независимой Design System.

Фактические границы документации:

- Domain не должен напрямую обращаться к Memory и техническим реализациям;
- Application координирует прикладные сценарии;
- Presentation отвечает за UI;
- Infrastructure содержит технические реализации;
- Memory используется для состояния и истории;
- Index содержит расчётные показатели;
- Design System отделена от бизнес-логики.

## 2. Web и навигация

Веб-приложение находится в `platforms/web/`.

Основные точки:

- `platforms/web/index.html`;
- `platforms/web/web.js`;
- `platforms/web/composition/root.js`.

Маршруты приложения включают Finance, Health, Development, Profile и Auth.

При отсутствии сессии Web работает в public mode. Finance, Health и Development доступны в публичном режиме как preview/entry flows; действия, требующие сохранения, открывают регистрацию.

Profile в public mode открывает регистрацию. После аутентификации Profile рендерится как отдельный пользовательский раздел.

## 3. Identity — IMPLEMENTED

Текущая Web Identity реализация включает:

- Supabase Auth;
- отдельные Presentation-модули Registration и Login;
- Application Identity;
- Infrastructure Identity adapter;
- получение текущей сессии;
- email verification flow;
- повторную отправку verification email;
- logout;
- Profile Application и Profile Presentation;
- профиль с display name и birth date;
- RLS для `public.profiles`;
- private `security_events`;
- автоматическое создание profile/security event при регистрации.

Текущая база Identity зафиксирована миграциями:

- `0001_identity_foundation.sql`;
- `0002_identity_profile_bootstrap.sql`;
- `0003_identity_profile_fields.sql`;
- `0004_identity_profile_birth_date_validation.sql`.

Supabase является текущей технической реализацией Identity и хранения.

## 4. Identity — PLANNED

В текущем коде не следует считать реализованными без отдельного подтверждения:

- полноценное управление несколькими устройствами;
- отдельный session-management интерфейс;
- Passkeys/WebAuthn;
- MFA;
- Telegram Identity;
- iOS Identity;
- полноценный recovery/security dashboard.

Эти направления относятся к будущему развитию Identity.

## 5. Finance

Finance DATA содержит шесть блоков:

1. Assets / Активы;
2. Actual income / Фактически заработанно;
3. Financial burden / Финансовая нагрузка;
4. Mandatory expenses / Обязательные траты;
5. Financial cushion / Финансовая подушка;
6. FSI 2.1 / Financial Stability Index.

Finance Main и Finance DATA являются разными пользовательскими поверхностями.

### Assets — IMPLEMENTED

Текущая реализация Assets использует:

- `source/domain/finance/assets/assets.js`;
- `source/memory/finance/assets.memory.js`;
- `source/presentation/finance/assets.statistics.js`.

Актив содержит стоимость и признак ликвидности:

- `liquid`;
- `illiquid`.

Общая стоимость активов рассчитывается отдельно от ликвидных и неликвидных активов.

### Financial burden — IMPLEMENTED

Финансовая нагрузка различает:

- `debt` — задолженность;
- `payment` — регулярный платёж.

Эти значения передаются в расчётный контур раздельно.

## 6. FSI 2.1 — IMPLEMENTED

Официальная терминология проекта:

**FSI 2.1 — Financial Stability Index.**

Расчёт находится в:

`source/index/finance/finance.index.js`

Текущая реализация:

- использует версию `2.1`;
- возвращает значение по шкале 0–100;
- определяет категорию;
- возвращает компоненты расчёта;
- возвращает диагностические показатели.

Текущая реализация использует данные об активах/ликвидности, фактическом доходе, обязательных расходах, платежах, задолженности, финансовой подушке и доступной истории для расчётных факторов.

Старое обозначение `IFS-1000` не является текущим состоянием.

## 7. Finance Presentation — IMPLEMENTED

`source/presentation/finance/finance.js` содержит:

- шесть DATA-подблоков;
- Assets;
- финансовые показатели;
- Financial Health;
- Capital;
- аналитику;
- диаграмму динамики;
- пользовательские операции с финансовыми записями;
- отображение FSI 2.1.

## 8. Memory и snapshots — IMPLEMENTED

Finance использует Memory и user-scoped persistence.

В репозитории присутствуют Finance migrations для пользовательского хранения и snapshots.

Конкретные расчёты и представления должны подтверждаться соответствующим кодом и тестами; этот документ не расширяет их сверх фактической реализации.

## 9. Design System — CURRENT

Design System находится в `source/design/` и разделена на:

- tokens;
- foundation;
- components;
- patterns;
- themes.

Фактическая визуальная база проекта:

- dark-first;
- чёрные/графитовые поверхности;
- светлая типографика;
- дозированный оранжевый акцент;
- тонкие границы;
- сдержанные градиенты;
- минимальный визуальный шум;
- системный премиальный характер.

## 10. Security — CURRENT / SEPARATE CONTRACT

Security является архитектурной частью проекта.

Отдельно существуют:

- `SECURITY_ARCHITECTURE.md`;
- `THREAT_MODEL.md`.

Security-документы являются отдельными security-контрактами. Их текущая редакция синхронизирована с фактическим состоянием Identity и security boundary; архитектурные требования, не подтверждённые реализацией, явно отделены от CURRENT.

## 11. Security Test Suite — CURRENT

Создан нормативный контур `docs/security/test.security/`:

- `README.md` — назначение и правила результатов;
- `test-plan.md` — порядок полного Security-теста;
- `test-manifest.md` — карта Security-проверок.

Контур предназначен для воспроизводимого Security-аудита и отделяет проведение тестов от исправления найденных проблем.

## 12. Исторические документы

Исторические Change-файлы сохраняются и не являются источником CURRENT без дополнительной проверки.

Предыдущие версии `docs/project-state.md` не являются текущим состоянием после этого аудита.

## 13. Связь документации

- `docs/agent.md` — только правила;
- `docs/fixed-version-project.md` — полный BASELINE;
- `docs/project-state.md` — CURRENT;
- `docs/changes/` — история;
- `docs/sessions/` — контекст сессий.

**Статус документа: CURRENT.**
