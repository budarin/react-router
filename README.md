# @budarin/react-router

**Минимум кода. Максимум SPA-навигации.**

Инфраструктурный хук для React на **Navigation API** + **URLPattern**. Без провайдеров, без контекста, без бизнес-логики.

**Для динамического дерева компонентов:** что рендерить определяется в рантайме по URL (`pathname`, `params`, `matched`), а не статичным деревом маршрутов (как в React Router / TanStack Router). История тоже формируется динамически: при каждом переходе можно выбрать `push` или `replace`. Подходит, когда маршруты зависят от ролей, фич, CMS или конфига с бэка.

[![npm](https://img.shields.io/npm/v/@budarin/react-router?color=cb0000)](https://www.npmjs.com/package/@budarin/react-router)
[![npm](https://img.shields.io/npm/dt/@budarin/react-router)](https://www.npmjs.com/package/@budarin/react-router)
[![bundle](https://img.shields.io/bundlephobia/minzip/@budarin/react-router)](https://bundlephobia.com/result?p=@budarin/react-router)
[![GitHub](https://img.shields.io/github/license/budarin/the-router)](https://github.com/budarin/the-router)

## ✨ Особенности

- ✅ **Динамическое дерево** — маршрутизация в рантайме по pathname/params, без статичного route tree
- ✅ **Динамическая история** — при каждом `navigate`/`replace` выбирается `push` или `replace`
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
    defaultHistory: 'replace', // history по умолчанию для всех navigate()
    logger: myLogger, // логгер (дефолт: console)
});
```

**Логгер:** тип `Logger` — объект с методами `trace`, `debug`, `info`, `warn`, `error` (как у `console`). Уровни: `LoggerLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'`. Если не передан — используется `console`.

**`pattern` (опционально):** строка-шаблон пути (нативный **URLPattern**). `:name` — захват сегмента в `params` (только буквы, цифры, `_`). `*` — wildcard, в `params` не попадает.

Типы параметров выводятся из литерала пути: `useRouter('/users/:id')` даёт `params: { id: string }`; при переменном пути — `Record<string, string>`. Экспортируются типы `ExtractRouteParams<P>` и `ParamsForPath<P>`.

```typescript
useRouter('/users/:id');
useRouter('/elements/:elementId/*/:subElementId'); // * обрабатывается URLPattern
```

## 🛠 Примеры

### 1. Базовая навигация (pathname, navigate)

```tsx
import { useRouter } from '@budarin/react-router';

function BasicNavigationExample() {
    const { pathname, navigate } = useRouter();

    return (
        <div>
            <p>Текущий путь: {pathname}</p>
            <button type="button" onClick={() => navigate('/posts')}>
                К постам
            </button>
            <button type="button" onClick={() => navigate('/')}>
                На главную
            </button>
        </div>
    );
}
```

### 2. Параметры пути (useRouter('/users/:id'), params)

```tsx
import { useRouter } from '@budarin/react-router';

function ParamsExample() {
    const { params, pathname, navigate } = useRouter('/users/:id');

    return (
        <div>
            <p>Pathname: {pathname}</p>
            <p>User ID из params: {params.id ?? '—'}</p>
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

### 3. Search params (query)

```tsx
import { useRouter } from '@budarin/react-router';

function SearchParamsExample() {
    const { searchParams, navigate, pathname } = useRouter('/posts');
    const pageParam = searchParams.get('page') ?? '1';
    const currentPage = Number.parseInt(pageParam, 10) || 1;

    return (
        <div>
            <p>Путь: {pathname}</p>
            <p>Страница: {currentPage}</p>
            <button
                type="button"
                onClick={() => navigate(`/posts?page=${currentPage - 1}`)}
                disabled={currentPage <= 1}
            >
                Пред. страница
            </button>
            <button type="button" onClick={() => navigate(`/posts?page=${currentPage + 1}`)}>
                След. страница
            </button>
        </div>
    );
}
```

### 4. История (back, forward, go, canGoBack, canGoForward)

```tsx
import { useRouter } from '@budarin/react-router';

function HistoryExample() {
    const { go, back, forward, canGoBack, canGoForward } = useRouter();

    return (
        <div>
            <button type="button" onClick={() => back()} disabled={!canGoBack()}>
                ← Назад
            </button>
            <button type="button" onClick={() => go(-2)} disabled={!canGoBack(2)}>
                ← 2 шага
            </button>
            <button type="button" onClick={() => go(1)} disabled={!canGoForward()}>
                Вперёд →
            </button>
            <button type="button" onClick={() => forward()} disabled={!canGoForward()}>
                Forward
            </button>
        </div>
    );
}
```

### 5. Push и replace (и метод replace())

```tsx
import { useRouter } from '@budarin/react-router';

function PushReplaceExample() {
    const { navigate, replace, pathname } = useRouter();

    return (
        <div>
            <p>Текущий путь: {pathname}</p>
            <button type="button" onClick={() => navigate('/step-push', { history: 'push' })}>
                Перейти (push) — в истории появится запись
            </button>
            <button type="button" onClick={() => navigate('/step-replace', { history: 'replace' })}>
                Перейти (replace через navigate)
            </button>
            <button type="button" onClick={() => replace('/step-replace-method')}>
                Перейти через replace() — то же, что history: 'replace'
            </button>
        </div>
    );
}
```

### 6. matched (совпадение pathname с pattern)

```tsx
import { useRouter } from '@budarin/react-router';

function MatchedExample() {
    const { pathname, matched, params } = useRouter('/users/:id');

    return (
        <div>
            <p>Pathname: {pathname}</p>
            <p>Pattern /users/:id совпал: {matched === true ? 'да' : 'нет'}</p>
            {matched === true ? (
                <p>User ID: {params.id}</p>
            ) : (
                <p>Это не страница пользователя (path не совпал с /users/:id).</p>
            )}
        </div>
    );
}
```

## ⚙️ Установка

```bash
npm i @budarin/react-router

pnpm add @budarin/react-router

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
