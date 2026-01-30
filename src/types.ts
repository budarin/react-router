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

/** Имя параметра маршрута (ключ в params). */
export type RouteParamName = string;

/** Значение параметра маршрута (сегмент pathname). */
export type RouteParamValue = string;

/** Параметры маршрута: имя параметра → значение (из pathname по паттерну). */
export type RouteParams = Record<RouteParamName, RouteParamValue>;

/** Функция-матчер пути: pathname → matched и params. Для иерархических/кастомных маршрутов. */
export type PathMatcher = (pathname: Pathname) => { matched: boolean; params: RouteParams };

// ===== Публичный API хука =====

/** Извлекает тип params из строки паттерна: '/users/:id' → { id: string } */
export type ExtractRouteParams<T extends string> =
    T extends `${string}:${infer Param}/${infer Rest}`
        ? { [K in Param]: string } & ExtractRouteParams<`/${Rest}`>
        : T extends `${string}:${infer Param}`
          ? { [K in Param]: string }
          : Record<string, never>;

/** Тип params для useRoute(pattern): литерал пути → типизированные ключи; PathMatcher → RouteParams; иначе {} */
export type ParamsForPath<P> = P extends PathMatcher
    ? RouteParams
    : [P] extends [string]
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

export type UseRouteReturn<P extends string | PathMatcher | undefined = undefined> = Omit<
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
