# @budarin/use-router

**Минимум кода. Максимум SPA-навигации.**

Инфраструктурный хук для React на **Navigation API** + **URLPattern**. Без провайдеров, без контекста, без бизнес-логики.

**Для динамического дерева компонентов:** что рендерить определяется в рантайме по URL (`pathname`, `params`, `matched`), а не статичным деревом маршрутов (как в React Router / TanStack Router). История тоже формируется динамически: при каждом переходе можно выбрать `push` или `replace`. Подходит, когда маршруты зависят от ролей, фич, CMS или конфига с бэка.

**Для иерархии URL без вложенных роутов:** в React Router, TanStack Router и аналогах иерархия пути держится на вложенности `<Route>`: дочерний сегмент не совпадает без родительского. Если структура маршрутов не иерархическая (плоская, граф, условная и т.п.), такую иерархию в URL там не реализовать. Здесь достаточно одного паттерна (одного матча) и при необходимости проверки по `params`.

[![npm](https://img.shields.io/npm/v/@budarin/use-router?color=cb0000)](https://www.npmjs.com/package/@budarin/use-router)
[![npm](https://img.shields.io/npm/dt/@budarin/use-router)](https://www.npmjs.com/package/@budarin/use-router)
[![bundle](https://img.shields.io/bundlephobia/minzip/@budarin/use-router)](https://bundlephobia.com/result?p=@budarin/use-router)
[![GitHub](https://img.shields.io/github/license/budarin/use-router)](https://github.com/budarin/use-router)

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
npm i @budarin/use-router
```

```typescript
import { useRouter, configureRouter } from '@budarin/use-router';


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

### `useRouter(pattern?: string | PathMatcher)`

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

**`pattern` (опционально):** строка-шаблон пути (нативный **URLPattern**) или функция-матчер **PathMatcher** `(pathname) => { matched, params }`. Для иерархических/кастомных маршрутов (split + проверка, RegExp с lookbehind и т.п.) передавайте функцию — хук вызовет её по текущему pathname и подставит `matched` и `params`.

**Строка (URLPattern).** Поддерживается:

- **Именованные параметры** — `:name` (имя как в JS: буквы, цифры, `_`). Значение сегмента попадает в `params[name]`.
- **Опциональные группы** — `{ ... }?`: часть пути можно сделать необязательной. Один паттерн покрывает пути разной глубины; в `params` только те ключи, для которых есть сегмент в URL.
- **Wildcard** — `*`: совпадает с «хвостом» пути; в `params` не попадает (числовые ключи из `groups` отфильтрованы).
- **Regexp в параметре** — `:name(регулярка)` для ограничения формата сегмента (например только цифры). В `params` по-прежнему строка.

```typescript
useRouter('/users/:id');
useRouter('/elements/:elementId/*/:subElementId'); // wildcard

// Опциональные группы
useRouter('/users/:id{/posts/:postId}?');

// Ограничение формата параметра (regexp)
useRouter('/blog/:year(\\d+)/:month(\\d+)');

// Функция-матчер (иерархия, кастомный разбор)
const matchPost = (pathname: string) => ({ matched: pathname.startsWith('/posts/'), params: {} });
useRouter(matchPost);
```

Полный синтаксис URLPattern: [URL Pattern API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API), [WHATWG URL Pattern](https://urlpattern.spec.whatwg.org/).

## 🛠 Примеры

### 1. Базовая навигация (pathname, navigate)

```tsx
import { useRouter } from '@budarin/use-router';

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
import { useRouter } from '@budarin/use-router';

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
import { useRouter } from '@budarin/use-router';

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
import { useRouter } from '@budarin/use-router';

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
import { useRouter } from '@budarin/use-router';

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
import { useRouter } from '@budarin/use-router';

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

### 7. Функция-матчер (PathMatcher)

Удобно, когда один URLPattern или простой regex не справляется: иерархия (например, `postId` только вместе с `userId`), кастомная валидация, разный порядок сегментов. Ниже — матчер для `/users/:userId` и `/users/:userId/posts/:postId`: два параметра, причём `postId` допустим только после литерала `posts` и только при наличии `userId`.

```tsx
import { useRouter, type PathMatcher } from '@budarin/use-router';

const matchUserPosts: PathMatcher = (pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] !== 'users' || !segments[1]) return { matched: false, params: {} };
    const params: Record<string, string> = { userId: segments[1] };
    if (segments[2] === 'posts' && segments[3]) {
        params.postId = segments[3];
    }
    return { matched: true, params };
};

function UserPostsExample() {
    const { pathname, matched, params } = useRouter(matchUserPosts);

    if (!matched) return null;

    return (
        <div>
            <p>Путь: {pathname}</p>
            <p>User ID: {params.userId}</p>
            {params.postId && <p>Post ID: {params.postId}</p>}
        </div>
    );
}
```

## ⚙️ Установка

```bash
npm i @budarin/use-router

pnpm add @budarin/use-router

yarn add @budarin/use-router
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
