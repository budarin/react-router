/**
 * Базовая навигация: pathname, navigate()
 * Копируй в свой проект и подключай компонент.
 */
import { useRouter } from '@budarin/react-router';

export function BasicNavigationExample() {
    const { pathname, navigate } = useRouter();

    return (
        <div>
            <p>Текущий путь: {pathname}</p>
            <button type="button" onClick={() => navigate('/posts')}>
                К постам
            </button>
            <button type="button" onClick={() => navigate('/')}>
                На главную
            </button>
        </div>
    );
}
