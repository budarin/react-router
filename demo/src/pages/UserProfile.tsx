import { useRoute } from '@budarin/use-route';
import { Link } from '../components/Link';

export function UserProfile() {
    const { pathname, params, matched } = useRoute('/users/:id');

    return (
        <div className="demo-content">
            <h1>Профиль пользователя</h1>
            <p className="demo-lead">
                Хук вызван с шаблоном <code>/users/:id</code>. Из текущего адреса он достал параметр{' '}
                <code>id</code> — ниже видно его значение. Кнопки ведут к списку или к другому
                пользователю.
            </p>
            <p>
                Адрес: <code>{pathname}</code> → параметр <code>id</code> ={' '}
                <strong>{params.id ?? '—'}</strong>
                {matched !== undefined && (
                    <>
                        {' '}
                        (шаблон совпал: <strong>{matched ? 'да' : 'нет'}</strong>)
                    </>
                )}
            </p>
            <h2>Действия</h2>
            <div className="demo-buttons">
                <Link to="/users">Вернуться к списку пользователей</Link>
                <Link to="/users/2">Перейти к пользователю №2</Link>
                <Link to="/users/3">Перейти к пользователю №3</Link>
            </div>
        </div>
    );
}
