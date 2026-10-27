import type { Config, Context } from '@netlify/edge-functions';

// The platform applies this rule before function execution. Pass through without
// fetching the URL again (which would start another request chain).
export default function handler(_request: Request, context: Context) {
    return context.next();
}

// One rule covers every current/future endpoint, including its default Netlify URL.
// Allow a table of players sharing one IP to draw, refresh hands and reconnect.
export const config: Config = {
    path: '/.netlify/functions/*',
    rateLimit: {
        action: 'rate_limit',
        windowLimit: 600,
        windowSize: 60,
        aggregateBy: ['ip', 'domain'],
    },
};
