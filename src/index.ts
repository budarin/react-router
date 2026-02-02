import type {
    Pathname,
    UrlString,
    RouteState,
    PathPattern,
    PathMatcher,
    RouteParams,
    HistoryIndex,
    UseRouteReturn,
    UseRouteOptions,
    NavigateOptions,
    NavigationEntryKey,
} from './types';

import type { Navigation, NavigationNavigateOptions, NavigateEvent } from './native-api-types';

import { getRouteConfig, getLogger } from './types';
import { useSyncExternalStore, useMemo } from 'react';

// Утилита для проверки браузерного окружения
const isBrowser = typeof window !== 'undefined';

// Валидация URL: разрешаем только http://, https:// и относительные пути
function isValidUrl(url: UrlString): boolean {
    if (!url || typeof url !== 'string') return false;

    // Относительные пути всегда валидны
    if (url.startsWith('/') || !url.includes(':')) return true;

    // Абсолютные URL должны начинаться с http:// или https://
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// Проверка соответствия паттерна pathname (только URLPattern)
function testPattern(compiled: URLPattern, pathname: Pathname): boolean {
    return compiled.test({ pathname });
}

/** pathname без базового префикса (для возврата из хука при заданном base). */
function pathnameWithoutBase(pathname: Pathname, base: string | undefined): Pathname {
    if (!base || base === '/') return pathname;
    if (pathname === base || pathname.startsWith(base + '/')) {
        return pathname === base ? '/' : pathname.slice(base.length);
    }
    return pathname;
}

/** Combines global base and section into full prefix. section '' = app root (globalBase only). */
function combineBases(
    globalBase: string | undefined,
    section: string | undefined
): string | undefined {
    const g = globalBase && globalBase !== '/' ? globalBase.replace(/\/$/, '') : '';
    if (section === undefined) return g || undefined;
    if (section === '' || section === '/') return g || undefined;
    const s = section.startsWith('/') ? section : '/' + section;
    return g ? g + s : s;
}

// Общий LRU-кэш URL → разобранный URL (используется в snapshot, один раз на текущий URL)
const URL_CACHE = new Map<UrlString, URL>();

/**
 * Парсит URL с LRU-кэшем. При ошибке парсинга не кэширует — возвращает fallback URL.
 */
function getCachedParsedUrl(urlStr: UrlString): URL {
    const cache = URL_CACHE;
    const existing = cache.get(urlStr);
    if (existing !== undefined) {
        cache.delete(urlStr);
        cache.set(urlStr, existing);
        return existing;
    }
    const base = isBrowser ? window.location.origin : 'http://localhost';
    try {
        const parsed = new URL(urlStr, base);
        const limit = getRouteConfig().urlCacheLimit;
        if (cache.size >= limit) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) cache.delete(firstKey);
        }
        cache.set(urlStr, parsed);
        return parsed;
    } catch (error) {
        getLogger().warn('[useRoute] Invalid URL:', urlStr, error);
        try {
            return new URL('/', base);
        } catch {
            return new URL('http://localhost/');
        }
    }
}

// Общий store для navigation: один снимок и 2 слушателя на всё приложение (вместо 2N при N хуках).
// Разбор текущего URL (pathname, searchParams) делается один раз при обновлении snapshot, не в каждом хуке.
type NavigationSnapshot = {
    currentKey: NavigationEntryKey;
    canGoBackFlag: boolean;
    canGoForwardFlag: boolean;
    entriesKeys: NavigationEntryKey[];
    urlStr: UrlString;
    pathname: Pathname;
    searchParams: URLSearchParams;
    state: unknown;
};

const DEFAULT_SNAPSHOT: NavigationSnapshot = {
    currentKey: '',
    canGoBackFlag: false,
    canGoForwardFlag: false,
    entriesKeys: [],
    urlStr: '/',
    pathname: '/',
    searchParams: new URLSearchParams(),
    state: undefined,
};

function getNavigation(): Navigation | undefined {
    return typeof window !== 'undefined' && 'navigation' in window
        ? (window.navigation as Navigation)
        : undefined;
}

