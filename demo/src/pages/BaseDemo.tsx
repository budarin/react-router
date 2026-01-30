import { useRoute } from '@budarin/use-route';
import { Link } from '../components/Link';

const SECTION = '/base-demo';

export function BaseDemo() {
    const { pathname, navigate } = useRoute({ section: SECTION });

    return (
        <div className="demo-content">
            <h1>Раздел с префиксом (локальный base)</h1>
            <p className="demo-lead">
                Когда приложение живёт не в корне сайта, а в подпапке (например <code>/app/</code>),
                можно задать <code>section: '/base-demo'</code>. Тогда внутри раздела{' '}
                <code>pathname</code>
                приходит без префикса, а <code>navigate('/page1')</code> ведёт на{' '}
                <code>/base-demo/page1</code>. Так удобно писать пути «относительно раздела». Ниже —
                кнопки перехода внутри раздела и выход на главную.
            </p>
            <p>
                Сейчас pathname внутри раздела: <code>{pathname || '/'}</code> (в полном адресе к
                нему добавлен префикс <code>/base-demo</code>).
            </p>
            <h2>Действия</h2>
            <div className="demo-buttons">
                <button type="button" onClick={() => navigate('/')}>
                    В начало раздела (/base-demo/)
                </button>
                <button type="button" onClick={() => navigate('/page1')}>
                    Перейти на page1 (в адресе будет /base-demo/page1)
                </button>
                <Link to="/base-demo/page2">Перейти на page2</Link>
                <button type="button" onClick={() => navigate('/', { section: '' })}>
                    Выйти из раздела — на главную страницу
                </button>
                <button type="button" onClick={() => navigate('/login', { base: '' })}>
                    Вне приложения → /login (base: '')
                </button>
                <button type="button" onClick={() => navigate('/profile', { base: '/base-demo' })}>
                    С другим base → /base-demo/profile (base: '/base-demo')
                </button>
            </div>
        </div>
    );
}
