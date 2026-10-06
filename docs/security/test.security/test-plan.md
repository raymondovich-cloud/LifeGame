<!-- docs/security/test.security/test-plan.md — Version 1.0 -->

# LifeGame — Security Test Plan

**Status:** CURRENT

Полный Security-тест проверяет UI, Identity, авторизацию, RLS, инфраструктуру, репозиторий и соответствие Security-контрактам.

## Порядок

1. Подготовка: ветка, commit, окружение, тестовые аккаунты, область и ограничения.
2. Static Security: secrets, dependencies, configuration, опасные паттерны и архитектурные границы.
3. Authentication: registration, login, verification, resend, logout, session, recovery и abuse protection.
4. Authorization: cross-user isolation, client userId manipulation, RLS и системные границы.
5. Web Security: XSS, CSRF, CORS, headers, URL manipulation, validation, storage и leakage.
6. Infrastructure: Supabase, grants/policies, migrations, public/private resources, deployment и CI/CD.
7. Threat Model regression: сверка фактического состояния с `SECURITY_ARCHITECTURE.md` и `THREAT_MODEL.md`.
8. Анализ: каждый FAIL/WARNING получает ID, severity, компонент, шаги, expected/actual, evidence, impact и recommendation.

Если условие отсутствует, результатом является NOT TESTED или REQUIRES VERIFICATION, а не предполагаемый PASS.

## Уровни воздействия

SAFE — статический анализ, dependency audit, конфигурация, миграции, документация и read-only проверки.

CONTROLLED — authentication, authorization, RLS, rate-limit, headers, controlled malicious input и session tests только в ограниченном окружении.

DESTRUCTIVE — удаление данных, destructive database operations, массовые операции аккаунтов, destructive migrations и нагрузочные атаки. Автоматически не выполнять.

## Критерии завершения

Полный тест завершён только после обработки всех обязательных применимых проверок manifest, присвоения результата каждому тесту, явной фиксации непройденных проверок, выделения критических/высоких проблем и сверки с Security-контрактами.

Если обязательная проверка не выполнена, аудит нельзя выдавать как полностью успешный.

## Граница ответственности

Security Test Suite не изменяет автоматически бизнес-логику, архитектуру, базу данных, Security implementation, UI или production-конфигурацию. Исправление выполняется отдельной согласованной задачей.