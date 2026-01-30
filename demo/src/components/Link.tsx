import { useRoute } from '@budarin/use-route';
import { useCallback, type ComponentPropsWithoutRef } from 'react';

interface LinkProps extends ComponentPropsWithoutRef<'a'> {
    to: string;
    replace?: boolean;
}

export function Link({ to, replace = false, onClick, ...props }: LinkProps) {
    const { navigate } = useRoute();

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            onClick?.(e);
            if (!e.defaultPrevented) {
                e.preventDefault();
                navigate(to, { history: replace ? 'replace' : 'push' });
            }
        },
        [navigate, to, replace, onClick]
    );

    return <a {...props} href={to} onClick={handleClick} />;
}
