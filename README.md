# QA.GURU API Testing Project

Этот проект представляет собой автоматизированное тестирование API с использованием Playwright. Проект содержит набор тестов для проверки функциональности REST API, включая создание, чтение, обновление и удаление задач (todos).

## 🛠 Технологии
- Playwright - фреймворк для автоматизированного тестирования
- JavaScript (ES Modules)
- Faker.js - для генерации тестовых данных

## 📋 Предварительные требования
- Node.js (v22.13.1 или выше)
- npm (Node Package Manager)


## 🚀 Запуск тестов
### Запуск всех тестов из файла api.spec.js
```bash
npx playwright test api.spec.js
```

### Запуск всех тестов из файла api.spec.js с UI интерфейсом
```bash
npx playwright test --ui api.spec.js
```

### Для просмотра отчета выполнения тестов:
```bash
npx playwright show-report
```

### Запуск отдельного теста
Тесты запускаются с помощью тегов @NN, где NN - номер теста
```bash
npx playwright test --grep @NN
```


## 📁 Структура проекта
```
QA.GURU_Repo/
├── specs/                    # Тестовые спецификации
│   └── api.spec.js          # API тесты
├── sources/                  # Дополнительные файлы для запуска тестов
│   ├── constURL/            # Константы и URL
│   └── helpers/             # Вспомогательные классы и функции
│       ├── todo.builder.js
│       ├── mandatoryFields.builder.js
│       └── requestUpdateTodos.builder.js
└── playwright.config.js      # Конфигурация Playwright
```

## 🔍 Тестовые сценарии

Проект включает тесты для следующих эндпоинтов API:
- GET /challenges
- GET /todos
- POST /todos
- PUT /todos/{id}
- HEAD /todos
etc.

**Дополнительные комментарии для проверяющего ДЗ:**
- в некоторых тестах выборочно перезапрашиваю обновленный список todos, чтобы удостовериться, что данные обновились корректно. включила такие доп.запросы в нестандартные тесты и в те, где обновляются >1 атрибута
- в наиболее сложных тестах добавила больше комментариев, чем в других