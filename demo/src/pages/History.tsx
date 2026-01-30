import { useRoute } from '@budarin/use-route';

export function History() {
    const { historyIndex, back, forward, go, canGoBack, canGoForward } = useRoute();

    return (
        <div className="demo-content">
            <h1>История браузера</h1>
            <p className="demo-lead">
                Хук даёт доступ к истории: переход «Назад», «Вперёд» и на N шагов (
                <code>go(-2)</code>,<code>go(1)</code>). Перед переходом можно проверить{' '}
                <code>canGoBack()</code> и <code>canGoForward()</code>, чтобы не нажимать в пустоту.
                Сначала перейдите по нескольким ссылкам в меню, затем используйте кнопки ниже — они
                работают так же, как стрелки в шапке.
            </p>
            <p>
                Текущая позиция в истории: <strong>{historyIndex}</strong> (0 — самая новая).
            </p>
            <h2>Переход по истории</h2>
            <div className="demo-buttons">
                <button type="button" onClick={() => back()} disabled={!canGoBack()}>
                    ← Назад (на 1 шаг)
                </button>
                <button type="button" onClick={() => go(-2)} disabled={!canGoBack(2)}>
                    ← На 2 шага назад
                </button>
                <button type="button" onClick={() => go(1)} disabled={!canGoForward()}>
                    На 1 шаг вперёд →
                </button>
                <button type="button" onClick={() => forward()} disabled={!canGoForward()}>
                    Вперёд →
                </button>
            </div>
        </div>
    );
}
