// Типы для URLPattern (Web API, может быть недоступен в старых браузерах)
export interface URLPatternInit {
    pathname?: string;
    search?: string;
    hash?: string;
    baseURL?: string;
    username?: string;
    password?: string;
    protocol?: string;
    hostname?: string;
    port?: string;
}

export interface URLPatternResult {
    pathname: {
        groups: Record<string, string>;
    };
    search: { groups: Record<string, string> };
    hash: { groups: Record<string, string> };
}

// Объявляем класс URLPattern для использования с instanceof
// В старых браузерах может быть undefined, поэтому используем условную проверку typeof
declare global {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    class URLPattern {
        constructor(init?: URLPatternInit);
        test(input: URLPatternInit | string): boolean;
        exec(input: URLPatternInit | string): URLPatternResult | null;
    }
}

// ===== Типы Navigation API (упрощённые, как на MDN) =====
// MDN/WHATWG: Navigation, NavigationHistoryEntry, traverseTo, navigate, currentEntry, entries()

export interface NavigationHistoryEntry {
    readonly key: string;
    readonly url: string;
    readonly index: number;
    getState(): unknown | null;
    traverseTo(): void;
}

export interface NavigationNavigateOptions {
    state?: unknown;
    history?: 'auto' | 'push' | 'replace';
    info?: unknown;
}

export interface NavigationNavigateResult {
    committed: Promise<void>;
    finished: Promise<void>;
}

export interface Navigation extends EventTarget {
    readonly currentEntry: NavigationHistoryEntry | null;
    readonly entries: NavigationHistoryEntry[];
    readonly canGoBack: boolean;
    readonly canGoForward: boolean;
    navigate(url: string, options?: NavigationNavigateOptions): Promise<NavigationNavigateResult>;
    back(): void;
    forward(): void;
    traverseTo(key: string): void;
    updateCurrentEntry(options?: { state?: unknown }): void;
}

// ===== Публичный API хука =====

export interface RouterState {
    location: string; // полный URL
    pathname: string; // path (/users/123)
    /** Только чтение. Мутировать не следует — не меняет реальный URL. */
    searchParams: URLSearchParams; // ?page=1
    params: Record<string, string>; // { id: '123' } из паттерна
    historyIndex: number; // индекс в истории или -1
    /** true, если передан pattern и он совпал с pathname; false при несовпадении; undefined, если pattern не передан */
    matched?: boolean;
}

export interface NavigateOptions {
    replace?: boolean;
    history?: 'push' | 'replace';
    state?: unknown;
}

export interface UseRouterReturn extends RouterState {
    /** Резолвится при commit навигации (не обязательно при полном finish, см. Navigation API). */
    navigate: (to: string | URL, options?: NavigateOptions) => Promise<void>;
    back: () => void;
    forward: () => void;
    go: (delta: number) => void;
    replace: (to: string | URL, state?: unknown) => Promise<void>;
    canGoBack: (steps?: number) => boolean;
    canGoForward: (steps?: number) => boolean;
}

// Глобальная конфигурация роутера
export interface RouterConfig {
    /** Максимальное количество URL в кэше (по умолчанию: 50) */
    urlCacheLimit: number;
}

// Внутренняя конфигурация (не экспортируется)
let routerConfig: RouterConfig = {
    urlCacheLimit: 50,
};

/**
 * Настройка глобальной конфигурации роутера
 * Вызывается один раз при инициализации приложения
 */
export function configureRouter(config: Partial<RouterConfig>): void {
    routerConfig = { ...routerConfig, ...config };
}

/**
 * Получить текущую конфигурацию (для внутреннего использования)
 */
export function getRouterConfig(): RouterConfig {
    return routerConfig;
}
