import axios from "axios";

function resolveBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!raw) {
    return import.meta.env.DEV ? "http://localhost:8080" : "";
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  // No Render Blueprint, 'property: host' retorna o slug do serviço sem '.onrender.com' (ex: 'projectmind-backend-xxxx')
  if (!raw.includes(".") && !raw.includes("localhost")) {
    return `https://${raw}.onrender.com`;
  }
  return `https://${raw.replace(/\/+$/, "")}`;
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("pm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (token.startsWith("pm-token-")) {
      const uid = token.replace("pm-token-", "").trim();
      config.headers["X-User-Id"] = uid;
    }
  }
  return config;
});

export default api;
