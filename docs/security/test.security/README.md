<!-- docs/security/test.security/README.md — Version 1.0 -->

# LifeGame Security Test Suite

**Status:** CURRENT

`test.security/` — нормативный контур тестирования безопасности LifeGame.

Команда «Запусти полный тест безопасности проекта» означает выполнение актуального набора проверок из `test-plan.md` и `test-manifest.md`.

Результаты: PASS, FAIL, WARNING, NOT TESTED, NOT APPLICABLE или REQUIRES VERIFICATION.

Проверки сверяются с `docs/agent.md`, фактическим кодом, тестами, `SECURITY_ARCHITECTURE.md`, `THREAT_MODEL.md` и `docs/project-state.md`. Планируемые требования не считаются реализованными до фактической проверки.

Уровни воздействия: SAFE, CONTROLLED и DESTRUCTIVE. Production не используется как полигон для destructive-тестов.

Полный аудит должен содержать дату/время, ревизию, охват, сводку результатов, severity найденных проблем, идентификаторы проваленных проверок, evidence, затронутые компоненты, рекомендации и ограничения.

Тестовый контур выявляет и классифицирует проблемы. Исправление выполняется отдельной согласованной задачей.