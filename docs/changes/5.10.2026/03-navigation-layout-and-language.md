# UI-исправление нижней навигации

Дата: 5.10.2026

## Изменено

- Нижняя навигация закреплена на 4 равных колонках для гостевого и авторизованного состояния.
- Четвёртый слот больше не переносится на отдельную строку.
- Названия всех четырёх пунктов унифицированы на английском:
  - Finance
  - Health
  - Development
  - Authorization для гостя
  - Profile для авторизованного пользователя
- Логика переключения Authorization ↔ Profile сохранена без изменений.
- Auth, Finance Memory и бизнес-логика не изменялись.

## Изменённые файлы

- `source/application/navigation/navigation.js`: Version 1.4 → 1.5
- `source/design/components/navigation.css`: Version 1.8 → 1.9

## Проверка

Необходимо проверить на мобильной ширине:

1. Гость видит Finance | Health | Development | Authorization в одной строке.
2. Authorization не переносится ниже.
3. После входа последний пункт становится Profile.
4. После logout снова появляется Authorization.
