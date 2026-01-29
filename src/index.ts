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

// Подписка на изменения навигации (navigate + currententrychange)[web:225][web:220]
function subscribeNavigation(navigation: Navigation) {
    return (callback: () => void) => {
        navigation.addEventListener('navigate', callback);
        navigation.addEventListener('currententrychange', callback);
        return () => {
            navigation.removeEventListener('navigate', callback);
            navigation.removeEventListener('currententrychange', callback);
        };
    };
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

// Общий LRU-кэш URL → разобранный URL (один на модуль, лимит из configureRouter)[web:133]
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
        // Не кэшируем битый URL — возвращаем fallback без записи в кэш
        try {
            return new URL('/', base);
        } catch {
            return new URL('http://localhost/');
        }
    }
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
}

export function useRouter(pattern?: string): UseRouterReturn {
    const navigation: Navigation | undefined =
        typeof window !== 'undefined' && 'navigation' in window
            ? (window.navigation as Navigation)
            : undefined;

    // 1. useSyncExternalStore — только ключ текущей записи и флаги canGoBack/Forward[web:225][web:219]
    // Мемоизируем getSnapshot для стабильности
    const getSnapshot = useMemo(() => {
        let cached: {
            currentKey: string;
            canGoBackFlag: boolean;
            canGoForwardFlag: boolean;
            entriesKeys: string[];
        } | null = null;

        return () => {
            const currentKey = navigation?.currentEntry?.key ?? '';
            const canGoBackFlag = !!navigation?.canGoBack;
            const canGoForwardFlag = !!navigation?.canGoForward;
            const entriesKeys = navigation?.entries.map((e) => e.key) ?? [];

            // Возвращаем кэшированный объект, если значения не изменились
            if (
                cached &&
                cached.currentKey === currentKey &&
                cached.canGoBackFlag === canGoBackFlag &&
                cached.canGoForwardFlag === canGoForwardFlag &&
                cached.entriesKeys.length === entriesKeys.length &&
                cached.entriesKeys.every((key, i) => key === entriesKeys[i])
            ) {
                return cached;
            }

            cached = {
                currentKey,
                canGoBackFlag,
                canGoForwardFlag,
                entriesKeys,
            };
            return cached;
        };
    }, [navigation]);

    const rawState = useSyncExternalStore(
        navigation ? subscribeNavigation(navigation) : () => () => {},
        getSnapshot,
        () => ({
            currentKey: '',
            canGoBackFlag: false,
            canGoForwardFlag: false,
            entriesKeys: [] as string[],
        })
    );

    // Map для O(1) поиска historyIndex
    const keyToIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        rawState.entriesKeys.forEach((key, index) => {
            map.set(key, index);
        });
        return map;
    }, [rawState.entriesKeys]);

    // 2. Производное состояние роутера (мемоизировано). Один вызов getCompiledPattern на рендер.
    const routerState: RouterState & {
        _entriesKeys: string[];
    } = useMemo(() => {
        const currentEntry = navigation?.currentEntry ?? null;
        const urlStr = currentEntry?.url ?? (isBrowser ? window.location.href : '/');
        const parsed = getCachedParsedUrl(urlStr);
        const pathname = parsed.pathname;

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
            searchParams: parsed.searchParams,
            params,
            historyIndex,
            matched,
            _entriesKeys: rawState.entriesKeys,
        };
    }, [navigation, rawState.currentKey, rawState.entriesKeys, pattern, keyToIndexMap]);

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
