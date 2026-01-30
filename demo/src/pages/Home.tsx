import { useRoute } from '@budarin/use-route';
import { Link } from '../components/Link';

export function Home() {
    const { pathname, navigate } = useRoute();

    return (
        <div className="demo-content">
            <h1>Демо: хук useRoute</h1>
            <p className="demo-lead">
                Это демо-приложение показывает, как работает хук <code>@budarin/use-route</code>:
                навигация, параметры в URL, история браузера и другие возможности. Выберите раздел в
                меню выше или кнопкой ниже — на каждой странице коротко объяснено, что именно там
                показано.
            </p>
            <p>
                Сейчас в адресной строке путь: <code>{pathname}</code>
            </p>
            <h2>Куда перейти</h2>
            <div className="demo-buttons">
                <button type="button" onClick={() => navigate('/users')}>
                    Пользователи — параметр в URL (например /users/123)
                </button>
                <button type="button" onClick={() => navigate('/posts')}>
                    Посты — параметры в строке запроса (?page=2)
                </button>
                <button type="button" onClick={() => navigate('/history')}>
                    История — кнопки «Назад» и «Вперёд»
                </button>
                <button type="button" onClick={() => navigate('/push-replace')}>
                    Push и Replace — как добавлять или заменять запись в истории
                </button>
                <Link to="/products/books/1">Товары — свой разбор пути (PathMatcher)</Link>
                <Link to="/base-demo">Раздел (section)</Link>
            </div>
        </div>
    );
}
