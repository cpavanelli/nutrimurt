import type { Patient, PatientInput } from './types';

const baseUrl = import.meta.env.VITE_PY_BASE_URL ?? 'http://localhost:8001';


export async function sendTestEmail(email : string, name: string): Promise<{ status: string }> {
const res = await fetch(
    `${baseUrl}/testEmail/${encodeURIComponent(email)}/${encodeURIComponent(name)}`,
    { method: 'POST' }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `testEmail failed with ${res.status}`);
  }
  return res.json(); // { status: "ok" } expected
}

export async function sendEmail(urlID : string): Promise<{ status: string }> {
const res = await fetch(
    `${baseUrl}/sendEmail/${encodeURIComponent(urlID)}`,
    { method: 'POST' }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `sendEmail failed with ${res.status}`);
  }
  return res.json(); // { status: "ok" } expected
}