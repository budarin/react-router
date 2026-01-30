import { Link } from '../components/Link';

export function Users() {
    const ids = ['1', '2', '3'];

    return (
        <div className="demo-content">
            <h1>Пользователи</h1>
            <p className="demo-lead">
                Здесь показано, как из URL достаётся параметр: путь вида <code>/users/123</code>{' '}
                даёт в хуке <code>params.id = "123"</code>. Нажмите на любого пользователя —
                откроется его «профиль», а в адресе будет видно номер.
            </p>
            <h2>Выберите пользователя</h2>
            <ul className="demo-list">
                {ids.map((id) => (
                    <li key={id}>
                        <Link to={`/users/${id}`}>Открыть профиль пользователя №{id}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
