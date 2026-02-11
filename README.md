@budarin/use-route

Russian version: [README.ru.md](https://github.com/budarin/use-route/blob/master/README.ru.md)

---

## Overview

`@budarin/use-route` is an **infrastructure hook for React 18+ and TypeScript** built on top of the **Navigation API** and **URLPattern**.

It gives you:

- **Headless routing layer** – the hook is only responsible for URL and browser history. What to render, how to fetch data, guards, redirects, layouts etc. live in your application code.
- **Modern React‑first design** – works correctly with concurrent rendering in React 18+.
- **Base for your own navigation components** – build any `<Link>`, `<Route>`‑like components and layouts on top of `useRoute()` without being locked into someone else’s router.

No providers, no context, no built‑in business logic – just a small, efficient hook.

Badges and more documentation in Russian are available in `README.ru.md`.

## When to use (and when not)

Use this package if:

- **You want a clean architecture** and see routing as an infrastructure detail.
- **You need dynamic routes and dynamic history** that are decided at runtime.
- **You prefer to control what is rendered** based on `pathname` / `params` instead of a declarative `<Routes>` tree.
- **You want a headless navigation layer** and are ready to build your own UI components around it.

Do **not** use this package if:

- You must support **old browsers** without Navigation API or URLPattern.
- You want a router with **built‑in loaders / data fetching** and opinionated nesting.
- You rely on **declarative `<Route>` trees**, built‑in guards, redirects, lazy‑routes etc. – then a full‑featured router like React Router or TanStack Router is a better fit.

## Installation

```bash
npm i @budarin/use-route

pnpm add @budarin/use-route

yarn add @budarin/use-route
```

TypeScript types are built‑in.

Recommended `tsconfig.json` fragment:

```json
{
    "compilerOptions": {
        "lib": ["ES2021", "DOM", "DOM.Iterable"],
        "moduleResolution": "bundler",
        "jsx": "react-jsx"
    }
}
```

## Quick start

```tsx
import { useRoute, configureRoute } from '@budarin/use-route';

configureRoute({
    urlCacheLimit: 50,
    defaultHistory: 'replace',
    base: '/app'
});

function App() {
    const {
        pathname,
        params,
        searchParams,
        navigate,
        go,
        canGoBack
    } = useRoute('/users/:id');

    return (
        <div>
            <h1>Current: {pathname}</h1>
            <p>User ID: {params.id}</p>

            <button type="button" onClick={() => navigate('/users/123')}>
                To profile
            </button>

            <button type="button" onClick={() => go(-1)} disabled={!canGoBack()}>
                ← Back
            </button>
        </div>
    );
}
```

## API (short version)

### `useRoute(pattern?: string | PathMatcher, options?: UseRouteOptions)`

Hook for reading the current location and performing navigation.

Supported call forms:

- `useRoute()` – no pattern, no options.
- `useRoute(pattern)` – only pattern (string with URLPattern syntax or a custom `PathMatcher`).
- `useRoute(pattern, options)` – pattern + options.
- `useRoute({ section: '/dashboard' })` – only options (section under global base, pathname/navigate relative to section).

**Parameters**

- `pattern` (optional):
  - string with **URLPattern** syntax, supporting:
    - named params: `:id`
    - optional groups: `{/posts/:postId}?`
    - wildcard: `*`
    - regexp inside param: `:year(\\d+)`
  - or custom **PathMatcher** function:
    - `(pathname: string) => { matched: boolean; params: Record<string, string> }`

- `options` (optional):
  - `section`: sub‑path under global base (e.g. `/dashboard`).

**Returns**

```ts
{
    // current state
    location: string;
    pathname: string;
    searchParams: URLSearchParams;
    params: Record<string, string>;
    historyIndex: number;
    state?: unknown;
    matched?: boolean;

    // navigation
    navigate: (to: string | URL, options?) => Promise<void>;
    back: () => void;
    forward: () => void;
    go: (delta: number) => void;
    replace: (to: string | URL, options?) => Promise<void>;
    updateState: (state: unknown) => void;
    canGoBack: (steps?: number) => boolean;
    canGoForward: (steps?: number) => boolean;
}
```

### `configureRoute(config)`

Global one‑time configuration, typically called at application startup:

```ts
configureRoute({
    urlCacheLimit?: number,
    defaultHistory?: 'auto' | 'push' | 'replace',
    logger?: Logger,
    base?: string,
    initialLocation?: string
});
```

- `base` – base path when the app is hosted under a sub‑path, e.g. `/app`.
- `initialLocation` – for SSR; pass the request URL before server render.

### `clearRouteCaches()`

Helper for tests and environment switches – clears internal caches.

## Examples

### Basic navigation

```tsx
import { useRoute } from '@budarin/use-route';

export function BasicNavigationExample() {
    const { pathname, navigate } = useRoute();

    return (
        <div>
            <p>Current path: {pathname}</p>
            <button type="button" onClick={() => navigate('/posts')}>
                To posts
            </button>
            <button type="button" onClick={() => navigate('/')}>
                Home
            </button>
        </div>
    );
}
```

### Params (`/users/:id`)

```tsx
import { useRoute } from '@budarin/use-route';

export function ParamsExample() {
    const { params, pathname, navigate } = useRoute('/users/:id');

    return (
        <div>
            <p>Pathname: {pathname}</p>
            <p>User ID from params: {params.id ?? '—'}</p>
            <button type="button" onClick={() => navigate('/users/123')}>
                User 123
            </button>
            <button type="button" onClick={() => navigate('/users/456')}>
                User 456
            </button>
        </div>
    );
}
```

### Search params (query string)

```tsx
import { useRoute } from '@budarin/use-route';

export function SearchParamsExample() {
    const { searchParams, navigate, pathname } = useRoute('/posts');
    const pageParam = searchParams.get('page') ?? '1';
    const currentPage = Number.parseInt(pageParam, 10) || 1;

    return (
        <div>
            <p>Path: {pathname}</p>
            <p>Page: {currentPage}</p>
            <button
                type="button"
                onClick={() => navigate(`/posts?page=${currentPage - 1}`)}
                disabled={currentPage <= 1}
            >
                Prev page
            </button>
            <button type="button" onClick={() => navigate(`/posts?page=${currentPage + 1}`)}>
                Next page
            </button>
        </div>
    );
}
```

### History helpers

```tsx
import { useRoute } from '@budarin/use-route';

export function HistoryExample() {
    const { go, back, forward, canGoBack, canGoForward } = useRoute();

    return (
        <div>
            <button type="button" onClick={() => back()} disabled={!canGoBack()}>
                ← Back
            </button>
            <button type="button" onClick={() => go(-2)} disabled={!canGoBack(2)}>
                ← 2 steps
            </button>
            <button type="button" onClick={() => go(1)} disabled={!canGoForward()}>
                Forward →
            </button>
            <button type="button" onClick={() => forward()} disabled={!canGoForward()}>
                Forward
            </button>
        </div>
    );
}
```

### Link component (example)

```tsx
import { useRoute } from '@budarin/use-route';
import { useCallback, type ComponentPropsWithoutRef } from 'react';

interface LinkProps extends ComponentPropsWithoutRef<'a'> {
    to: string;
    replace?: boolean;
}

export function Link({ to, replace = false, onClick, ...props }: LinkProps) {
    const { navigate } = useRoute();

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            onClick?.(e);

            if (!e.defaultPrevented) {
                e.preventDefault();
                navigate(to, { history: replace ? 'replace' : 'push' });
            }
        },
        [navigate, to, replace, onClick]
    );

    return <a {...props} href={to} onClick={handleClick} />;
}
```

## Testing helper

For unit tests in jsdom there is a helper `setupTestNavigation` from the `@budarin/use-route/testing` entrypoint.

```ts
import { beforeEach, afterEach, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRoute } from '@budarin/use-route';
import { setupTestNavigation } from '@budarin/use-route/testing';

let restoreNavigation: () => void;

beforeEach(() => {
    restoreNavigation = setupTestNavigation({ initialUrl: 'http://localhost/users/123' });
});

afterEach(() => {
    restoreNavigation();
});

it('reads pathname and params from Navigation API', () => {
    const { result } = renderHook(() => useRoute('/users/:id'));
    expect(result.current.pathname).toBe('/users/123');
    expect(result.current.params).toEqual({ id: '123' });
});
```

## React and browser support

- **React:** designed for **React 18+** (`useSyncExternalStore`, concurrent rendering).
- **Browsers / Node.js:** requires **Navigation API** and **URLPattern**.

| API            | Chrome/Edge | Firefox | Safari | Node.js |
| -------------- | ----------- | ------- | ------ | ------- |
| Navigation API | 102+        | 109+    | 16.4+  | —       |
| URLPattern     | 110+        | 115+    | 16.4+  | 23.8+   |

## Under the hood (high level)

- Navigation API subscription (`navigate`, `currententrychange`), same‑origin interception via `event.intercept()`.
- `useSyncExternalStore` for concurrent‑safe subscriptions.
- O(1) search for `historyIndex`.
- LRU cache for parsed URLs and compiled patterns.
- SSR‑safe checks for `window`.

## License

MIT © budarin
