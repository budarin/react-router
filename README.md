# @budarin/the-router

**Минимум кода. Максимум SPA-навигации.**

Инфраструктурный хук для React на **Navigation API** + **URLPattern**. Без провайдеров, без контекста, без бизнес-логики.

[![npm](https://img.shields.io/npm/v/@budarin/the-router?color=cb0000)](https://www.npmjs.com/package/@budarin/the-router)
[![npm](https://img.shields.io/npm/dt/@budarin/the-router)](https://www.npmjs.com/package/@budarin/the-router)
[![bundle](https://img.shields.io/bundlephobia/minzip/@budarin/the-router)](https://bundlephobia.com/result?p=@budarin/the-router)
[![GitHub](https://img.shields.io/github/license/budarin/the-router)](https://github.com/budarin/the-router)

## ✨ Особенности

- ✅ **Navigation API** (`window.navigation.navigate()`, `traverseTo()`, `back/forward/go(n)`)
- ✅ **URLPattern** для парсинга `:params` (с fallback на RegExp)
- ✅ `useSyncExternalStore` — concurrent-safe, SSR-ready
- ✅ `canGoBack(n)`, `canGoForward(n)` — точная проверка по истории
- ✅ **LRU кэш URL** с настраиваемым лимитом (по умолчанию 50)
- ✅ **O(1) поиск** `historyIndex` через Map
- ✅ Fallback на History API для старых браузеров
- ✅ **0 провайдеров** — просто `useRouter()`
- ✅ **~1.2kB** gzipped

## 🚀 Быстрый старт

```bash
npm i @budarin/the-router
```

```typescript
import { useRouter, configureRouter } from '@budarin/the-router';


function App() {
    const {
        pathname,
        params,
        searchParams,
        navigate,
        go,
        canGoBack
    } = useRouter({
        // Опционально: известные роуты для автопарсинга params
        PROFILE: '/users/:id',
        POST: '/posts/:year/:slug'
    });

    return (
        <div>
            <h1>Current: {pathname}</h1>
            <p>User ID: {params.id}</p>

            <button onClick={() => navigate('/users/123')}>
                To Profile
            </button>

            <button onClick={() => go(-1)} disabled={!canGoBack()}>
                ← Back
            </button>
        </div>
    );
}
```

## 📖 API

### `useRouter(route?: Route)`

**Возвращает:**

```typescript
{
    // Текущее состояние
    location: string; // 'https://example.com/users/123?page=1'
    pathname: string; // '/users/123'
    searchParams: URLSearchParams; // ?page=1
    params: Record<string, string>; // { id: '123' }
    historyIndex: number; // 2 (или -1)

    // Навигация
    navigate: (to: string | URL, options?: NavigateOptions) => Promise<void>;
    back: () => void;
    forward: () => void;
    go: (delta: number) => void;
    replace: (to: string | URL, state?: unknown) => Promise<void>;
    canGoBack: (steps?: number) => boolean;
    canGoForward: (steps?: number) => boolean;
}
```

**Опции `navigate`:**

```typescript
{
    replace?: boolean;
    history?: 'push' | 'replace';
    state?: unknown;
}
```

**`route` (опционально):**

```typescript
'/users/:id',
```

## 🛠 Примеры

### 1. Базовая навигация

```typescript
const { navigate, pathname } = useRouter();

<button onClick={() => navigate('/posts')}>
    Posts
</button>
```

### 2. С параметрами

```typescript
const { params, navigate } = useRouter({
    USER: '/users/:id'
});

<h1>User: {params.id}</h1> // '123'
```

### 3. History API (go/back/forward)

```typescript
const { go, canGoBack, canGoForward } = useRouter();

<button onClick={() => go(-2)} disabled={!canGoBack(2)}>
    ← 2 steps back
</button>
<button onClick={() => go(1)} disabled={!canGoForward()}>
    1 step forward →
</button>
```

### 4. Search params

```typescript
const { searchParams, navigate } = useRouter({ POSTS: '/posts' });

// Query параметры из search params
const page = searchParams.get('page') || '1';

// Навигация с search params
<button onClick={() => navigate('/posts?page=2')}>
    Next Page
</button>
```

## ⚙️ Установка

```bash
npm i @budarin/the-router

# или

yarn add @budarin/the-router
```

TypeScript: типы включены.

**`tsconfig.json` (рекомендуется):**

```json
{
    "compilerOptions": {
        "lib": ["ES2021", "DOM", "DOM.Iterable"],
        "moduleResolution": "bundler",
        "jsx": "react-jsx"
    }
}
```

**Polyfills (опционально):**

```bash
npm i urlpattern-polyfill
```

```typescript
// src/polyfills.ts
import 'urlpattern-polyfill';
```

## 🌐 Браузеры

| API            | Chrome/Edge | Firefox | Safari |
| -------------- | ----------- | ------- | ------ |
| Navigation API | 102+        | 109+    | 16.4+  |
| URLPattern     | 110+        | 115+    | 16.4+  |

Fallback: History API работает везде.

## 🎛 Под капотом

- `useSyncExternalStore` на navigation события (`navigate`, `currententrychange`)
- LRU кэш parsed URL (настраиваемый лимит)
- Map для O(1) поиска `historyIndex`
- URLPattern / RegExp для `:params`
- Кэш compiled patterns
- SSR-safe (checks `typeof window`)

## 🤝 Лицензия

MIT © budarin
