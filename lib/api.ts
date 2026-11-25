
const API_BASE_URL = "";

type ApiOptions = RequestInit & {
  body?: BodyInit | null;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Terjadi kesalahan pada server.");
  }

  return result as T;
}
