import { readdirSync } from 'node:fs';
import type { Context } from '@netlify/edge-functions';
import { URLPattern } from 'urlpattern-polyfill';
import { describe, expect, it, vi } from 'vitest';
import apiHandler, { config as apiConfig } from '../edge-functions/api-rate-limit';
import identityHandler, { config as identityConfig } from '../edge-functions/identity-rate-limit';

const endpoints = readdirSync(new URL('../entrypoints/', import.meta.url))
    .filter(name => name.endsWith('.ts')).map(name => name.slice(0, -3));
const pattern = (path: typeof apiConfig.path) => {
    if (typeof path !== 'string') {throw new Error('Use one grouped path per rule to fit the Free-plan quota');}
    return new URLPattern({ pathname: path });
};

describe('Netlify platform rate-limit coverage', () => {
    it.each(endpoints)('covers every method and trailing path for %s without changing its URL', name => {
        for (const suffix of ['', '/', '/extra']) {
            const url = `https://example.test/.netlify/functions/${name}${suffix}?action=issue`;
            expect(pattern(apiConfig.path).test(url)).toBe(true);
            const issuer = name === 'create-session' || name === 'neon-create-user';
            expect(pattern(identityConfig.path).test(url)).toBe(issuer);
        }
    });

    it('uses only two native rules with IP/domain quotas and leaves static pages alone', () => {
        const files = readdirSync(new URL('../edge-functions/', import.meta.url)).filter(name => name.endsWith('.ts'));
        expect(files).toHaveLength(2);
        for (const config of [apiConfig, identityConfig]) {
            expect(config.method).toBeUndefined(); // Alternate HTTP methods cannot bypass the rules.
            expect(config.rateLimit?.aggregateBy).toEqual(['ip', 'domain']);
            expect(config.rateLimit?.action).toBe('rate_limit');
            expect(config.rateLimit?.windowSize).toBeGreaterThan(0);
            expect(config.rateLimit?.windowSize).toBeLessThanOrEqual(180);
            expect(pattern(config.path).test('https://example.test/')).toBe(false);
            expect(pattern(config.path).test('https://example.test/assets/app.js')).toBe(false);
        }
        expect(apiConfig.rateLimit?.windowLimit).toBe(600);
        expect(identityConfig.rateLimit?.windowLimit).toBe(30);
    });

    it.each([apiHandler, identityHandler])('passes through responses without another HTTP request', async handler => {
        const response = new Response('unchanged', { status: 403, headers: { 'x-test': 'preserved' } });
        const next = vi.fn(() => Promise.resolve(response));
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);
        expect(await handler(new Request('https://example.test/.netlify/functions/create-session'), { next } as unknown as Context)).toBe(response);
        expect(next).toHaveBeenCalledOnce();
        expect(fetch).not.toHaveBeenCalled();
    });
});
