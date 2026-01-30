# История изменений

Все значимые изменения в проекте описываются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версионирование — [Semantic Versioning](https://semver.org/lang/ru/).

## [1.3.0] - 2025-01-30

### Изменено

- **Same-document навигация:** при вызове `navigation.navigate()` для same-origin переходы больше не вызывают полную перезагрузку страницы. Добавлен перехват события `navigate` и вызов `event.intercept()` для same-origin — по спецификации Navigation API для SPA.

### Документация

- README обновлён: описание через Navigation API и `intercept()`, требование **Navigation API и URLPattern**, раздел «Под капотом», state через `currentEntry.getState()`.

## [1.1.1] - 2025-01-30

### Добавлено

- **section** в `UseRouteOptions`: путь подраздела под глобальным base (например `/dashboard`). `pathname` возвращается без этого префикса; `navigate(to)` добавляет глобальный base + section. Комбинируется с `configureRouter.base`, не заменяет его.
- **section** и **base** в `NavigateOptions`: переопределение section или полного base для одного перехода (например `navigate('/', { section: '' })` — в корень приложения, `navigate('/login', { base: '' })` — путь вне приложения).
- Демо-приложение в `demo/` (Vite + React): примеры section, base, push/replace, свой matcher.
- CI (GitHub Actions): проверка форматирования, типов, тесты и сборка при push в `master`.

### Изменено

- Эффективный base для маршрута при `useRoute({ section })` теперь `combineBases(globalBase, section)`; глобальный base больше не отбрасывается при заданном section.
- Формулировки в README и демо: единый термин **section** (убраны «префикс» и «локальный base» в тексте для пользователя).

## [1.0.0] - 2024-12-01

### Добавлено

- Первый релиз.
- Хук `useRoute(options?)`: `pathname`, `searchParams`, `navigate`, `replace`, `back`, `forward`, `canGoBack`, `canGoForward`, `state`, опционально `pattern` и параметры URL.
- `configureRouter(options)`: глобальные `base`, `logger`, `initialLocation` (SSR).
- Интеграция с Navigation API; запасной вариант для старых окружений.
