import type { Config, Context } from '@netlify/edge-functions';

export default function handler(_request: Request, context: Context) {
    return context.next();
}

// A single URLPattern groups both issuers under one tighter quota. It includes
// trailing paths, so calling /create-session/extra cannot avoid this rule.
// Verification shares create-session's budget; a 429 must never mint a new identity.
// Together with api-rate-limit this uses two rules (the current Free-plan limit).
// https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
export const config: Config = {
    path: '/.netlify/functions/:endpoint(create-session|neon-create-user){/*}?',
    rateLimit: {
        action: 'rate_limit',
        windowLimit: 30,
        windowSize: 60,
        aggregateBy: ['ip', 'domain'],
    },
};
