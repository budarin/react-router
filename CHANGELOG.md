# История изменений

Все значимые изменения в проекте описываются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версионирование — [Semantic Versioning](https://semver.org/lang/ru/).

## [1.4.1] - 2025-02-01

### Добавлено

- **ESLint** (flat config) в проекте: `eslint`, `@eslint/js`, `typescript-eslint`, `globals`. Скрипт `lint` запускает `eslint .` и `prettier --check .`.

### Документация

- **README:** явно указано, что `configureRoute` предназначен для однократного вызова при старте приложения; повторная смена конфига в рантайме не поддерживается (внутренние кэши и состояние не сбрасываются).

### Изменено

- **package.json:** заполнен `description` для npm.
- **tsconfig.json:** в `include` оставлен только `src` (убран несуществующий `samples`).
- **Тесты:** уточнён тест initialLocation (SSR) — в jsdom есть `window`, поэтому `initialLocation` не применяется; проверяется приём конфига и дефолтный снимок.

## [1.4.0] - 2025-02-01

### Изменено (Breaking)

- **Переименование API:** все сущности с именем «Router» заменены на «Route» (приведение к названию пакета use-route).
    - `configureRouter` → **`configureRoute`**
    - `getRouterConfig` → **`getRouteConfig`** (внутренний)
    - `clearRouterCaches` → **`clearRouteCaches`**
    - тип `RouterState` → **`RouteState`**
    - тип `RouterConfig` → **`RouteConfig`**
- В демо компонент `Router` переименован в **`RouteView`**.

### Миграция

Замените в коде вызовы и импорты:

- `configureRouter({ ... })` → `configureRoute({ ... })`
- `clearRouterCaches()` → `clearRouteCaches()`
- при использовании типов: `RouterState` → `RouteState`, `RouterConfig` → `RouteConfig`

## [1.3.4] - 2025-02-01

### Изменено

- **Оптимизация производительности:** все методы навигации (`navigate`, `back`, `forward`, `go`, `replace`, `updateState`, `canGoBack`, `canGoForward`) теперь создаются **один раз глобально** вместо создания в каждом компоненте. При 50 компонентах с `useRoute()` экономия ~400 `useCallback` вызовов. Методы кэшируются по `effectiveBase` и переиспользуются между компонентами.
- **Глобальное хранилище состояния:** `sharedSnapshot` теперь всегда валиден и не очищается при отписке последнего подписчика. Методы читают актуальный snapshot без дополнительных вычислений (O(1)).
- **Упрощение кода:** удалён fallback на старое API (`window.location`, `window.history.pushState/replaceState`) для браузеров без Navigation API. Хук строго требует Navigation API в браузере; без него возвращает дефолтное состояние и методы работают в режиме no-op. SSR поддержка через `initialLocation` сохранена.

### Удалено

- **Fallback на window.location/history:** в браузере без Navigation API хук больше не использует `window.location.href` для получения pathname и `window.history` для навигации. Вместо этого возвращается `DEFAULT_SNAPSHOT` (pathname: '/', searchParams: empty), методы навигации — no-op.

## [1.3.3] - 2025-02-01

### Изменено

- **useRoute:** в зависимостях финального `useMemo` вместо перечисления полей `routeState` (location, pathname, searchParams, params, historyIndex, state, matched) используется один объект `routeState`. Поведение не меняется: ссылка на `routeState` обновляется только при изменении этих данных.

## [1.3.2] - 2025-01-31

### Добавлено

- **state в возвращаемом объекте хука:** хук возвращает поле **`state`** — state текущей записи истории (из `navigation.currentEntry.getState()` при наличии Navigation API, иначе `history.state`). Установка state при навигации — через `navigate(to, { state })` и `replace(to, { state })`.
- **`updateState(state)`:** обновление state текущей записи истории без навигации (Navigation API `updateCurrentEntry` / fallback `history.replaceState`). Подписчики получают новый state.

## [1.3.1] - 2025-01-30

### Документация

Внесены не значимые правки в документацию.

## [1.3.0] - 2025-01-30

### Изменено

- **Same-document навигация:** при вызове `navigation.navigate()` для same-origin переходы больше не вызывают полную перезагрузку страницы. Добавлен перехват события `navigate` и вызов `event.intercept()` для same-origin — по спецификации Navigation API для SPA.

### Документация

- README обновлён: описание через Navigation API и `intercept()`, требование **Navigation API и URLPattern**, раздел «Под капотом», state через `currentEntry.getState()`.

## [1.1.1] - 2025-01-30

### Добавлено

- **section** в `UseRouteOptions`: путь подраздела под глобальным base (например `/dashboard`). `pathname` возвращается без этого префикса; `navigate(to)` добавляет глобальный base + section. Комбинируется с `configureRoute.base`, не заменяет его.
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
- `configureRoute(options)`: глобальные `base`, `logger`, `initialLocation` (SSR).
- Интеграция с Navigation API; запасной вариант для старых окружений.
