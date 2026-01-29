/**
 * Search params (query): searchParams.get(), навигация с ?page=
 */
import { useRouter } from '@budarin/react-router';

export function SearchParamsExample() {
    const { searchParams, navigate, pathname } = useRouter('/posts');
    const page = searchParams.get('page') ?? '1';
    const pageNum = Number.parseInt(page, 10) || 1;

    return (
        <div>
            <p>Путь: {pathname}</p>
            <p>Страница: {pageNum}</p>
            <button
                type="button"
                onClick={() => navigate(`/posts?page=${pageNum - 1}`)}
                disabled={pageNum <= 1}
            >
                Пред. страница
            </button>
            <button type="button" onClick={() => navigate(`/posts?page=${pageNum + 1}`)}>
                След. страница
            </button>
        </div>
    );
}