function computeNavigationSnapshot(nav: Navigation | undefined): NavigationSnapshot {
    if (!nav) {
        // SSR fallback: используем initialLocation из конфига
        if (!isBrowser) {
            const urlStr = getRouteConfig().initialLocation ?? '/';
            const parsed = getCachedParsedUrl(urlStr);
            return {
                ...DEFAULT_SNAPSHOT,
                urlStr,
                pathname: parsed.pathname,
                searchParams: parsed.searchParams,
            };
        }
        // В браузере без Navigation API возвращаем дефолтный snapshot
        return DEFAULT_SNAPSHOT;
    }
    const entry = nav.currentEntry;
    const urlStr = entry?.url ?? (isBrowser ? window.location.href : '/');
    const parsed = getCachedParsedUrl(urlStr);
    const state =
        entry && 'getState' in entry && typeof entry.getState === 'function'
            ? entry.getState()
            : undefined;
    return {
        currentKey: entry?.key ?? '',
        canGoBackFlag: !!nav.canGoBack,
        canGoForwardFlag: !!nav.canGoForward,
        entriesKeys: nav.entries().map((e) => e.key) ?? [],
        urlStr,
        pathname: parsed.pathname,
        searchParams: parsed.searchParams,
        state,
    };
}

// Инициализируем снимок сразу (всегда валидный, не null)
let sharedSnapshot: NavigationSnapshot = computeNavigationSnapshot(getNavigation());
const storeCallbacks = new Set<() => void>();
let unsubscribeNavigation: (() => void) | null = null;

function subscribeToNavigation(callback: () => void): () => void {
    storeCallbacks.add(callback);
    if (storeCallbacks.size === 1) {
        const nav = getNavigation();
        if (nav) {
            // Обновляем snapshot при первой подписке
            sharedSnapshot = computeNavigationSnapshot(nav);

            const interceptListener = (event: Event) => {
                const navEvent = event as NavigateEvent;
                if (!navEvent.canIntercept || !isBrowser) return;
                try {
                    const destUrl = new URL(navEvent.destination.url);
                    if (destUrl.origin !== window.location.origin) return;
                    navEvent.intercept({ handler() {} });
                } catch {
                    // невалидный URL — не перехватываем
                }
            };
            const listener = () => {
                sharedSnapshot = computeNavigationSnapshot(nav);
                storeCallbacks.forEach((cb) => cb());
            };
            nav.addEventListener('navigate', interceptListener);
            nav.addEventListener('navigate', listener);
            nav.addEventListener('currententrychange', listener);
            unsubscribeNavigation = () => {
                nav.removeEventListener('navigate', interceptListener);
                nav.removeEventListener('navigate', listener);
                nav.removeEventListener('currententrychange', listener);
            };
        }
    }
    return () => {
        storeCallbacks.delete(callback);
        if (storeCallbacks.size === 0) {
            if (unsubscribeNavigation) {
                unsubscribeNavigation();
                unsubscribeNavigation = null;
            }
            // ✅ Не очищаем sharedSnapshot - он остаётся валидным для глобальных методов
            // Обновляем snapshot при следующем чтении, если нет подписчиков
        }
    };
}

function getNavigationSnapshot(): NavigationSnapshot {
    const nav = getNavigation();

    // Если нет подписчиков и есть Navigation API, проверяем актуальность
    if (storeCallbacks.size === 0 && nav) {
        const currentUrl = nav.currentEntry?.url ?? (isBrowser ? window.location.href : '/');
        if (currentUrl !== sharedSnapshot.urlStr) {
            sharedSnapshot = computeNavigationSnapshot(nav);
        }
    }

    return sharedSnapshot;
}

// Один keyToIndexMap на снимок (один на все хуки при общем rawState)
let lastEntriesKeysRef: NavigationEntryKey[] | null = null;
let lastKeyToIndexMap: Map<NavigationEntryKey, HistoryIndex> | null = null;

function getKeyToIndexMap(
    entriesKeys: NavigationEntryKey[]
): Map<NavigationEntryKey, HistoryIndex> {
    if (entriesKeys === lastEntriesKeysRef && lastKeyToIndexMap !== null) {
        return lastKeyToIndexMap;
    }
    lastEntriesKeysRef = entriesKeys;
    const map = new Map<NavigationEntryKey, HistoryIndex>();
    entriesKeys.forEach((key, index) => map.set(key, index));
    lastKeyToIndexMap = map;
    return map;
}

