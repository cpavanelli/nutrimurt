/**
 * Talks to the Next.js route handlers, not the retired Python service.
 * Same-origin, so the client does not need a service base URL.
 *
 * `sendTestEmail` was removed: nothing called it, and the `/py/testEmail`
 * route it posted to does not exist in `main.py`.
 */

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  if (!text) return fallback;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      const problem = JSON.parse(text);
      if (typeof problem.detail === 'string' && problem.detail.trim()) {
        return problem.detail;
      }
      if (typeof problem.title === 'string' && problem.title.trim()) {
        return problem.title;
      }
    } catch {
      return text;
    }
  }

  return text;
}

export async function sendEmail(urlID: string, token?: string | null): Promise<{ status: string }> {
  const res = await fetch(
    `/api/links/${encodeURIComponent(urlID)}/send`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `sendEmail failed with ${res.status}`));
  }
  return res.json();
}
