import { useRoute } from '@budarin/use-route';
import { Link } from '../components/Link';

interface IgnoreCaseProps {
    /** Section prefix (e.g. '/base-demo'); empty string = app root. */
    section?: string;
}

export function IgnoreCase({ section = '' }: IgnoreCaseProps) {
    const { pathname, params, matched } = useRoute('/docs/:slug', {
        ignoreCase: true,
        ...(section !== undefined && { section }),
    });

    return (
        <div className="demo-content">
            <h1>Матч без учёта регистра (ignoreCase)</h1>
            <p className="demo-lead">
                Использование флага: передаём <code>ignoreCase: true</code> во второй аргумент хука.
                Совпадение по регистру: при любом написании сегмента (
                <code>/docs/Intro</code>, <code>/docs/intro</code>, <code>/docs/INTRO</code>) шаблон
                совпадает — это и показывают ссылки ниже. В <code>params.slug</code> попадает значение
                из URL «как есть».
            </p>
            <pre>{`useRoute('/docs/:slug', { ignoreCase: true })`}</pre>
            <p>
                Адрес: <code>{pathname}</code> → параметр <code>slug</code> ={' '}
                <strong>{params.slug ?? '—'}</strong>
                {matched !== undefined && (
                    <>
                        {' '}
                        (шаблон совпал: <strong>{matched ? 'да' : 'нет'}</strong>)
                    </>
                )}
            </p>
            <h2>Перейти по разному регистру</h2>
            <div className="demo-buttons">
                <Link to={`${section}/docs/getting-started`}>/docs/getting-started</Link>
                <Link to={`${section}/docs/Getting-Started`}>/docs/Getting-Started</Link>
                <Link to={`${section}/docs/GETTING-STARTED`}>/docs/GETTING-STARTED</Link>
            </div>
        </div>
    );
}