// Кэш скомпилированных URLPattern
const PATTERN_CACHE = new Map<PathPattern, URLPattern>();

function getCompiledPattern(pattern: PathPattern): URLPattern {
    let compiled = PATTERN_CACHE.get(pattern);
    if (!compiled) {
        compiled = new URLPattern({ pathname: pattern });
        PATTERN_CACHE.set(pattern, compiled);
    }
    return compiled;
}

// Извлечение params из уже скомпилированного URLPattern (один exec, без повторного getCompiledPattern)
// URLPattern кладёт сегменты * в groups с числовыми ключами — их не возвращаем.
function parseParamsFromCompiled(compiled: URLPattern, pathname: Pathname): RouteParams {
    const match = compiled.exec({ pathname });
    const groups = (match?.pathname.groups ?? {}) as RouteParams;
    return Object.fromEntries(
        Object.entries(groups).filter(([key]) => !/^\d+$/.test(key))
    ) as RouteParams;
}

// Экспортируем configureRoute и очистку кэшей (для тестов / смены окружения)
export {
    configureRoute,
    type LoggerLevel,
    type Logger,
    type NavigateOptions,
    type UseRouteOptions,
    type UseRouteReturn,
    type ExtractRouteParams,
    type ParamsForPath,
    type PathMatcher,
    type Pathname,
    type RouteParams,
} from './types';

/** Очищает кэши паттернов и URL. Для тестов или при смене base/origin. */
export function clearRouteCaches(): void {
    PATTERN_CACHE.clear();
    URL_CACHE.clear();
    lastEntriesKeysRef = null;
    lastKeyToIndexMap = null;
    // Пересоздаём snapshot после очистки
    sharedSnapshot = computeNavigationSnapshot(getNavigation());
}

// ============================================================================
// ГЛОБАЛЬНЫЕ МЕТОДЫ НАВИГАЦИИ (создаются один раз, переиспользуются всеми хуками)
// ============================================================================

// Простые глобальные методы без зависимостей

/** Глобальный метод back() - создаётся один раз */
function globalBack(): void {
    try {
        const nav = getNavigation();
        if (nav) nav.back();
    } catch (error) {
        getLogger().error('[useRoute] Back navigation error:', error);
    }
}

/** Глобальный метод forward() - создаётся один раз */
function globalForward(): void {
    try {
        const nav = getNavigation();
        if (nav) nav.forward();
    } catch (error) {
        getLogger().error('[useRoute] Forward navigation error:', error);
    }
}

/** Глобальный метод updateState() - создаётся один раз */
function globalUpdateState(state: unknown): void {
    try {
        const nav = getNavigation();
        if (nav) {
            nav.updateCurrentEntry({ state });
            sharedSnapshot = computeNavigationSnapshot(nav);
            storeCallbacks.forEach((cb) => cb());
        } else {
            // Без Navigation API - no-op с предупреждением
            getLogger().warn('[useRoute] updateState requires Navigation API');
        }
    } catch (error) {
        getLogger().error('[useRoute] updateState error:', error);
    }
}

// Кэшированные методы navigate и replace по effectiveBase
const navigateCache = new Map<
    string,
    (to: string | URL, options?: NavigateOptions) => Promise<void>
>();

