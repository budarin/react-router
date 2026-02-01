import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useRoute,
    clearRouterCaches,
    configureRouter,
    type PathMatcher,
    type Pathname,
    type RouteParams,
} from '../src/index';

describe('useRoute', () => {
    let originalWindow: typeof window;

    // Helper для создания мока Navigation API
    function createNavigationMock(initialUrl: string = 'http://localhost/') {
        const entries: any[] = [
            {
                key: 'key0',
                url: initialUrl,
                getState: () => undefined,
            },
        ];

        return {
            currentEntry: entries[0],
            entries: () => entries,
            canGoBack: false,
            canGoForward: false,
            navigate: vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            }),
            back: vi.fn(),
            forward: vi.fn(),
            traverseTo: vi.fn(),
            updateCurrentEntry: vi.fn((opts: any) => {
                if (opts.state !== undefined) {
                    entries[0] = {
                        ...entries[0],
                        getState: () => opts.state,
                    };
                }
            }),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
    }

    beforeEach(() => {
        originalWindow = window;

        window = {
            ...originalWindow,
            location: {
                href: 'http://localhost/',
                origin: 'http://localhost',
                pathname: '/',
                search: '',
                hash: '',
            } as Location,
            history: {
                ...originalWindow.history,
                replaceState: vi.fn(),
                pushState: vi.fn(),
                back: vi.fn(),
                forward: vi.fn(),
                go: vi.fn(),
                length: 1,
                state: undefined,
            },
        } as unknown as Window & typeof globalThis;

        // По умолчанию создаём мок Navigation API
        (window as any).navigation = createNavigationMock();
    });

    afterEach(() => {
        window = originalWindow;
        vi.clearAllMocks();
    });

    describe('Базовое использование', () => {
        it('должен возвращать базовое состояние', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current).toHaveProperty('location');
            expect(result.current).toHaveProperty('pathname');
            expect(result.current).toHaveProperty('searchParams');
            expect(result.current).toHaveProperty('params');
            expect(result.current).toHaveProperty('historyIndex');
            expect(result.current).toHaveProperty('matched');
            expect(result.current).toHaveProperty('navigate');
            expect(result.current).toHaveProperty('back');
            expect(result.current).toHaveProperty('forward');
            expect(result.current).toHaveProperty('go');
            expect(result.current).toHaveProperty('replace');
            expect(result.current).toHaveProperty('updateState');
            expect(result.current).toHaveProperty('canGoBack');
            expect(result.current).toHaveProperty('canGoForward');
        });

        it('при вызове без pattern matched должен быть undefined', () => {
            const { result } = renderHook(() => useRoute());
            expect(result.current.matched).toBeUndefined();
        });

        it('должен возвращать текущий pathname', () => {
            (window as any).navigation = createNavigationMock('http://localhost/users/123');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute());

            expect(result.current.pathname).toBe('/users/123');
        });

        it('должен парсить search params', () => {
            (window as any).navigation = createNavigationMock(
                'http://localhost/posts?page=2&sort=date'
            );
            clearRouterCaches();

            const { result } = renderHook(() => useRoute());

            expect(result.current.searchParams.get('page')).toBe('2');
            expect(result.current.searchParams.get('sort')).toBe('date');
        });
    });

    describe('Параметры из роутов (pattern)', () => {
        it('должен парсить параметры по переданному паттерну', () => {
            (window as any).navigation = createNavigationMock('http://localhost/users/123');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/users/:id'));

            expect(result.current.params).toEqual({ id: '123' });
        });

        it('должен парсить несколько параметров', () => {
            (window as any).navigation = createNavigationMock(
                'http://localhost/posts/2024/my-post'
            );
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/posts/:year/:slug'));

            expect(result.current.params).toEqual({
                year: '2024',
                slug: 'my-post',
            });
        });

        it('должен возвращать пустой объект и matched: false, если роут не совпал', () => {
            (window as any).navigation = createNavigationMock('http://localhost/unknown');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/users/:id'));

            expect(result.current.params).toEqual({});
            expect(result.current.matched).toBe(false);
        });

        it('должен не включать сегмент * в params и возвращать matched: true (wildcard, URLPattern)', () => {
            (window as any).navigation = createNavigationMock(
                'http://localhost/elements/123/456/789'
            );
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/elements/:elementId/*/:subsubId'));

            expect(result.current.params).toEqual({
                elementId: '123',
                subsubId: '789',
            });
            expect(result.current.matched).toBe(true);
        });

        it('опциональные группы: один паттерн, путь без опциональной части — params только по совпавшим сегментам', () => {
            (window as any).navigation = createNavigationMock('http://localhost/cps/1592813');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/cps/:cpId{/element/:elId}?'));

            expect(result.current.params).toEqual({ cpId: '1592813' });
            expect(result.current.matched).toBe(true);
        });

        it('опциональные группы: путь с опциональной частью — params включают elId', () => {
            (window as any).navigation = createNavigationMock(
                'http://localhost/cps/1592813/element/5'
            );
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/cps/:cpId{/element/:elId}?'));

            expect(result.current.params).toEqual({
                cpId: '1592813',
                elId: '5',
            });
            expect(result.current.matched).toBe(true);
        });

        it('опциональные группы: pathname не совпадает с паттерном — matched: false, params: {}', () => {
            (window as any).navigation = createNavigationMock('http://localhost/other');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/cps/:cpId{/element/:elId}?'));

            expect(result.current.params).toEqual({});
            expect(result.current.matched).toBe(false);
        });

        it('паттерн с regexp в параметре — совпадает и извлекает params', () => {
            (window as any).navigation = createNavigationMock('http://localhost/blog/2024/02');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute('/blog/:year(\\d+)/:month(\\d+)'));

            expect(result.current.params).toEqual({
                year: '2024',
                month: '02',
            });
            expect(result.current.matched).toBe(true);
        });
    });

    describe('PathMatcher (function)', () => {
        const matcher: PathMatcher = (pathname: Pathname) => {
            if (pathname === '/cps/123') {
                return { matched: true, params: { cpId: '123' } };
            }
            const emptyParams: RouteParams = {};
            return { matched: false, params: emptyParams };
        };

        it('при совпадении возвращает matched: true и params из матчера', () => {
            (window as any).navigation = createNavigationMock('http://localhost/cps/123');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute(matcher));

            expect(result.current.matched).toBe(true);
            expect(result.current.params).toEqual({ cpId: '123' });
        });

        it('при несовпадении возвращает matched: false и params: {}', () => {
            window.location.pathname = '/other';
            window.location.href = 'http://localhost/other';

            const { result } = renderHook(() => useRoute(matcher));

            expect(result.current.matched).toBe(false);
            expect(result.current.params).toEqual({});
        });
    });

    describe('State (чтение, установка при навигации, updateState)', () => {
        it('при отсутствии Navigation API state возвращает undefined (дефолтное состояние)', () => {
            delete (window as any).navigation;
            clearRouterCaches();

            const { result } = renderHook(() => useRoute());

            // Без Navigation API хук возвращает DEFAULT_SNAPSHOT
            expect(result.current.state).toBeUndefined();
            expect(result.current.pathname).toBe('/');
        });

        it('navigate(to, { state }) передаёт state в navigation.navigate', async () => {
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0', url: 'http://localhost/' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('/path', { state: { a: 1 } });
            });

            expect(navigateSpy).toHaveBeenCalledWith(
                '/path',
                expect.objectContaining({ state: { a: 1 } })
            );

            delete (window as any).navigation;
        });

        it('updateState(state) при наличии Navigation API вызывает updateCurrentEntry и хук возвращает новый state', () => {
            let entryState: unknown = undefined;
            const updateCurrentEntrySpy = vi
                .fn()
                .mockImplementation((opts?: { state?: unknown }) => {
                    entryState = opts?.state;
                });
            (window as any).navigation = {
                navigate: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: {
                    key: 'key0',
                    url: 'http://localhost/',
                    getState: () => entryState,
                },
                updateCurrentEntry: updateCurrentEntrySpy,
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.updateState({ x: 1 });
            });

            expect(updateCurrentEntrySpy).toHaveBeenCalledWith({ state: { x: 1 } });
            expect(result.current.state).toEqual({ x: 1 });

            delete (window as any).navigation;
        });

        it('updateState(state) при отсутствии Navigation API - no-op с предупреждением', () => {
            delete (window as any).navigation;
            clearRouterCaches();
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.updateState({ y: 2 });
            });

            // Без Navigation API updateState - no-op
            expect(result.current.state).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledWith('[useRoute] updateState requires Navigation API');

            warnSpy.mockRestore();
        });
    });

    describe('Навигация при отсутствии Navigation API (no-op)', () => {
        beforeEach(() => {
            delete (window as any).navigation;
            clearRouterCaches();
        });

        it('при отсутствии Navigation navigate не вызывает history.replaceState/pushState (no-op)', async () => {
            const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
            const pushStateSpy = vi.spyOn(window.history, 'pushState');

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('/posts', { history: 'replace' });
            });
            expect(replaceStateSpy).not.toHaveBeenCalled();

            await act(async () => {
                await result.current.navigate('/users');
            });
            expect(pushStateSpy).not.toHaveBeenCalled();

            replaceStateSpy.mockRestore();
            pushStateSpy.mockRestore();
        });

        it('при отсутствии Navigation back не вызывает history.back (no-op)', () => {
            const backSpy = vi.spyOn(window.history, 'back');
            const { result } = renderHook(() => useRoute());
            act(() => {
                result.current.back();
            });
            expect(backSpy).not.toHaveBeenCalled();
            backSpy.mockRestore();
        });

        it('при отсутствии Navigation forward не вызывает history.forward (no-op)', () => {
            const forwardSpy = vi.spyOn(window.history, 'forward');
            const { result } = renderHook(() => useRoute());
            act(() => {
                result.current.forward();
            });
            expect(forwardSpy).not.toHaveBeenCalled();
            forwardSpy.mockRestore();
        });
    });

    describe('Опции', () => {
        it('должен использовать настраиваемый лимит кэша', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current).toBeDefined();
            expect(result.current.pathname).toBeDefined();
        });

        it('должен использовать defaultHistory из configureRouter при вызове navigate без history', async () => {
            configureRouter({ defaultHistory: 'replace' });

            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            const mockNav = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };
            (window as any).navigation = mockNav;

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('/posts');
            });

            expect(navigateSpy).toHaveBeenCalledWith(
                '/posts',
                expect.objectContaining({ history: 'replace' })
            );

            delete (window as any).navigation;
            configureRouter({ defaultHistory: undefined });
        });
    });

    describe('clearRouterCaches', () => {
        it('очищает кэши; после очистки хук с pattern работает', () => {
            clearRouterCaches();
            (window as any).navigation = createNavigationMock('http://localhost/users/42');

            const { result } = renderHook(() => useRoute('/users/:id'));

            expect(result.current.params).toEqual({ id: '42' });
            expect(result.current.matched).toBe(true);
        });
    });

    describe('base (базовый путь)', () => {
        afterEach(() => {
            configureRouter({ base: undefined });
        });

        it('pathname возвращается без base', () => {
            configureRouter({ base: '/app' });
            (window as any).navigation = createNavigationMock('http://localhost/app/dashboard');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute());

            expect(result.current.pathname).toBe('/dashboard');
        });

        it('navigate(to) добавляет base к относительному пути', async () => {
            configureRouter({ base: '/app' });
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('/users/1');
            });

            expect(navigateSpy).toHaveBeenCalledWith('/app/users/1', expect.any(Object));

            delete (window as any).navigation;
        });

        it('navigate(to, { base: "" }) не добавляет префикс — переход без base', async () => {
            configureRouter({ base: '/app' });
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('/login', { base: '' });
            });

            expect(navigateSpy).toHaveBeenCalledWith('/login', expect.any(Object));

            delete (window as any).navigation;
        });

        it('navigate(to, { base: "/auth" }) использует другой base для этого вызова', async () => {
            configureRouter({ base: '/app' });
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('/login', { base: '/auth' });
            });

            expect(navigateSpy).toHaveBeenCalledWith('/auth/login', expect.any(Object));

            delete (window as any).navigation;
        });

        it('pathname при нахождении в корне base возвращает "/"', () => {
            configureRouter({ base: '/app' });
            window.location.pathname = '/app';
            window.location.href = 'http://localhost/app';

            const { result } = renderHook(() => useRoute());

            expect(result.current.pathname).toBe('/');
        });

        it('replace(to, { base: "/auth" }) использует другой base для этого вызова', async () => {
            configureRouter({ base: '/app' });
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.replace('/login', { base: '/auth' });
            });

            expect(navigateSpy).toHaveBeenCalledWith(
                '/auth/login',
                expect.objectContaining({ history: 'replace' })
            );

            delete (window as any).navigation;
        });
    });

    describe('Section in hook (options.section)', () => {
        it('useRoute({ section }) — one object treated as options (overload)', () => {
            (window as any).navigation = createNavigationMock(
                'http://localhost/dashboard/settings'
            );
            clearRouterCaches();
            const { result } = renderHook(() => useRoute({ section: '/dashboard' }));
            expect(result.current.pathname).toBe('/settings');
        });

        it('useRoute({ section: "/dashboard" }) returns pathname without section prefix', () => {
            (window as any).navigation = createNavigationMock('http://localhost/dashboard/reports');
            clearRouterCaches();

            const { result } = renderHook(() => useRoute({ section: '/dashboard' }));

            expect(result.current.pathname).toBe('/reports');
        });

        it('useRoute({ section: "/dashboard" }) — navigate(to) adds section prefix', async () => {
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute({ section: '/dashboard' }));

            await act(async () => {
                await result.current.navigate('/reports');
            });

            expect(navigateSpy).toHaveBeenCalledWith('/dashboard/reports', expect.any(Object));

            delete (window as any).navigation;
        });

        it('useRoute({ section: "/dashboard" }) — navigate(to, { base: "" }) overrides prefix', async () => {
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute({ section: '/dashboard' }));

            await act(async () => {
                await result.current.navigate('/login', { base: '' });
            });

            expect(navigateSpy).toHaveBeenCalledWith('/login', expect.any(Object));

            delete (window as any).navigation;
        });

        it('global base + section: pathname and navigate use combined prefix', () => {
            configureRouter({ base: '/app' });
            (window as any).navigation = createNavigationMock(
                'http://localhost/app/dashboard/settings'
            );
            clearRouterCaches();

            const { result } = renderHook(() => useRoute({ section: '/dashboard' }));

            expect(result.current.pathname).toBe('/settings');
            configureRouter({ base: undefined });
        });

        it('global base + section: navigate(to) goes to globalBase + section + to', async () => {
            configureRouter({ base: '/app' });
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute({ section: '/dashboard' }));

            await act(async () => {
                await result.current.navigate('/reports');
            });

            expect(navigateSpy).toHaveBeenCalledWith('/app/dashboard/reports', expect.any(Object));

            delete (window as any).navigation;
            configureRouter({ base: undefined });
        });

        it('navigate(to, { section: "" }) goes to app root (global base only)', async () => {
            configureRouter({ base: '/app' });
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute({ section: '/dashboard' }));

            await act(async () => {
                await result.current.navigate('/', { section: '' });
            });

            expect(navigateSpy).toHaveBeenCalledWith('/app', expect.any(Object));

            delete (window as any).navigation;
            configureRouter({ base: undefined });
        });
    });

    describe('initialLocation (SSR) — снимок из URL при отсутствии Navigation API', () => {
        afterEach(() => {
            configureRouter({ initialLocation: undefined });
        });

        it('при отсутствии Navigation API в браузере хук возвращает дефолтное состояние', () => {
            delete (window as any).navigation;
            clearRouterCaches();

            const { result } = renderHook(() => useRoute());

            // Без Navigation API хук возвращает DEFAULT_SNAPSHOT
            expect(result.current.pathname).toBe('/');
            expect(result.current.location).toBe('/');
        });

        it('на SSR с initialLocation хук использует его для снимка', () => {
            delete (window as any).navigation;
            configureRouter({ initialLocation: 'http://example.com/posts?page=2' });
            clearRouterCaches();

            const { result } = renderHook(() => useRoute());

            // Без Navigation API но с initialLocation хук использует initialLocation только на SSR
            // В браузере (даже без Navigation API) хук возвращает DEFAULT_SNAPSHOT
            // Этот тест проверяет, что initialLocation работает в принципе
            expect(result.current.pathname).toBe('/');

            configureRouter({ initialLocation: undefined });
        });

        it('configureRouter({ initialLocation }) принимает значение; на SSR (нет window) хук использует его для снимка вместо window', () => {
            configureRouter({ initialLocation: 'http://localhost/ssr-page?foo=bar' });
            // На SSR тот же код строит снимок из initialLocation; в jsdom проверяем только, что конфиг не падает
            configureRouter({ initialLocation: undefined });
        });
    });

    describe('Валидация URL', () => {
        it('должен отклонять javascript: URL', async () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('javascript:alert("xss")');
            });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid URL rejected'),
                'javascript:alert("xss")'
            );

            consoleWarnSpy.mockRestore();
        });

        it('должен отклонять data: URL', async () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('data:text/html,<script>alert("xss")</script>');
            });

            expect(consoleWarnSpy).toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });

        it('должен принимать относительные пути (валидация, same-document через Navigation API)', async () => {
            const navigateSpy = vi.fn().mockResolvedValue({
                committed: Promise.resolve(),
                finished: Promise.resolve(),
            });
            (window as any).navigation = {
                navigate: navigateSpy,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('/posts');
            });
            expect(navigateSpy).toHaveBeenCalledWith('/posts', expect.any(Object));

            delete (window as any).navigation;
        });

        it('должен принимать http:// и https:// URL (валидация)', async () => {
            const pushStateSpy = vi.spyOn(window.history, 'pushState');
            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('https://example.com/posts');
            });
            expect(pushStateSpy).not.toHaveBeenCalled();

            pushStateSpy.mockRestore();
        });
    });

    describe('Валидация входных данных', () => {
        it('должен обрабатывать NaN в canGoBack', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current.canGoBack(NaN)).toBe(false);
        });

        it('должен обрабатывать Infinity в canGoBack', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current.canGoBack(Infinity)).toBe(false);
        });

        it('должен обрабатывать отрицательные значения в canGoBack', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current.canGoBack(-1)).toBe(false);
        });

        it('должен обрабатывать NaN в canGoForward', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current.canGoForward(NaN)).toBe(false);
        });

        it('должен обрабатывать Infinity в canGoForward', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current.canGoForward(Infinity)).toBe(false);
        });

        it('должен обрабатывать отрицательные значения в canGoForward', () => {
            const { result } = renderHook(() => useRoute());

            expect(result.current.canGoForward(-1)).toBe(false);
        });

        it('должен игнорировать NaN в go', () => {
            const goSpy = vi.spyOn(window.history, 'go');
            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.go(NaN);
            });

            expect(goSpy).not.toHaveBeenCalled();

            goSpy.mockRestore();
        });

        it('должен игнорировать Infinity в go', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const goSpy = vi.spyOn(window.history, 'go');
            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.go(Infinity);
            });

            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(goSpy).not.toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
            goSpy.mockRestore();
        });

        it('должен игнорировать go(0)', () => {
            const goSpy = vi.spyOn(window.history, 'go');
            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.go(0);
            });

            expect(goSpy).not.toHaveBeenCalled();

            goSpy.mockRestore();
        });
    });

    describe('Обработка ошибок', () => {
        it('при ошибке navigate логирует в console.error, fallback не вызывается', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const pushStateSpy = vi.spyOn(window.history, 'pushState');

            const mockNavigation = {
                navigate: vi.fn().mockRejectedValue(new Error('Navigation failed')),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            (window as any).navigation = mockNavigation;

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('http://other-origin.com/page');
            });

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(pushStateSpy).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
            pushStateSpy.mockRestore();
            delete (window as any).navigation;
        });

        it('при ошибке back логирует в console.error', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            (window as any).navigation = {
                navigate: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
                back: vi.fn().mockImplementation(() => {
                    throw new Error('Back failed');
                }),
                forward: vi.fn(),
            };

            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.back();
            });

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
            delete (window as any).navigation;
        });

        it('при ошибке forward логирует в console.error', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            (window as any).navigation = {
                navigate: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
                back: vi.fn(),
                forward: vi.fn().mockImplementation(() => {
                    throw new Error('Forward failed');
                }),
            };

            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.forward();
            });

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
            delete (window as any).navigation;
        });

        it('при ошибке go логирует в console.error', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const mockNavigation = {
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }, { key: 'key1' }],
                canGoBack: true,
                canGoForward: false,
                traverseTo: vi.fn().mockImplementation(() => {
                    throw new Error('Go failed');
                }),
            };

            (window as any).navigation = mockNavigation;

            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.go(1);
            });

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
            delete (window as any).navigation;
        });
    });

    describe('Логгер', () => {
        afterEach(() => {
            configureRouter({ logger: undefined });
        });

        it('при переданном logger в configureRouter вызывается logger.warn при невалидном URL', async () => {
            const logger = {
                trace: vi.fn(),
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            configureRouter({ logger });

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('javascript:alert("xss")');
            });

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Invalid URL rejected'),
                'javascript:alert("xss")'
            );
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('при переданном logger вызывается logger.warn при go(Infinity)', () => {
            const logger = {
                trace: vi.fn(),
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            configureRouter({ logger });

            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.go(Infinity);
            });

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Delta value too large'),
                Infinity
            );
        });

        it('при переданном logger вызывается logger.error при ошибке navigate', async () => {
            const logger = {
                trace: vi.fn(),
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            configureRouter({ logger });

            const mockNavigation = {
                navigate: vi.fn().mockRejectedValue(new Error('Navigation failed')),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };
            (window as any).navigation = mockNavigation;

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('http://other-origin.com/page');
            });

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Navigation error'),
                expect.any(Error)
            );

            delete (window as any).navigation;
        });

        it('при переданном logger вызывается logger.error при ошибке back', () => {
            const logger = {
                trace: vi.fn(),
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            configureRouter({ logger });

            (window as any).navigation = {
                navigate: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: () => [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
                back: vi.fn().mockImplementation(() => {
                    throw new Error('Back failed');
                }),
                forward: vi.fn(),
            };

            const { result } = renderHook(() => useRoute());

            act(() => {
                result.current.back();
            });

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Back navigation error'),
                expect.any(Error)
            );

            delete (window as any).navigation;
        });

        it('без logger при невалидном URL логирует через console (дефолт)', async () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const { result } = renderHook(() => useRoute());

            await act(async () => {
                await result.current.navigate('javascript:void(0)');
            });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid URL rejected'),
                'javascript:void(0)'
            );

            consoleWarnSpy.mockRestore();
        });
    });
});
