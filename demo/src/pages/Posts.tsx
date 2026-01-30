import { useRoute } from '@budarin/use-route';

export function Posts() {
    const { pathname, searchParams, navigate } = useRoute('/posts');
    const pageParam = searchParams.get('page') ?? '1';
    const page = Math.max(1, parseInt(pageParam, 10) || 1);

    return (
        <div className="demo-content">
            <h1>Посты (параметры в строке запроса)</h1>
            <p className="demo-lead">
                Здесь демонстрируется работа с параметрами после <code>?</code> в URL (например{' '}
                <code>?page=2</code>). Хук отдаёт их через <code>searchParams</code>. Кнопки «Пред.»
                и «След.» меняют номер страницы в адресе.
            </p>
            <p>
                Сейчас открыта страница: <strong>{page}</strong> (в адресе:{' '}
                <code>
                    {pathname}
                    {page > 1 ? `?page=${page}` : ''}
                </code>
                )
            </p>
            <h2>Переключение страниц</h2>
            <div className="demo-buttons">
                <button
                    type="button"
                    onClick={() => navigate(`/posts?page=${page - 1}`)}
                    disabled={page <= 1}
                >
                    ← Предыдущая страница
                </button>
                <span>Страница {page}</span>
                <button type="button" onClick={() => navigate(`/posts?page=${page + 1}`)}>
                    Следующая страница →
                </button>
            </div>
        </div>
    );
}
