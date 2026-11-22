import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProjectSessionProvider } from "./context/ProjectSessionContext.jsx";
import "./index.css";

if (localStorage.getItem("pm_theme") === "dark") {
  document.documentElement.classList.add("dark");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProjectSessionProvider>
          <App />
        </ProjectSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
