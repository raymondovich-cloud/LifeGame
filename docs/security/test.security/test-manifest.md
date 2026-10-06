<!-- docs/security/test.security/test-manifest.md — Version 1.0 -->

# LifeGame — Security Test Manifest

**Status:** CURRENT

Manifest — карта актуальных Security-проверок. Каждая проверка имеет уникальный ID.

## Static Security

| ID | Проверка | Уровень | Статус |
|---|---|---|---|
| SEC-001 | Secrets / credentials scan | SAFE | CURRENT |
| SEC-002 | Dependency vulnerability audit | SAFE | CURRENT |
| SEC-003 | Environment/configuration exposure | SAFE | CURRENT |
| SEC-004 | Security-sensitive code patterns | SAFE | CURRENT |
| SEC-005 | Clean Architecture security boundaries | SAFE | CURRENT |
| SEC-006 | GitHub Actions security configuration | SAFE | CURRENT |

## Authentication

| ID | Проверка | Уровень | Статус |
|---|---|---|---|
| SEC-101 | Registration security flow | CONTROLLED | CURRENT |
| SEC-102 | Login success/failure handling | CONTROLLED | CURRENT |
| SEC-103 | Email verification | CONTROLLED | CURRENT |
| SEC-104 | Verification resend | CONTROLLED | CURRENT |
| SEC-105 | Logout/session invalidation | CONTROLLED | CURRENT |
| SEC-106 | Current-session isolation | CONTROLLED | CURRENT |
| SEC-107 | Password recovery | CONTROLLED | REQUIRES VERIFICATION |
| SEC-108 | Authentication abuse/rate limiting | CONTROLLED | REQUIRES VERIFICATION |

## Authorization

| ID | Проверка | Уровень | Статус |
|---|---|---|---|
| SEC-201 | Cross-user read isolation | CONTROLLED | CURRENT |
| SEC-202 | Cross-user update isolation | CONTROLLED | CURRENT |
| SEC-203 | Cross-user delete isolation | CONTROLLED | CURRENT |
| SEC-204 | Client userId manipulation | CONTROLLED | CURRENT |
| SEC-205 | PostgreSQL RLS enforcement | CONTROLLED | CURRENT |
| SEC-206 | System/private data boundary | CONTROLLED | CURRENT |

## Web Security

| ID | Проверка | Уровень | Статус |
|---|---|---|---|
| SEC-301 | Reflected/stored XSS | CONTROLLED | CURRENT |
| SEC-302 | DOM XSS | CONTROLLED | CURRENT |
| SEC-303 | CSRF exposure | CONTROLLED | REQUIRES VERIFICATION |
| SEC-304 | CORS policy | SAFE | CURRENT |
| SEC-305 | Security headers | SAFE | CURRENT |
| SEC-306 | URL/query manipulation | CONTROLLED | CURRENT |
| SEC-307 | Input validation | CONTROLLED | CURRENT |
| SEC-308 | Error/data leakage | CONTROLLED | CURRENT |
| SEC-309 | Browser storage exposure | CONTROLLED | CURRENT |
| SEC-310 | Frontend secret exposure | SAFE | CURRENT |

## Infrastructure

| ID | Проверка | Уровень | Статус |
|---|---|---|---|
| SEC-401 | Supabase security configuration | SAFE/CONTROLLED | CURRENT |
| SEC-402 | Database grants and policies | SAFE/CONTROLLED | CURRENT |
| SEC-403 | Migration security | SAFE | CURRENT |
| SEC-404 | Public/private resource exposure | SAFE/CONTROLLED | CURRENT |
| SEC-405 | Deployment security | SAFE | CURRENT |
| SEC-406 | CI/CD security | SAFE | CURRENT |

## Threat Model Regression

| ID | Проверка | Уровень | Статус |
|---|---|---|---|
| SEC-501 | Threat Model control coverage | SAFE | CURRENT |
| SEC-502 | Security Architecture consistency | SAFE | CURRENT |
| SEC-503 | Current-state consistency | SAFE | CURRENT |

## Правило расширения

Новая проверка получает уникальный ID и описывает цель, уровень воздействия, статус, условия, ожидаемый результат и способ фиксации evidence.

Статус CURRENT у записи означает, что проверка входит в актуальный набор тестов; он не доказывает, что соответствующая защитная функция уже реализована.