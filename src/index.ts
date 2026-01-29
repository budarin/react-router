import type {
    Navigation,
    RouterState,
    NavigateOptions,
    UseRouterReturn,
    NavigationNavigateOptions,
} from './types';

import { getRouterConfig } from './types';
import { useSyncExternalStore, useCallback, useMemo } from 'react';

// Утилита для проверки браузерного окружения
const isBrowser = typeof window !== 'undefined';

// Валидация URL: разрешаем только http://, https:// и относительные пути
function isValidUrl(url: string): boolean {
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
function testPattern(compiled: URLPattern, pathname: string): boolean {
    return compiled.test({ pathname });
}

// Общий LRU-кэш URL → разобранный URL (используется в snapshot, один раз на текущий URL)
const URL_CACHE = new Map<string, URL>();

/**
 * Парсит URL с LRU-кэшем. При ошибке парсинга не кэширует — возвращает fallback URL.
 */
function getCachedParsedUrl(urlStr: string): URL {
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
        const limit = getRouterConfig().urlCacheLimit;
        if (cache.size >= limit) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) cache.delete(firstKey);
        }
        cache.set(urlStr, parsed);
        return parsed;
    } catch (error) {
        console.warn('[useRouter] Invalid URL:', urlStr, error);
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
    currentKey: string;
    canGoBackFlag: boolean;
    canGoForwardFlag: boolean;
    entriesKeys: string[];
    urlStr: string;
    pathname: string;
    searchParams: URLSearchParams;
};

const DEFAULT_SNAPSHOT: NavigationSnapshot = {
    currentKey: '',
    canGoBackFlag: false,
    canGoForwardFlag: false,
    entriesKeys: [],
    urlStr: '/',
    pathname: '/',
    searchParams: new URLSearchParams(),
};

function getNavigation(): Navigation | undefined {
    return typeof window !== 'undefined' && 'navigation' in window
        ? (window.navigation as Navigation)
        : undefined;
}

function computeNavigationSnapshot(nav: Navigation | undefined): NavigationSnapshot {
    if (!nav) return DEFAULT_SNAPSHOT;
    const urlStr = nav.currentEntry?.url ?? (isBrowser ? window.location.href : '/');
    const parsed = getCachedParsedUrl(urlStr);
    return {
        currentKey: nav.currentEntry?.key ?? '',
        canGoBackFlag: !!nav.canGoBack,
        canGoForwardFlag: !!nav.canGoForward,
        entriesKeys: nav.entries.map((e) => e.key) ?? [],
        urlStr,
        pathname: parsed.pathname,
        searchParams: parsed.searchParams,
    };
}

let sharedSnapshot: NavigationSnapshot | null = null;
const storeCallbacks = new Set<() => void>();
let unsubscribeNavigation: (() => void) | null = null;

