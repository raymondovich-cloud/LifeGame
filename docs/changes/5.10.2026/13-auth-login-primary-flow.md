# Изменение авторизации — Login как основной сценарий

Дата и время: 05.10.2026 19:14 (Москва)

## Изменено

- Страница Authorization теперь открывает Login по умолчанию.
- Поля Email и Password отображаются сразу.
- Основная кнопка действия — Log in.
- Регистрация перенесена в отдельное вторичное действие ниже формы: “Don't have an account?” → “Create account”.
- Переход Login → Create account сохранён.
- Переход Create account → Log in сохранён.
- Identity, Application, Supabase и session lifecycle не изменялись.
- Добавлена адаптивная стилизация вторичного действия регистрации.

## Архитектурная граница

Изменения ограничены Presentation и Web Composition/route orchestration. Авторизационная бизнес-логика и инфраструктурный Supabase adapter не затрагивались.

## Проверка

Проверено по исходному коду:

1. Route auth вызывает openLoginModal().
2. renderLogin() содержит Email, Password и основной Log in.
3. Create account вызывает существующий registration flow.
4. Registration сохраняет обратный переход в Login.
5. Authenticated flow продолжает использовать существующий handleAuthenticated().

## Одобрено

Пользователь согласовал изменение UX и дал команду на реализацию.

## Далее

- Проверить поведение на опубликованной GitHub Pages версии.
- Проверить Login → Create account → Login.
- Проверить успешный Login и переход в authenticated Finance/Profile state.
- Не изменять auth lifecycle без отдельного согласования.