/** Создаёт navigate для конкретного effectiveBase и кэширует */
function getNavigateForBase(effectiveBase: string | undefined) {
    const cacheKey = effectiveBase ?? '__root__';
    let cachedNavigate = navigateCache.get(cacheKey);

    if (!cachedNavigate) {
        cachedNavigate = async (
            to: string | URL,
            navOptions: NavigateOptions = {}
        ): Promise<void> => {
            let targetUrl = typeof to === 'string' ? to : to.toString();
            let baseForCall: string | undefined;

            if (navOptions.base !== undefined) {
                baseForCall =
                    navOptions.base === '' || navOptions.base === '/' ? undefined : navOptions.base;
            } else if (navOptions.section !== undefined) {
                baseForCall = combineBases(getRouteConfig().base, navOptions.section);
            } else {
                baseForCall = effectiveBase;
            }

            if (
                baseForCall &&
                baseForCall !== '/' &&
                typeof to === 'string' &&
                to.startsWith('/') &&
                !to.startsWith('//') &&
                !to.includes(':')
            ) {
                targetUrl = baseForCall + (to === '/' ? '' : to);
            }

            if (!isValidUrl(targetUrl)) {
                getLogger().warn('[useRoute] Invalid URL rejected:', targetUrl);
                return;
            }

            const nav = getNavigation();
            if (!nav) {
                return;
            }

            const defaultHistory = getRouteConfig().defaultHistory ?? 'auto';
            const navigationOpts: NavigationNavigateOptions = {
                state: navOptions.state,
                history: navOptions.history ?? defaultHistory,
            };

            try {
                await nav.navigate(targetUrl, navigationOpts);
            } catch (error) {
                getLogger().error('[useRoute] Navigation error:', error);
            }
        };

        navigateCache.set(cacheKey, cachedNavigate);
    }

    return cachedNavigate;
}

/** Создаёт replace для конкретного navigate и кэширует */
const replaceCache = new Map<
    string,
    (to: string | URL, options?: NavigateOptions) => Promise<void>
>();

function getReplaceForBase(effectiveBase: string | undefined) {
    const cacheKey = effectiveBase ?? '__root__';
    let cachedReplace = replaceCache.get(cacheKey);

    if (!cachedReplace) {
        const navigateFn = getNavigateForBase(effectiveBase);
        cachedReplace = (to: string | URL, options?: NavigateOptions) =>
            navigateFn(to, { ...options, history: 'replace' });
        replaceCache.set(cacheKey, cachedReplace);
    }

    return cachedReplace;
}

// Глобальные методы с чтением актуального snapshot

/** Глобальный метод go() - читает актуальный snapshot */
function globalGo(delta: number): void {
    // Валидация входных данных
    if (delta === Infinity || delta === -Infinity) {
        getLogger().warn('[useRoute] Delta value too large:', delta);
        return;
    }
    if (!Number.isFinite(delta) || delta === 0) return;
    if (delta > Number.MAX_SAFE_INTEGER || delta < -Number.MAX_SAFE_INTEGER) {
        getLogger().warn('[useRoute] Delta value too large:', delta);
        return;
    }

    const nav = getNavigation();
    if (!nav) return;

    try {
        const snapshot = getNavigationSnapshot();
        if (snapshot.entriesKeys.length === 0) return;

        const keyToIndexMap = getKeyToIndexMap(snapshot.entriesKeys);
        const idx = keyToIndexMap.get(snapshot.currentKey) ?? -1;
        if (idx === -1) return;

        const targetIdx = idx + delta;
        if (targetIdx < 0 || targetIdx >= snapshot.entriesKeys.length) {
            return;
        }

        const targetKey = snapshot.entriesKeys[targetIdx];
        if (targetKey === undefined) return;
        nav.traverseTo(targetKey);
    } catch (error) {
        getLogger().error('[useRoute] Go navigation error:', error);
    }
}

/** Глобальный метод canGoBack() - читает актуальный snapshot */
function globalCanGoBack(steps: number = 1): boolean {
    // Валидация входных данных
    if (!Number.isFinite(steps) || steps < 0 || steps > Number.MAX_SAFE_INTEGER) {
        return false;
    }

    const nav = getNavigation();
    if (!nav) return false;

    const snapshot = getNavigationSnapshot();
    if (snapshot.entriesKeys.length === 0) {
        return false;
    }

    const keyToIndexMap = getKeyToIndexMap(snapshot.entriesKeys);
    const idx = keyToIndexMap.get(snapshot.currentKey) ?? -1;
    if (idx === -1) return false;

    return idx - steps >= 0;
}

