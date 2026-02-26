export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

async function safeFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText, body);
  }

  return body as T;
}

export const api = {
  get: <T>(url: string) => safeFetch<T>(url),

  post: <T>(url: string, data?: unknown) =>
    safeFetch<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data: unknown) =>
    safeFetch<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: <T>(url: string, data?: unknown) =>
    safeFetch<T>(url, {
      method: "DELETE",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    }),
};
