/** Real Fetch API bodies exercise stream consumption without a Lambda event adapter. */
export function post(body?: string | null): Request {
    return new Request("http://localhost/.netlify/functions/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    });
}
