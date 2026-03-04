const rawBaseUrl = import.meta.env.VITE_PY_BASE_URL ?? '/py';
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const baseUrl =
  normalizedBaseUrl === ''
    ? '/py'
    : normalizedBaseUrl.endsWith('/py')
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/py`;


export async function sendTestEmail(email: string, name: string, token?: string | null): Promise<{ status: string }> {
  const res = await fetch(
    `${baseUrl}/testEmail/${encodeURIComponent(email)}/${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `testEmail failed with ${res.status}`);
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
    const text = await res.text();
    throw new Error(text || `sendEmail failed with ${res.status}`);
  }
  return res.json();
}
