import { useRoute } from '@budarin/use-route';
import { Link } from '../components/Link';

export function PushReplace() {
    const { pathname, navigate, replace } = useRoute();

    return (
        <div className="demo-content">
            <h1>Push и Replace</h1>
            <p className="demo-lead">
                При переходе можно либо <strong>добавить</strong> новую запись в историю (push) —
                тогда кнопка «Назад» вернёт на эту страницу, либо <strong>заменить</strong> текущую
                запись (replace) — тогда «Назад» сюда не приведёт. Ниже три кнопки: первая добавляет
                запись, вторая и третья заменяют. Поэкспериментируйте с «Назад» после каждого
                нажатия.
            </p>
            <p>
                Текущий адрес: <code>{pathname}</code>
            </p>
            <h2>Куда перейти</h2>
            <div className="demo-buttons">
                <button
                    type="button"
                    onClick={() => navigate('/push-replace/step-a', { history: 'push' })}
                >
                    Перейти на «Шаг A» (добавить в историю — «Назад» вернёт сюда)
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/push-replace/step-b', { history: 'replace' })}
                >
                    Перейти на «Шаг B» (заменить текущую страницу — «Назад» сюда не вернёт)
                </button>
                <button type="button" onClick={() => replace('/push-replace/step-c')}>
                    Заменить на «Шаг C» (то же, что replace)
                </button>
            </div>
            <p>
                <Link to="/push-replace">Вернуться в начало этого раздела</Link>
            </p>
        </div>
    );
}
