/**
 * История: back(), forward(), go(delta), canGoBack(), canGoForward()
 */
import { useRouter } from '@budarin/react-router';

export function HistoryExample() {
    const { go, back, forward, canGoBack, canGoForward } = useRouter();

    return (
        <div>
            <button type="button" onClick={() => back()} disabled={!canGoBack()}>
                ← Назад
            </button>
            <button type="button" onClick={() => go(-2)} disabled={!canGoBack(2)}>
                ← 2 шага
            </button>
            <button type="button" onClick={() => go(1)} disabled={!canGoForward()}>
                Вперёд →
            </button>
            <button type="button" onClick={() => forward()} disabled={!canGoForward()}>
                Forward
            </button>
        </div>
    );
}
