export class ApiError extends Error {
  public status: number;
  public validation?: Record<string, string[]>;

  constructor(message: string, status: number, validation?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.validation = validation;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export type GetToken = () => Promise<string | null>;

async function throwApiError(res: Response): Promise<never> {
  const contentType = res.headers.get('content-type') ?? '';
  if (
    contentType.includes('application/problem+json') ||
    contentType.includes('application/json')
  ) {
    const problem = await res.json();
    const validation = problem.errors as Record<string, string[]> | undefined;
    const message =
      validation
        ? Object.values(validation).flat().join(' ')
        : (problem.detail ?? problem.title ?? res.statusText);
    throw new ApiError(message, res.status, validation);
  }
  throw new ApiError(await res.text(), res.status);
}

async function requestWithAuth(getToken: GetToken, input: RequestInfo, init?: RequestInit) {
  const token = await getToken();
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(input, { ...init, headers });
}

export function createApiClient(getToken: GetToken) {
  return async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const res = await requestWithAuth(getToken, input, init);

    if (!res.ok) {
      await throwApiError(res);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  };
}

export async function requestBlob(
  getToken: GetToken,
  input: RequestInfo,
  init?: RequestInit
): Promise<{ blob: Blob; headers: Headers }> {
  const res = await requestWithAuth(getToken, input, init);

  if (!res.ok) {
    await throwApiError(res);
  }

  return { blob: await res.blob(), headers: res.headers };
}