function subscribeToNavigation(callback: () => void): () => void {
    storeCallbacks.add(callback);
    if (storeCallbacks.size === 1) {
        const nav = getNavigation();
        if (nav) {
            const listener = () => {
                sharedSnapshot = computeNavigationSnapshot(nav);
                storeCallbacks.forEach((cb) => cb());
            };
            nav.addEventListener('navigate', listener);
            nav.addEventListener('currententrychange', listener);
            unsubscribeNavigation = () => {
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
            sharedSnapshot = null;
            noNavSnapshot = null;
            noNavSnapshotUrl = null;
        }
    };
}

let noNavSnapshot: NavigationSnapshot | null = null;
let noNavSnapshotUrl: string | null = null;

function getNavigationSnapshot(): NavigationSnapshot {
    if (sharedSnapshot !== null) return sharedSnapshot;
    const nav = getNavigation();
    if (nav) {
        sharedSnapshot = computeNavigationSnapshot(nav);
        return sharedSnapshot;
    }
    // Нет Navigation API (тесты, старый браузер) — URL из window.location, разбор один раз через кэш
    const urlStr = isBrowser ? window.location.href : '/';
    if (noNavSnapshot !== null && noNavSnapshotUrl === urlStr) return noNavSnapshot;
    const parsed = getCachedParsedUrl(urlStr);
    noNavSnapshotUrl = urlStr;
    noNavSnapshot = {
        ...DEFAULT_SNAPSHOT,
        urlStr,
        pathname: parsed.pathname,
        searchParams: parsed.searchParams,
    };
    return noNavSnapshot;
}

// Один keyToIndexMap на снимок (один на все хуки при общем rawState)
let lastEntriesKeysRef: string[] | null = null;
let lastKeyToIndexMap: Map<string, number> | null = null;

function getKeyToIndexMap(entriesKeys: string[]): Map<string, number> {
    if (entriesKeys === lastEntriesKeysRef && lastKeyToIndexMap !== null) {
        return lastKeyToIndexMap;
    }
    lastEntriesKeysRef = entriesKeys;
    const map = new Map<string, number>();
    entriesKeys.forEach((key, index) => map.set(key, index));
    lastKeyToIndexMap = map;
    return map;
}

// Кэш скомпилированных URLPattern[web:140][web:221]
const PATTERN_CACHE = new Map<string, URLPattern>();

function getCompiledPattern(pattern: string): URLPattern {
    let compiled = PATTERN_CACHE.get(pattern);
    if (!compiled) {
        compiled = new URLPattern({ pathname: pattern });
        PATTERN_CACHE.set(pattern, compiled);
    }
    return compiled;
}

// Извлечение params из уже скомпилированного URLPattern (один exec, без повторного getCompiledPattern)
// URLPattern кладёт сегменты * в groups с числовыми ключами — их не возвращаем.
function parseParamsFromCompiled(compiled: URLPattern, pathname: string): Record<string, string> {
    const match = compiled.exec({ pathname });
    const groups = (match?.pathname.groups ?? {}) as Record<string, string>;
    return Object.fromEntries(
        Object.entries(groups).filter(([key]) => !/^\d+$/.test(key))
    ) as Record<string, string>;
}

// Парсинг params по строке паттерна (для внешних вызовов)
function parseParams(pathname: string, routePattern?: string): Record<string, string> {
    if (!routePattern) return {};
    return parseParamsFromCompiled(getCompiledPattern(routePattern), pathname);
}

// Экспортируем configureRouter и очистку кэшей (для тестов / смены окружения)
export { configureRouter } from './types';

/** Очищает кэши паттернов и URL. Для тестов или при смене base/origin. */
export function clearRouterCaches(): void {
    PATTERN_CACHE.clear();
    URL_CACHE.clear();
    lastEntriesKeysRef = null;
    lastKeyToIndexMap = null;
    noNavSnapshot = null;
    noNavSnapshotUrl = null;
}

export function useRouter(pattern?: string): UseRouterReturn {
    const navigation = getNavigation();
    const rawState = useSyncExternalStore(
        subscribeToNavigation,
        getNavigationSnapshot,
        () => DEFAULT_SNAPSHOT
    );
    const keyToIndexMap = getKeyToIndexMap(rawState.entriesKeys);

    // 2. Производное состояние роутера. pathname/searchParams берём из snapshot (разбор URL один раз в store).
    const routerState: RouterState & {
        _entriesKeys: string[];
    } = useMemo(() => {
        const { urlStr, pathname, searchParams } = rawState;

        let matched: boolean | undefined;
        let params: Record<string, string> = {};
        if (pattern) {
            const compiled = getCompiledPattern(pattern);
            const patternMatched = testPattern(compiled, pathname);
            matched = patternMatched;
            params = patternMatched ? parseParamsFromCompiled(compiled, pathname) : {};
        }
        const historyIndex = keyToIndexMap.get(rawState.currentKey) ?? -1;

        return {
            location: urlStr,
            pathname,
            searchParams,
            params,
            historyIndex,
            matched,
            _entriesKeys: rawState.entriesKeys,
        };
    }, [
        rawState.currentKey,
        rawState.entriesKeys,
        rawState.urlStr,
        rawState.pathname,
        rawState.searchParams,
        pattern,
    ]);

    // 3. Навигационные операции. Только Navigation API — без Navigation состояние не обновляется.
    const navigate = useCallback(
        async (to: string | URL, options: NavigateOptions = {}): Promise<void> => {
            const targetUrl = typeof to === 'string' ? to : to.toString();

            if (!isValidUrl(targetUrl)) {
                console.warn('[useRouter] Invalid URL rejected:', targetUrl);
                return;
            }

            if (!navigation) {
                return;
            }

            const navOptions: NavigationNavigateOptions = { state: options.state };
            if (options.history === 'replace' || options.replace) {
                navOptions.history = 'replace';
            } else if (options.history === 'push') {
                navOptions.history = 'push';
            } else {
                navOptions.history = 'auto';
            }

            try {
                await navigation.navigate(targetUrl, navOptions);
            } catch (error) {
                console.error('[useRouter] Navigation error:', error);
            }
        },
        [navigation]
    );

    const back = useCallback(() => {
        try {
            if (navigation) navigation.back();
        } catch (error) {
            console.error('[useRouter] Back navigation error:', error);
        }
    }, [navigation]);

    const forward = useCallback(() => {
        try {
            if (navigation) navigation.forward();
        } catch (error) {
            console.error('[useRouter] Forward navigation error:', error);
        }
    }, [navigation]);

    const canGoBack = useCallback(
        (steps: number = 1): boolean => {
            // Валидация входных данных
            if (!Number.isFinite(steps) || steps < 0 || steps > Number.MAX_SAFE_INTEGER) {
                return false;
            }

            if (!navigation || routerState._entriesKeys.length === 0) {
                return false;
            }
            const idx = routerState.historyIndex;
            if (idx === -1) return false;
            return idx - steps >= 0;
        },
        [navigation, routerState._entriesKeys.length, routerState.historyIndex]
    );

    const canGoForward = useCallback(
        (steps: number = 1): boolean => {
            // Валидация входных данных
            if (!Number.isFinite(steps) || steps < 0 || steps > Number.MAX_SAFE_INTEGER) {
                return false;
            }

            if (!navigation || routerState._entriesKeys.length === 0) {
                return false;
            }
            const idx = routerState.historyIndex;
            if (idx === -1) return false;
            return idx + steps < routerState._entriesKeys.length;
        },
        [navigation, routerState._entriesKeys.length, routerState.historyIndex]
    );

    const go = useCallback(
        (delta: number): void => {
            // Валидация входных данных
            if (delta === Infinity || delta === -Infinity) {
                console.warn('[useRouter] Delta value too large:', delta);
                return;
            }
            if (!Number.isFinite(delta) || delta === 0) return;
            if (delta > Number.MAX_SAFE_INTEGER || delta < -Number.MAX_SAFE_INTEGER) {
                console.warn('[useRouter] Delta value too large:', delta);
                return;
            }

            try {
                if (navigation && routerState._entriesKeys.length > 0) {
                    const idx = routerState.historyIndex;
                    if (idx === -1) return;
                    const targetIdx = idx + delta;
                    if (targetIdx < 0 || targetIdx >= routerState._entriesKeys.length) {
                        return;
                    }
                    const targetKey = routerState._entriesKeys[targetIdx];
                    if (targetKey === undefined) return;
                    navigation.traverseTo(targetKey);
                }
            } catch (error) {
                console.error('[useRouter] Go navigation error:', error);
            }
        },
        [navigation, routerState._entriesKeys, routerState.historyIndex]
    );

    const replace = useCallback(
        (to: string | URL, state?: unknown) => navigate(to, { replace: true, state }),
        [navigate]
    );

    return useMemo(
        () => ({
            navigate,
            back,
            forward,
            go,
            replace,
            canGoBack,
            canGoForward,
            location: routerState.location,
            pathname: routerState.pathname,
            searchParams: routerState.searchParams,
            params: routerState.params,
            historyIndex: routerState.historyIndex,
            matched: routerState.matched,
        }),
        [
            navigate,
            back,
            forward,
            go,
            replace,
            canGoBack,
            canGoForward,
            routerState.location,
            routerState.pathname,
            routerState.searchParams,
            routerState.params,
            routerState.historyIndex,
            routerState.matched,
        ]
    );
}
