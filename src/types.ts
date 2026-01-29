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

// ===== Семантические алиасы (избегаем голых string/number где есть смысл) =====

/** Строка — полный URL. */
export type UrlString = string;

/** Строка — паттерн пути (например '/users/:id'). */
export type PathPattern = string;

/** Строка — pathname, часть пути URL (например '/users/123'). */
export type Pathname = string;

/** Ключ записи в Navigation API (history entry key). */
export type NavigationEntryKey = string;

/** Индекс в истории навигации. */
export type HistoryIndex = number;

/** Параметры маршрута: имя параметра → значение (из pathname по паттерну). */
export type RouteParams = Record<string, string>;

// ===== Публичный API хука =====

/** Извлекает тип params из строки паттерна: '/users/:id' → { id: string } */
export type ExtractRouteParams<T extends string> =
    T extends `${string}:${infer Param}/${infer Rest}`
        ? { [K in Param]: string } & ExtractRouteParams<`/${Rest}`>
        : T extends `${string}:${infer Param}`
          ? { [K in Param]: string }
          : Record<string, never>;

/** Тип params для useRouter(pattern): литерал пути → типизированные ключи, string/undefined → Record или {} */
export type ParamsForPath<P> = [P] extends [string]
    ? string extends P
        ? RouteParams
        : ExtractRouteParams<P>
    : Record<string, never>;

export interface RouterState {
    location: UrlString;
    pathname: Pathname;
    /** Только чтение. Мутировать не следует — не меняет реальный URL. */
    searchParams: URLSearchParams;
    params: RouteParams;
    historyIndex: HistoryIndex;
    /** true, если передан pattern и он совпал с pathname; false при несовпадении; undefined, если pattern не передан */
    matched?: boolean;
}

export interface NavigateOptions {
    /** 'replace' — заменить текущую запись, 'push' — новая запись, 'auto' — по умолчанию (браузер решает). */
    history?: 'push' | 'replace' | 'auto';
    state?: unknown;
}

export type UseRouterReturn<P extends string | undefined = undefined> = Omit<
    RouterState,
    'params'
> & {
    params: ParamsForPath<P>;
    /** Резолвится при commit навигации (не обязательно при полном finish, см. Navigation API). */
    navigate: (to: string | URL, options?: NavigateOptions) => Promise<void>;
    back: () => void;
    forward: () => void;
    go: (delta: number) => void;
    replace: (to: string | URL, state?: unknown) => Promise<void>;
    canGoBack: (steps?: number) => boolean;
    canGoForward: (steps?: number) => boolean;
};

// Логгер для роутера
export type LoggerLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

// Глобальная конфигурация роутера
export interface RouterConfig {
    /** Максимальное количество URL в кэше (по умолчанию: 50) */
    urlCacheLimit: number;
    /** Значение history по умолчанию для всех вызовов navigate() (по умолчанию: 'auto') */
    defaultHistory?: 'push' | 'replace' | 'auto';
    /** Логгер (по умолчанию: console) */
    logger?: Logger;
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

/**
 * Получить логгер (config.logger ?? console)
 */
export function getLogger(): Logger {
    return routerConfig.logger ?? console;
}
