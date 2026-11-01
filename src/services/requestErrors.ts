export interface RequestError {
    id: number;
    request: string;
    status?: number;
    message: string;
    count: number;
}

let errors: RequestError[] = [];
let sequence = 0;
const listeners = new Set<() => void>();

export const getRequestErrors = () => errors;
export function subscribeRequestErrors(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
function emit() { listeners.forEach(listener => { listener(); }); }
export function dismissRequestError(id: number) {
    errors = errors.filter(error => error.id !== id);
    emit();
}

function report(request: string, message: string, status?: number) {
    const previous = errors.find(error => error.request === request && error.status === status);
    const error: RequestError = {
        id: ++sequence, request, status, message, count: (previous?.count ?? 0) + 1,
    };
    errors = [...errors.filter(item => item !== previous), error].slice(-3);
    emit();
    return error.id;
}

// Clone and bound error-body reads: consumers keep their original response/body,
// and a large or stalled error response cannot delay their request or flood the UI.
async function responseMessage(response: Response): Promise<string | undefined> {
    const copy = response.clone();
    const reader = copy.body?.getReader();
    if (!reader) { return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const read = async () => {
            const decoder = new TextDecoder();
            let text = '';
            let bytes = 0;
            while (bytes < 8192) {
                const { value, done } = await reader.read();
                if (done) { break; }
                text += decoder.decode(value.subarray(0, 8192 - bytes), { stream: true });
                bytes += value.length;
            }
            return text + decoder.decode();
        };
        const text = await Promise.race([
            read(),
            new Promise<string>(resolve => { timer = setTimeout(() => { resolve(''); }, 2000); }),
        ]);
        let message = text;
        try {
            const data: unknown = JSON.parse(text);
            if (typeof data === 'string') { message = data; }
            else if (data && typeof data === 'object') {
                const body = data as Record<string, unknown>;
                message = typeof body.error === 'string' ? body.error
                    : typeof body.message === 'string' ? body.message : '';
            } else { message = ''; }
        } catch {
            // Proxy/platform failures often return HTML; use the HTTP status instead.
            const type = response.headers.get('content-type') ?? '';
            if (type.includes('html') || /<[^>]+>/.test(text)) { message = ''; }
        }
        return message.trim().slice(0, 400) || undefined;
    } finally {
        clearTimeout(timer);
        void reader.cancel().catch(() => {});
    }
}

let uninstall: (() => void) | undefined;

/** Install before rendering so even initial page requests are observed. */
export function installRequestErrorObserver() {
    if (uninstall) { return uninstall; }
    const original = globalThis.fetch;
    const observed: typeof fetch = async (input, init) => {
        const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const url = new URL(rawUrl, window.location.href);
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const label = `${method} ${url.origin === window.location.origin ? '' : url.host}${url.pathname}`;
        let response: Response;
        try {
            response = await original.call(globalThis, input, init);
        } catch (error) {
            const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
            const aborted = error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError';
            if (!signal?.aborted && !aborted) {
                report(label, error instanceof Error ? error.message.slice(0, 400) : 'Unable to reach the server.');
            }
            throw error;
        }
        // Opaque responses do not expose a status; they are not known failures.
        if (!response.ok && response.status > 0) {
            const id = report(label, response.statusText || 'Request failed.', response.status);
            void responseMessage(response).then(message => {
                if (!message || !errors.some(error => error.id === id)) { return; }
                errors = errors.map(error => error.id === id ? { ...error, message } : error);
                emit();
            }).catch(() => {});
        }
        return response;
    };
    globalThis.fetch = observed;
    uninstall = () => {
        if (globalThis.fetch === observed) { globalThis.fetch = original; }
        uninstall = undefined;
    };
    return uninstall;
}
