import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8080" : ""),
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
