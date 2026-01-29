/**
 * Параметры пути: useRouter('/users/:id'), params
 * URLPattern извлекает :id из pathname.
 */
import { useRouter } from '@budarin/react-router';

export function ParamsExample() {
    const { params, pathname, navigate } = useRouter('/users/:id');

    return (
        <div>
            <p>Pathname: {pathname}</p>
            <p>User ID из params: {params.id ?? '—'}</p>
            <button type="button" onClick={() => navigate('/users/123')}>
                User 123
            </button>
            <button type="button" onClick={() => navigate('/users/456')}>
                User 456
            </button>
        </div>
    );
}