/** Глобальный метод canGoForward() - читает актуальный snapshot */
function globalCanGoForward(steps: number = 1): boolean {
    // Валидация входных данных
    if (!Number.isFinite(steps) || steps < 0 || steps > Number.MAX_SAFE_INTEGER) {
        return false;
    }

    const nav = getNavigation();
    if (!nav) return false;

    const snapshot = getNavigationSnapshot();
    if (snapshot.entriesKeys.length === 0) {
        return false;
    }

    const keyToIndexMap = getKeyToIndexMap(snapshot.entriesKeys);
    const idx = keyToIndexMap.get(snapshot.currentKey) ?? -1;
    if (idx === -1) return false;

    return idx + steps < snapshot.entriesKeys.length;
}

/** Overload: options only (no pattern). E.g. useRoute({ section: '/dashboard' }). */
export function useRoute(options: UseRouteOptions): UseRouteReturn;
/** Перегрузка: pattern и опции. */
export function useRoute<P extends string | PathMatcher>(
    pattern: P,
    options?: UseRouteOptions
): UseRouteReturn<P>;
/** Перегрузка: только pattern или без аргументов. */
export function useRoute<P extends string | PathMatcher = string>(pattern?: P): UseRouteReturn<P>;
/**
 * Хук состояния маршрута и навигации (Navigation API + URLPattern).
 * useRoute({ section: '/dashboard' }) — options only, no pattern.
 * useRoute('/users/:id') or useRoute('/users/:id', { section: '/dashboard' }).
 */
export function useRoute<P extends string | PathMatcher = string>(
    patternOrOptions?: P | UseRouteOptions,
    optionsParam?: UseRouteOptions
): UseRouteReturn<P> {
    let pattern: P | undefined;
    let options: UseRouteOptions | undefined;
    if (
        arguments.length === 1 &&
        typeof patternOrOptions === 'object' &&
        patternOrOptions !== null &&
        typeof patternOrOptions !== 'function'
    ) {
        options = patternOrOptions as UseRouteOptions;
        pattern = undefined as unknown as P;
    } else {
        pattern = patternOrOptions as P | undefined;
        options = optionsParam;
    }

    const rawState = useSyncExternalStore(
        subscribeToNavigation,
        getNavigationSnapshot,
        () => DEFAULT_SNAPSHOT
    );
    const keyToIndexMap = getKeyToIndexMap(rawState.entriesKeys);
    const effectiveBase = combineBases(getRouteConfig().base, options?.section);

    // Производное состояние роутера. pathname/searchParams берём из snapshot (разбор URL один раз в store).
    const routeState: RouteState = useMemo(() => {
        const { urlStr, pathname: rawPathname, searchParams } = rawState;
        const pathname = pathnameWithoutBase(rawPathname, effectiveBase);

        let matched: boolean | undefined;
        let params: RouteParams = {};
        if (pattern) {
            if (typeof pattern === 'function') {
                const result = pattern(pathname);
                matched = result.matched;
                params = result.params;
            } else {
                const compiled = getCompiledPattern(pattern);
                const patternMatched = testPattern(compiled, pathname);
                matched = patternMatched;
                params = patternMatched ? parseParamsFromCompiled(compiled, pathname) : {};
            }
        }
        const historyIndex = keyToIndexMap.get(rawState.currentKey) ?? -1;

        return {
            location: urlStr,
            pathname,
            searchParams,
            params,
            historyIndex,
            state: rawState.state,
            matched,
        };
    }, [rawState, pattern, effectiveBase]);

    // ✅ Используем глобальные/кэшированные методы - стабильные ссылки, без useCallback
    const navigate = getNavigateForBase(effectiveBase);
    const replace = getReplaceForBase(effectiveBase);
    const back = globalBack;
    const forward = globalForward;
    const go = globalGo;
    const updateState = globalUpdateState;
    const canGoBack = globalCanGoBack;
    const canGoForward = globalCanGoForward;

    // ✅ Возвращаем объект без useMemo - все методы стабильны, routeState мемоизирован выше
    return {
        navigate,
        back,
        forward,
        go,
        replace,
        updateState,
        canGoBack,
        canGoForward,
        location: routeState.location,
        pathname: routeState.pathname,
        searchParams: routeState.searchParams,
        params: routeState.params,
        historyIndex: routeState.historyIndex,
        state: routeState.state,
        matched: routeState.matched,
    } as UseRouteReturn<P>;
}
