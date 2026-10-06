<!-- docs/changes/6.10.2026/Изменение - актуализация Security docs (11:51:38)-время.md -->

# Изменение - актуализация Security docs

**Дата:** 6.10.2026  
**Время:** 11:51:38 MSK (UTC+03:00)

## Пользовательский запрос

Провести отдельный аудит Security-документации и после согласования синхронизировать её с фактическим состоянием проекта.

## Изменённые файлы

### SECURITY_ARCHITECTURE.md
- Версия: 1.0 → 1.1.
- Добавлен актуальный архитектурный `index/`.
- Уточнено, что текущая Identity-реализация использует Supabase Auth.
- Разделены текущая реализация и целевая security-архитектура.
- Application-level encryption, envelope encryption и key management обозначены как PLANNED.
- Password recovery и post-reset session security обозначены как PLANNED / REQUIRES VERIFICATION.
- Rate limiting отделён от обработки provider rate-limit ошибок.
- Удалён устаревший плановый раздел о следующем шаге реализации и заменён фактическим Current Security State.
- Уточнено, что roadmap не является доказательством реализации.

### THREAT_MODEL.md
- Версия: 1.0 → 1.1.
- Уточнено назначение документа как threat/security contract, а не инвентаризация реализованных функций.
- Уточнено значение `V1`: обязательное требование, а не факт реализации.
- Добавлен текущий security implementation boundary.
- Отдельно перечислены PLANNED / REQUIRES VERIFICATION security controls.
- Сохранена существующая модель угроз и матрица рисков.

## Архитектурные решения

1. Security Architecture остаётся нормативным архитектурным контрактом, а не заменой `docs/project-state.md`.
2. Threat Model описывает угрозы и требуемые controls; наличие threat/control в документе не означает его реализации.
3. Фактический статус security-функций подтверждается кодом и тестами.
4. Application-level encryption, envelope encryption, key management, custom session/device management и расширенные security controls не считаются реализованными без отдельного подтверждения.
5. `index/` является частью актуальной архитектуры LifeGame.

## Причина

Security-документы содержали актуальные архитектурные решения, но часть текста и roadmap уже не соответствовала текущему этапу Identity-разработки. Требовалось устранить двусмысленность между архитектурным требованием и реализованной функциональностью.

## Итоговый статус

**CURRENT** — Security-документация синхронизирована с подтверждённым текущим состоянием и явно отделяет IMPLEMENTED, PLANNED и REQUIRES VERIFICATION.

Изменения коду приложения, базе данных и security implementation не вносились.