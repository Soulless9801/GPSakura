import { useEffect, useState, useSyncExternalStore } from 'react';
import { dismissRequestError, getRequestErrors, subscribeRequestErrors, type RequestError } from '/src/services/requestErrors';
import './RequestErrors.css';

function ErrorNotice({ error }: { error: RequestError }) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const paused = hovered || focused;
    useEffect(() => {
        if (paused) { return; }
        const timer = setTimeout(() => { dismissRequestError(error.id); }, 12000);
        return () => { clearTimeout(timer); };
    }, [error.id, paused]);

    return (
        <article className="request-error"
            onMouseEnter={() => { setHovered(true); }} onMouseLeave={() => { setHovered(false); }}
            onFocus={() => { setFocused(true); }}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setFocused(false); } }}>
            <div className="request-error__content">
                <p className="request-error__title">Request failed{error.status ? ` · ${String(error.status)}` : ''}{error.count > 1 ? ` · ${String(error.count)} times` : ''}</p>
                <code className="request-error__request">{error.request}</code>
                <p className="request-error__message">{error.message}</p>
            </div>
            <button type="button" className="request-error__dismiss" aria-label={`Dismiss error for ${error.request}`}
                onClick={() => { dismissRequestError(error.id); }}>×</button>
        </article>
    );
}

export default function RequestErrors() {
    const errors = useSyncExternalStore(subscribeRequestErrors, getRequestErrors);
    return (
        <aside className="request-errors" aria-label="Request errors" aria-live="polite" aria-relevant="additions text">
            {errors.map(error => <ErrorNotice key={error.id} error={error} />)}
        </aside>
    );
}
