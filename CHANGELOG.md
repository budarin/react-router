# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.5.0] - 2026-02-11

### Added

- **UseRouteOptions.patternOptions:** optional object passed to the URLPattern constructor when `pattern` is a string. `ignoreCase?: boolean` enables case-insensitive pathname matching. Exported type `PatternOptions`. Not used when `pattern` is a PathMatcher.
- **README:** documented `patternOptions` and `ignoreCase` in the hook options.

## [1.4.23] - 2026-02-11

### Documentation

- **README:** added an English version and a link to the Russian README on GitHub.

## [1.4.18] - 2026-02-03

### Changed

- **NavigateOptions:** to clear `base` or `section` in a single `navigate` / `replace` call you can now pass any falsy value: `''`, `null`, `false` or `undefined` (when the key is present). The types of `base` and `section` were extended to `string | null | false`. The logic now distinguishes between “key is not provided” (current `effectiveBase` is used) and “key is provided with a falsy value” (prefix is cleared for this call).
- **README, JSDoc:** updated description of `base` and `section` options in `NavigateOptions`.

### Added

- **Tests:** coverage for clearing prefix via `base: null`, `base: false` and via `section: null`, `section: false`, `section: undefined`.

## [1.4.17] - 2026-02-03

### Documentation

- **README:** text tweaks.

## [1.4.10] - 2026-02-03

### Documentation

- **README:** highlighted an important property of this hook — correct behavior with concurrent rendering in React 18+. Not many popular routers and hooks guarantee this.

## [1.4.10] - 2026-02-02

### Changed

- **types:** redefined `Logger` type – removed the `trace` method.
- **README:** documented the logger changes.

## [1.4.9] - 2026-02-02

### Added

- **demo folder:** `demo` directory is now excluded from the published package.

## [1.4.8] - 2026-02-02

### Documentation

- **README:** clarified the minimal supported React version.

## [1.4.6] - 2026-02-02

### Added

- **Testing utility:** `@budarin/use-route/testing` with `setupTestNavigation({ initialUrl })` for easy jsdom setup in tests (Navigation API + URL emulation for `useRoute`). Some internal tests were migrated to use this helper.

## [1.4.5] - 2026-02-02

### Documentation

- **README:** clarified the positioning of the hook, its purpose and how it differs from full‑featured routers; added usage scenarios when `useRoute` is used as a headless navigation layer.

## [1.4.1] - 2025-02-01

### Added

- **ESLint** (flat config) in the project: `eslint`, `@eslint/js`, `typescript-eslint`, `globals`. The `lint` script runs `eslint .` and `prettier --check .`.

### Documentation

- **README:** explicitly states that `configureRoute` is intended to be called once at application startup; changing the config at runtime is not supported (internal caches and state are not reset).

### Changed

- **package.json:** filled the `description` field for npm.
- **tsconfig.json:** `include` now contains only `src` (removed non‑existent `samples`).
- **Tests:** refined the `initialLocation` (SSR) test — in jsdom `window` exists, so `initialLocation` is not applied; the test checks config acceptance and the default snapshot.

## [1.4.0] - 2025-02-01

### Changed (Breaking)

- **API renaming:** all entities named “Router” were renamed to “Route” (aligned with the package name `use-route`):
    - `configureRouter` → **`configureRoute`**
    - `getRouterConfig` → **`getRouteConfig`** (internal)
    - `clearRouterCaches` → **`clearRouteCaches`**
    - type `RouterState` → **`RouteState`**
    - type `RouterConfig` → **`RouteConfig`**
- In the demo, the `Router` component was renamed to **`RouteView`**.

### Migration

Replace the following calls and imports in your code:

- `configureRouter({ ... })` → `configureRoute({ ... })`
- `clearRouterCaches()` → `clearRouteCaches()`
- For types: `RouterState` → `RouteState`, `RouterConfig` → `RouteConfig`

## [1.3.4] - 2025-02-01

### Changed

- **Performance optimizations:** all navigation methods (`navigate`, `back`, `forward`, `go`, `replace`, `updateState`, `canGoBack`, `canGoForward`) are now created **once globally** instead of per component. With 50 components using `useRoute()` this saves roughly 400 `useCallback` calls. Methods are cached by `effectiveBase` and reused across components.
- **Global state store:** `sharedSnapshot` is now always valid and is not cleared when the last subscriber unsubscribes. Methods read the current snapshot without extra computation (O(1)).
- **Code simplification:** removed the fallback to the legacy API (`window.location`, `window.history.pushState/replaceState`) for browsers without Navigation API. The hook now strictly requires the Navigation API; otherwise it returns a default snapshot and navigation methods become no‑ops. SSR support via `initialLocation` is preserved.

### Removed

- **Fallback to `window.location` / `history`:** in browsers without Navigation API the hook no longer uses `window.location.href` or `window.history` for navigation. Instead it returns `DEFAULT_SNAPSHOT` (pathname `'/'`, empty `searchParams`) and no‑op navigation methods.

## [1.3.3] - 2025-02-01

### Changed

- **useRoute:** the final `useMemo` now depends on the single `routeState` object instead of listing individual fields (location, pathname, searchParams, params, historyIndex, state, matched). Behavior is unchanged: the `routeState` reference updates only when these data change.

## [1.3.2] - 2025-01-31

### Added

- **`state` in the hook result:** the hook now returns a `state` field – the state of the current history entry (`navigation.currentEntry.getState()` with the Navigation API, otherwise `history.state`). State can be set via `navigate(to, { state })` and `replace(to, { state })`.
- **`updateState(state)`:** updates the state of the current history entry without navigation (Navigation API `updateCurrentEntry` / fallback `history.replaceState`). Subscribers receive the updated state.

## [1.3.1] - 2025-01-30

### Documentation

- Minor documentation updates.

## [1.3.0] - 2025-01-30

### Changed

- **Same‑document navigation:** calling `navigation.navigate()` for same‑origin transitions no longer triggers a full page reload. Added `navigate` event interception and `event.intercept()` for same‑origin navigations, following the Navigation API spec for SPAs.

### Documentation

- **README:** updated to describe Navigation API and `intercept()`, the requirement for **Navigation API and URLPattern**, an “Under the hood” section, and `state` access via `currentEntry.getState()`.

## [1.1.1] - 2025-01-30

### Added

- **`section` in `UseRouteOptions`:** sub‑path under the global base (e.g. `/dashboard`). The returned `pathname` is without this prefix; `navigate(to)` adds global base + section. Combines with `configureRoute.base` instead of replacing it.
- **`section` and `base` in `NavigateOptions`:** override the section or full base for a single navigation (e.g. `navigate('/', { section: '' })` – to the app root, `navigate('/login', { base: '' })` – outside the app).
- **Demo app** in `demo/` (Vite + React): examples of `section`, `base`, push/replace, custom matcher.
- **CI (GitHub Actions):** formatting, type‑checking, tests and build on push to `master`.

### Changed

- Effective base for routes created via `useRoute({ section })` now uses `combineBases(globalBase, section)`; the global base is no longer discarded when a section is provided.
- Wording in README and demo unified around the term **section** (removed “prefix” and “local base” from user‑facing text).

## [1.0.0] - 2024-12-01

### Added

- Initial release.
- Hook `useRoute(options?)`: `pathname`, `searchParams`, `navigate`, `replace`, `back`, `forward`, `canGoBack`, `canGoForward`, `state`, and optional `pattern` with route params.
- `configureRoute(options)`: global `base`, `logger`, `initialLocation` (SSR).
- Integration with the Navigation API; legacy fallback for older environments.
