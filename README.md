# @budarin/react-router

**Минимум кода. Максимум SPA-навигации.**

Инфраструктурный хук для React на **Navigation API** + **URLPattern**. Без провайдеров, без контекста, без бизнес-логики.

[![npm](https://img.shields.io/npm/v/@budarin/react-router?color=cb0000)](https://www.npmjs.com/package/@budarin/react-router)
[![npm](https://img.shields.io/npm/dt/@budarin/react-router)](https://www.npmjs.com/package/@budarin/react-router)
[![bundle](https://img.shields.io/bundlephobia/minzip/@budarin/react-router)](https://bundlephobia.com/result?p=@budarin/react-router)
[![GitHub](https://img.shields.io/github/license/budarin/the-router)](https://github.com/budarin/the-router)

## ✨ Особенности

- ✅ **Navigation API** (`window.navigation.navigate()`, `traverseTo()`, `back/forward/go(n)`)
- ✅ **URLPattern** для парсинга `:params` (только актуальные браузеры)
- ✅ `useSyncExternalStore` — concurrent-safe, SSR-ready
- ✅ `canGoBack(n)`, `canGoForward(n)` — точная проверка по истории
- ✅ **LRU кэш URL** с настраиваемым лимитом (по умолчанию 50)
- ✅ **O(1) поиск** `historyIndex` через Map
- ✅ **Только актуальные браузеры** (Navigation API + URLPattern), без fallback
- ✅ **0 провайдеров** — просто `useRouter()`
- ✅ **~1.2kB** gzipped

## 🚀 Быстрый старт

```bash
npm i @budarin/react-router
```

```typescript
import { useRouter, configureRouter } from '@budarin/react-router';


function App() {
    const {
        pathname,
        params,
        searchParams,
        navigate,
        go,
        canGoBack
    } = useRouter('/users/:id'); // опционально: паттерн для парсинга params

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

### `useRouter(pattern?: string)`

**Возвращает:**

```typescript
{
    // Текущее состояние
    location: string;
    pathname: string;
    searchParams: URLSearchParams; // только чтение, не мутировать
    params: Record<string, string>;
    historyIndex: number;
    matched?: boolean; // true/false при переданном pattern, иначе undefined

    // Навигация
    navigate: (to: string | URL, options?) => Promise<void>; // резолвится при commit, см. Navigation API
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
    history?: 'push' | 'replace' | 'auto'; // по умолчанию из configureRouter или 'auto'
    state?: unknown;
}
```

**`configureRouter(config)`** — глобальная настройка один раз при старте приложения:

```typescript
configureRouter({
    urlCacheLimit: 50, // лимит LRU-кэша URL (по умолчанию 50)
    defaultHistory: 'replace', // history по умолчанию для всех navigate() (по умолчанию 'auto')
});
```

**`pattern` (опционально):** строка-шаблон пути (нативный **URLPattern**). `:name` — захват сегмента в `params` (только буквы, цифры, `_`). `*` — wildcard, в `params` не попадает.

```typescript
useRouter('/users/:id');
useRouter('/elements/:elementId/*/:subsubId'); // * обрабатывается URLPattern
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
const { params, navigate } = useRouter('/users/:id');

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
const { searchParams, navigate } = useRouter('/posts');

// Query параметры из search params
const page = searchParams.get('page') || '1';

// Навигация с search params
<button onClick={() => navigate('/posts?page=2')}>
    Next Page
</button>
```

## ⚙️ Установка

```bash
npm i @budarin/react-router

# или

yarn add @budarin/react-router
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

Роутер рассчитан только на эти версии, fallback на History API нет.

## 🎛 Под капотом

- `useSyncExternalStore` на navigation события (`navigate`, `currententrychange`)
- LRU кэш parsed URL (настраиваемый лимит)
- Map для O(1) поиска `historyIndex`
- URLPattern для `:params`
- Кэш compiled patterns; `clearRouterCaches()` — очистка кэшей (тесты, смена окружения)
- SSR-safe (checks `typeof window`)

## 🤝 Лицензия

MIT © budarin
