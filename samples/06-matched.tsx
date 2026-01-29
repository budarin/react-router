/**
 * matched: true/false при переданном pattern — совпал pathname или нет.
 * Полезно для условного рендера или редиректа.
 */
import { useRouter } from '@budarin/react-router';

export function MatchedExample() {
    const { pathname, matched, params } = useRouter('/users/:id');

    return (
        <div>
            <p>Pathname: {pathname}</p>
            <p>Pattern /users/:id совпал: {matched === true ? 'да' : 'нет'}</p>
            {matched === true ? (
                <p>User ID: {params.id}</p>
            ) : (
                <p>Это не страница пользователя (path не совпал с /users/:id).</p>
            )}
        </div>
    );
}
