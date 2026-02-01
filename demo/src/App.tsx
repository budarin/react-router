import { useRoute } from '@budarin/use-route';
import { Link } from './components/Link';
import { Home } from './pages/Home';
import { Users } from './pages/Users';
import { UserProfile } from './pages/UserProfile';
import { Posts } from './pages/Posts';
import { History } from './pages/History';
import { PushReplace } from './pages/PushReplace';
import { State } from './pages/State';
import { CustomMatcher } from './pages/CustomMatcher';
import { BaseDemo } from './pages/BaseDemo';

function Nav() {
    const { pathname, searchParams, back, forward, canGoBack, canGoForward } = useRoute();
    const section = pathname.startsWith('/base-demo') ? '/base-demo' : '';
    const urlPath = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');

    return (
        <nav className="demo-nav">
            <div className="demo-nav-url" title="Текущий путь (pathname + query)">
                URL: <code>{urlPath || '/'}</code>
            </div>
            <div className="demo-nav-links">
                <button type="button" onClick={() => back()} disabled={!canGoBack()} title="Назад">
                    ←
                </button>
                <button
                    type="button"
                    onClick={() => forward()}
                    disabled={!canGoForward()}
                    title="Вперёд"
                >
                    →
                </button>
                <span style={{ width: '0.5rem' }} />
                <Link
                    to={section || '/'}
                    className={
                        // Вне раздела: Главная активна на pathname === '/'
                        // В разделе: Главная не подсвечивается — активна «Выйти из раздела»
                        !section && pathname === '/' ? 'active' : ''
                    }
                    title="Главная страница демо"
                >
                    Главная
                </Link>
                <Link
                    to={(section || '') + '/users'}
                    className={pathname === (section || '') + '/users' ? 'active' : ''}
                    title="Параметры в URL: /users/123"
                >
                    Пользователи
                </Link>
                <Link
                    to={(section || '') + '/posts'}
                    className={pathname.startsWith((section || '') + '/posts') ? 'active' : ''}
                    title="Параметры в строке запроса: ?page=2"
                >
                    Посты
                </Link>
                <Link
                    to={(section || '') + '/history'}
                    className={pathname === (section || '') + '/history' ? 'active' : ''}
                    title="Назад / Вперёд по истории"
                >
                    История
                </Link>
                <Link
                    to={(section || '') + '/push-replace'}
                    className={
                        pathname.startsWith((section || '') + '/push-replace') ? 'active' : ''
                    }
                    title="Добавить или заменить запись в истории"
                >
                    Push/Replace
                </Link>
                <Link
                    to={(section || '') + '/state'}
                    className={pathname.startsWith((section || '') + '/state') ? 'active' : ''}
                    title="State: установка при навигации, чтение, updateState"
                >
                    State
                </Link>
                <Link
                    to={(section || '') + '/products/books/1'}
                    className={pathname.startsWith((section || '') + '/products') ? 'active' : ''}
                    title="Свой разбор пути (PathMatcher)"
                >
                    Товары
                </Link>
                {!section ? (
                    <Link
                        to="/base-demo"
                        className={pathname.startsWith('/base-demo') ? 'active' : ''}
                        title="Раздел (section) в URL"
                    >
                        Раздел (section)
                    </Link>
                ) : (
                    <Link
                        to="/"
                        className={pathname.startsWith(section) ? 'active' : ''}
                        title="Выйти из раздела в корень приложения"
                    >
                        Выйти из раздела
                    </Link>
                )}
            </div>
        </nav>
    );
}

function RouteView() {
    const { pathname } = useRoute();

    if (pathname.startsWith('/base-demo')) {
        return <BaseDemo />;
    }
    if (pathname === '/') {
        return <Home />;
    }
    if (pathname === '/users') {
        return <Users />;
    }
    if (pathname.startsWith('/users/')) {
        return <UserProfile />;
    }
    if (pathname.startsWith('/posts')) {
        return <Posts />;
    }
    if (pathname === '/history') {
        return <History />;
    }
    if (pathname.startsWith('/push-replace')) {
        return <PushReplace />;
    }
    if (pathname.startsWith('/state')) {
        return <State />;
    }
    if (pathname.startsWith('/products/')) {
        return <CustomMatcher />;
    }

    return (
        <div className="demo-content">
            <h1>404</h1>
            <p>
                Путь <code>{pathname}</code> не найден.
            </p>
            <Link to="/" className="demo-link-btn">
                На главную
            </Link>
        </div>
    );
}

export function App() {
    return (
        <>
            <Nav />
            <RouteView />
        </>
    );
}
