/**
 * Временные объявления нативного API до появления типов в lib.dom.
 * Когда URLPattern и Navigation API появятся в TypeScript lib.dom — удалить этот файл
 * и убрать реэкспорт из types.ts (или перейти на типы из lib).
 *
 * Источники: WHATWG URL Pattern Standard, MDN/WHATWG Navigation API.
 */

// ===== URLPattern (пока нет в lib.dom) =====
declare global {
    interface URLPatternOptions {
        ignoreCase?: boolean;
    }

    class URLPattern {
        constructor(init?: URLPatternInit, options?: URLPatternOptions);
        test(input: URLPatternInit | string): boolean;
        exec(input: URLPatternInit | string): URLPatternResult | null;
    }

    interface URLPatternInit {
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

    interface URLPatternResult {
        pathname: { groups: Record<string, string> };
        search: { groups: Record<string, string> };
        hash: { groups: Record<string, string> };
    }
}

// ===== Navigation API (NavigationHistoryEntry уже в lib.dom; ниже только то, чего нет) =====
export interface NavigationDestination {
    readonly url: string;
    readonly key: string;
    readonly id: string;
    readonly index: number;
    readonly sameDocument: boolean;
}

export interface NavigateEvent extends Event {
    readonly destination: NavigationDestination;
    readonly canIntercept: boolean;
    intercept(options?: { handler?: () => void | Promise<void> }): void;
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
    entries(): NavigationHistoryEntry[];
    readonly canGoBack: boolean;
    readonly canGoForward: boolean;
    navigate(
        url: string | URL,
        options?: NavigationNavigateOptions
    ): Promise<NavigationNavigateResult>;
    back(): void;
    forward(): void;
    traverseTo(key: string, options?: { info?: unknown }): NavigationNavigateResult;
    updateCurrentEntry(options?: { state?: unknown }): void;
}

export {};
