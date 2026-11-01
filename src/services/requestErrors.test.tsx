// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RequestErrors from '../components/tools/RequestErrors/RequestErrors';
import { dismissRequestError, getRequestErrors, installRequestErrorObserver } from './requestErrors';

describe('global request errors', () => {
    let stop: () => void;
    let server: ReturnType<typeof vi.fn<typeof fetch>>;
    beforeEach(() => {
        server = vi.fn<typeof fetch>();
        vi.stubGlobal('fetch', server);
        stop = installRequestErrorObserver();
    });
    afterEach(() => {
        stop();
        act(() => { getRequestErrors().forEach(error => { dismissRequestError(error.id); }); });
        vi.useRealTimers();
    });

    it('reports an initial POST failure before mounting and preserves the response body', async () => {
        const response = new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
        server.mockResolvedValue(response);
        expect(await fetch('/.netlify/functions/create-session?signature=secret', { method: 'POST' })).toBe(response);
        expect(await response.json()).toEqual({ error: 'Rate limit exceeded' });
        render(<RequestErrors />);
        await screen.findByText('Rate limit exceeded');
        expect(screen.getByText('POST /.netlify/functions/create-session')).toBeTruthy();
        expect(screen.getByText('Request failed · 429')).toBeTruthy();
        expect(document.body.textContent).not.toContain('secret');
    });

    it.each(['GET', 'PUT', 'PATCH', 'DELETE'])('observes %s requests, including Request inputs', async method => {
        server.mockResolvedValue(new Response('Service unavailable', { status: 503 }));
        const request = new Request('https://api.example.test/data?token=secret', { method });
        await fetch(request);
        expect(getRequestErrors()[0].request).toBe(`${method} api.example.test/data`);
        await waitFor(() => { expect(getRequestErrors()[0].message).toBe('Service unavailable'); });
        expect(server).toHaveBeenCalledWith(request, undefined);
    });

    it('ignores successful requests and preserves network rejections', async () => {
        server.mockResolvedValueOnce(new Response('ok'));
        await fetch('/ok');
        expect(getRequestErrors()).toHaveLength(0);
        const error = new TypeError('Failed to fetch');
        server.mockRejectedValueOnce(error);
        await expect(fetch('/offline')).rejects.toBe(error);
        expect(getRequestErrors()[0]).toMatchObject({ request: 'GET /offline', message: 'Failed to fetch' });
    });

    it('ignores intentional cancellation', async () => {
        server.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'));
        await expect(fetch('/cancelled')).rejects.toThrow();
        expect(getRequestErrors()).toHaveLength(0);
        const controller = new AbortController();
        controller.abort();
        server.mockRejectedValueOnce(new TypeError('Cancelled'));
        await expect(fetch('/cancelled', { signal: controller.signal })).rejects.toThrow();
        expect(getRequestErrors()).toHaveLength(0);
    });

    it('falls back to status text for HTML errors and bounds long messages', async () => {
        server.mockResolvedValueOnce(new Response('<html>private proxy dump</html>', {
            status: 502, statusText: 'Bad Gateway', headers: { 'Content-Type': 'text/html' },
        }));
        await fetch('/proxy');
        server.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'x'.repeat(1000) }), { status: 400 }));
        await fetch('/long');
        await waitFor(() => { expect(getRequestErrors()[1].message).toHaveLength(400); });
        expect(getRequestErrors()[0].message).toBe('Bad Gateway');
    });

    it('combines repeat failures, caps the stack, and allows dismissal', async () => {
        server.mockImplementation(() => Promise.resolve(new Response('Busy', { status: 503 })));
        await fetch('/repeat');
        await fetch('/repeat');
        expect(getRequestErrors()).toHaveLength(1);
        expect(getRequestErrors()[0].count).toBe(2);
        await fetch('/second');
        await fetch('/third');
        await fetch('/fourth');
        expect(getRequestErrors()).toHaveLength(3);
        render(<RequestErrors />);
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss error for GET /fourth' }));
        expect(getRequestErrors()).toHaveLength(2);
    });

    it('automatically dismisses errors, pausing while the notice is hovered', async () => {
        server.mockResolvedValue(new Response(null, { status: 500 }));
        await fetch('/failed');
        vi.useFakeTimers();
        render(<RequestErrors />);
        const notice = screen.getByRole('article');
        fireEvent.mouseEnter(notice);
        act(() => { vi.advanceTimersByTime(20000); });
        expect(getRequestErrors()).toHaveLength(1);
        fireEvent.mouseLeave(notice);
        act(() => { vi.advanceTimersByTime(12000); });
        expect(getRequestErrors()).toHaveLength(0);
    });

    it('keeps focused notices visible even after the pointer leaves', async () => {
        server.mockResolvedValue(new Response(null, { status: 500 }));
        await fetch('/focused');
        vi.useFakeTimers();
        render(<RequestErrors />);
        fireEvent.mouseEnter(screen.getByRole('article'));
        fireEvent.focus(screen.getByRole('button'));
        fireEvent.mouseLeave(screen.getByRole('article'));
        act(() => { vi.advanceTimersByTime(20000); });
        expect(getRequestErrors()).toHaveLength(1);
        fireEvent.blur(screen.getByRole('button'));
        act(() => { vi.advanceTimersByTime(12000); });
        expect(getRequestErrors()).toHaveLength(0);
    });

    it('does not duplicate observation on repeated installs and restores fetch', async () => {
        expect(installRequestErrorObserver()).toBe(stop);
        server.mockResolvedValue(new Response(null, { status: 500 }));
        await fetch('/once');
        expect(getRequestErrors()[0].count).toBe(1);
        stop();
        expect(globalThis.fetch).toBe(server);
    });
});
