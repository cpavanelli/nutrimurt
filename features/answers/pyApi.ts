import { ApiError } from '../../lib/apiClient';
import type { PatientLink } from './types';

/**
 * Talks to the Next.js route handlers, not the retired Python service.
 *
 * Same-origin, so there is no base URL and no `VITE_PY_BASE_URL`.
 */

async function request<T>(input: RequestInfo, init?: RequestInit, token?: string | null): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(input, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

const jsonPost = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const answersApi = {
  /** Public patient-facing fetch — no auth required, returns minimal PII. */
  getPatientLink: (urlID: string) =>
    request<PatientLink>(`/api/public/links/${encodeURIComponent(urlID)}`),
  /** Staff-only fetch — requires Clerk auth token. */
  getPatientLinkStaff: (urlID: string, token?: string | null) =>
    request<PatientLink>(`/api/links/${encodeURIComponent(urlID)}`, undefined, token),
  /**
   * The link is identified by the path, not by the body (R9). The old
   * `/py/savePatientAnswers` took `urlId` *and* `id` in the payload and never
   * checked that they matched, so a caller could overwrite another patient's
   * answers. The server now resolves the target from `urlId` alone, and the
   * body carries answers only.
   */
  save: (patientLink: PatientLink) =>
    request<{ status: string }>(
      `/api/public/links/${encodeURIComponent(patientLink.urlId)}/answers`,
      jsonPost({
        questions: (patientLink.questionnary?.questions ?? []).map((question) => ({
          id: question.id,
          questionType: question.questionType,
          answer: question.answer ? { answer: question.answer.answer } : null,
          answerAlternatives: question.answerAlternatives ?? [],
        })),
      }),
    ),
  /** Same path-not-body rule as `save`. */
  savePatientDiary: (patientLink: PatientLink) =>
    request<{ status: string }>(
      `/api/public/links/${encodeURIComponent(patientLink.urlId)}/diary`,
      jsonPost({
        entries: (patientLink.diary?.entries ?? []).map((entry) => ({
          date: entry.date,
          mealType: entry.mealType,
          time: entry.time ?? null,
          food: entry.food,
          amount: entry.amount,
        })),
      }),
    ),
};
