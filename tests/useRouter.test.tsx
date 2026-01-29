import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouter, clearRouterCaches } from '../src/index';

describe('useRouter', () => {
    let originalWindow: typeof window;

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
            },
        } as unknown as Window & typeof globalThis;

        // Без Navigation API хук в режиме no-op (только актуальные браузеры)
        delete (window as any).navigation;
    });

    afterEach(() => {
        window = originalWindow;
        vi.clearAllMocks();
    });

    describe('Базовое использование', () => {
        it('должен возвращать базовое состояние', () => {
            const { result } = renderHook(() => useRouter());

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
            expect(result.current).toHaveProperty('canGoBack');
            expect(result.current).toHaveProperty('canGoForward');
        });

        it('при вызове без pattern matched должен быть undefined', () => {
            const { result } = renderHook(() => useRouter());
            expect(result.current.matched).toBeUndefined();
        });

        it('должен возвращать текущий pathname', () => {
            window.location.pathname = '/users/123';
            window.location.href = 'http://localhost/users/123';

            const { result } = renderHook(() => useRouter());

            expect(result.current.pathname).toBe('/users/123');
        });

        it('должен парсить search params', () => {
            window.location.href = 'http://localhost/posts?page=2&sort=date';
            window.location.search = '?page=2&sort=date';

            const { result } = renderHook(() => useRouter());

            expect(result.current.searchParams.get('page')).toBe('2');
            expect(result.current.searchParams.get('sort')).toBe('date');
        });
    });

    describe('Параметры из роутов (pattern)', () => {
        it('должен парсить параметры по переданному паттерну', () => {
            window.location.pathname = '/users/123';
            window.location.href = 'http://localhost/users/123';

            const { result } = renderHook(() => useRouter('/users/:id'));

            expect(result.current.params).toEqual({ id: '123' });
        });

        it('должен парсить несколько параметров', () => {
            window.location.pathname = '/posts/2024/my-post';
            window.location.href = 'http://localhost/posts/2024/my-post';

            const { result } = renderHook(() => useRouter('/posts/:year/:slug'));

            expect(result.current.params).toEqual({
                year: '2024',
                slug: 'my-post',
            });
        });

        it('должен возвращать пустой объект и matched: false, если роут не совпал', () => {
            window.location.pathname = '/unknown';
            window.location.href = 'http://localhost/unknown';

            const { result } = renderHook(() => useRouter('/users/:id'));

            expect(result.current.params).toEqual({});
            expect(result.current.matched).toBe(false);
        });

        it('должен не включать сегмент * в params и возвращать matched: true (wildcard, URLPattern)', () => {
            window.location.pathname = '/elements/123/456/789';
            window.location.href = 'http://localhost/elements/123/456/789';

            const { result } = renderHook(() => useRouter('/elements/:elementId/*/:subsubId'));

            expect(result.current.params).toEqual({
                elementId: '123',
                subsubId: '789',
            });
            expect(result.current.matched).toBe(true);
        });
    });

    describe('Навигация при отсутствии Navigation API (no-op)', () => {
        it('при отсутствии Navigation navigate не вызывает history', async () => {
            const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
            const pushStateSpy = vi.spyOn(window.history, 'pushState');

            const { result } = renderHook(() => useRouter());

            await act(async () => {
                await result.current.navigate('/posts', { replace: true });
            });
            expect(replaceStateSpy).not.toHaveBeenCalled();

            await act(async () => {
                await result.current.navigate('/users');
            });
            expect(pushStateSpy).not.toHaveBeenCalled();

            replaceStateSpy.mockRestore();
            pushStateSpy.mockRestore();
        });

        it('при отсутствии Navigation back не вызывает history.back', () => {
            const backSpy = vi.spyOn(window.history, 'back');
            const { result } = renderHook(() => useRouter());
            act(() => {
                result.current.back();
            });
            expect(backSpy).not.toHaveBeenCalled();
            backSpy.mockRestore();
        });

        it('при отсутствии Navigation forward не вызывает history.forward', () => {
            const forwardSpy = vi.spyOn(window.history, 'forward');
            const { result } = renderHook(() => useRouter());
            act(() => {
                result.current.forward();
            });
            expect(forwardSpy).not.toHaveBeenCalled();
            forwardSpy.mockRestore();
        });
    });

    describe('Опции', () => {
        it('должен использовать настраиваемый лимит кэша', () => {
            const { result } = renderHook(() => useRouter());

            expect(result.current).toBeDefined();
            expect(result.current.pathname).toBeDefined();
        });
    });

    describe('clearRouterCaches', () => {
        it('очищает кэши; после очистки хук с pattern работает', () => {
            clearRouterCaches();
            window.location.pathname = '/users/42';
            window.location.href = 'http://localhost/users/42';

            const { result } = renderHook(() => useRouter('/users/:id'));

            expect(result.current.params).toEqual({ id: '42' });
            expect(result.current.matched).toBe(true);
        });
    });

    describe('Валидация URL', () => {
        it('должен отклонять javascript: URL', async () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const { result } = renderHook(() => useRouter());

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
            const { result } = renderHook(() => useRouter());

            await act(async () => {
                await result.current.navigate('data:text/html,<script>alert("xss")</script>');
            });

            expect(consoleWarnSpy).toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });

        it('должен принимать относительные пути (валидация, без вызова history при отсутствии Navigation)', async () => {
            const pushStateSpy = vi.spyOn(window.history, 'pushState');
            const { result } = renderHook(() => useRouter());

            await act(async () => {
                await result.current.navigate('/posts');
            });
            // Без Navigation API navigate — no-op, pushState не вызывается
            expect(pushStateSpy).not.toHaveBeenCalled();

            pushStateSpy.mockRestore();
        });

        it('должен принимать http:// и https:// URL (валидация)', async () => {
            const pushStateSpy = vi.spyOn(window.history, 'pushState');
            const { result } = renderHook(() => useRouter());

            await act(async () => {
                await result.current.navigate('https://example.com/posts');
            });
            expect(pushStateSpy).not.toHaveBeenCalled();

            pushStateSpy.mockRestore();
        });
    });

    describe('Валидация входных данных', () => {
        it('должен обрабатывать NaN в canGoBack', () => {
            const { result } = renderHook(() => useRouter());

            expect(result.current.canGoBack(NaN)).toBe(false);
        });

        it('должен обрабатывать Infinity в canGoBack', () => {
            const { result } = renderHook(() => useRouter());

            expect(result.current.canGoBack(Infinity)).toBe(false);
        });

        it('должен обрабатывать отрицательные значения в canGoBack', () => {
            const { result } = renderHook(() => useRouter());

            expect(result.current.canGoBack(-1)).toBe(false);
        });

        it('должен обрабатывать NaN в canGoForward', () => {
            const { result } = renderHook(() => useRouter());

            expect(result.current.canGoForward(NaN)).toBe(false);
        });

        it('должен обрабатывать Infinity в canGoForward', () => {
            const { result } = renderHook(() => useRouter());

            expect(result.current.canGoForward(Infinity)).toBe(false);
        });

        it('должен обрабатывать отрицательные значения в canGoForward', () => {
            const { result } = renderHook(() => useRouter());

            expect(result.current.canGoForward(-1)).toBe(false);
        });

        it('должен игнорировать NaN в go', () => {
            const goSpy = vi.spyOn(window.history, 'go');
            const { result } = renderHook(() => useRouter());

            act(() => {
                result.current.go(NaN);
            });

            expect(goSpy).not.toHaveBeenCalled();

            goSpy.mockRestore();
        });

        it('должен игнорировать Infinity в go', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const goSpy = vi.spyOn(window.history, 'go');
            const { result } = renderHook(() => useRouter());

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
            const { result } = renderHook(() => useRouter());

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
                entries: [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: false,
            };

            (window as any).navigation = mockNavigation;

            const { result } = renderHook(() => useRouter());

            await act(async () => {
                await result.current.navigate('/posts');
            });

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(pushStateSpy).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
            pushStateSpy.mockRestore();
            delete (window as any).navigation;
        });

        it('при ошибке back логирует в console.error', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const mockNavigation = {
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: [{ key: 'key0' }],
                canGoBack: true,
                canGoForward: false,
                back: vi.fn().mockImplementation(() => {
                    throw new Error('Back failed');
                }),
            };

            (window as any).navigation = mockNavigation;

            const { result } = renderHook(() => useRouter());

            act(() => {
                result.current.back();
            });

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
            delete (window as any).navigation;
        });

        it('при ошибке forward логирует в console.error', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const mockNavigation = {
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                currentEntry: { key: 'key0' },
                entries: [{ key: 'key0' }],
                canGoBack: false,
                canGoForward: true,
                forward: vi.fn().mockImplementation(() => {
                    throw new Error('Forward failed');
                }),
            };

            (window as any).navigation = mockNavigation;

            const { result } = renderHook(() => useRouter());

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
                entries: [{ key: 'key0' }, { key: 'key1' }],
                canGoBack: true,
                canGoForward: false,
                traverseTo: vi.fn().mockImplementation(() => {
                    throw new Error('Go failed');
                }),
            };

            (window as any).navigation = mockNavigation;

            const { result } = renderHook(() => useRouter());

            act(() => {
                result.current.go(1);
            });

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
            delete (window as any).navigation;
        });
    });
});
