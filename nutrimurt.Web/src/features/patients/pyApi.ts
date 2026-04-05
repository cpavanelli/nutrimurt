const rawBaseUrl = import.meta.env.VITE_PY_BASE_URL ?? '/py';
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const baseUrl =
  normalizedBaseUrl === ''
    ? '/py'
    : normalizedBaseUrl.endsWith('/py')
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/py`;

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

export async function sendTestEmail(email: string, name: string, token?: string | null): Promise<{ status: string }> {
  const res = await fetch(
    `${baseUrl}/testEmail/${encodeURIComponent(email)}/${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `testEmail failed with ${res.status}`));
  }
  return res.json();
}

export async function sendEmail(urlID: string, token?: string | null): Promise<{ status: string }> {
  const res = await fetch(
    `${baseUrl}/sendEmail/${encodeURIComponent(urlID)}`,
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
