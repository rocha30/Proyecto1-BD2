const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}
