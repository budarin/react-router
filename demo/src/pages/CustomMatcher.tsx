import { useRoute, type PathMatcher, type RouteParams } from '@budarin/use-route';
import { Link } from '../components/Link';

const matchProducts: PathMatcher = (pathname): { matched: boolean; params: RouteParams } => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'products' || !parts[1] || !parts[2]) {
        return { matched: false, params: {} };
    }
    return {
        matched: true,
        params: { category: parts[1], id: parts[2] },
    };
};

export function CustomMatcher() {
    const { pathname, matched, params } = useRoute(matchProducts);

    return (
        <div className="demo-content">
            <h1>Свой разбор пути (PathMatcher)</h1>
            <p className="demo-lead">
                Кроме шаблона строкой (как <code>/users/:id</code>) можно передать функцию, которая
                сама разбирает путь и возвращает <code>matched</code> и <code>params</code>. Здесь
                путь вида <code>/products/категория/id</code> разбивается на категорию и id —
                например «книги» и «1». Выберите ссылку ниже, чтобы увидеть разные значения.
            </p>
            <p>
                Адрес: <code>{pathname}</code>
                {matched && (
                    <>
                        {' '}
                        → категория: <strong>{params.category}</strong>, id:{' '}
                        <strong>{params.id}</strong>
                    </>
                )}
            </p>
            <h2>Примеры ссылок</h2>
            <div className="demo-buttons">
                <Link to="/products/books/1">Книги, товар 1</Link>
                <Link to="/products/books/2">Книги, товар 2</Link>
                <Link to="/products/electronics/1">Электроника, товар 1</Link>
            </div>
        </div>
    );
}
