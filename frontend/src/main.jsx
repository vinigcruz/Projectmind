import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProjectSessionProvider } from "./context/ProjectSessionContext.jsx";
import "./index.css";

if (localStorage.getItem("pm_theme") === "dark") {
  document.documentElement.classList.add("dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#0b0f19");
} else {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#ffffff");
}

// Detecta automaticamente Dynamic Island, Notch (iPhone 13 Pro, etc.) ou telas sem recorte (Android/SE/Desktop)
function configurarSafeAreaAdaptativa() {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)")?.matches === true;

  if (isIOS && isStandalone) {
    const maxDim = Math.max(window.screen?.height || 0, window.screen?.width || 0);
    // iPhones com Dynamic Island (14 Pro, 15, 16, Pro Max: alturas lógicas 852, 874, 932, 956)
    if (maxDim >= 852 && maxDim !== 896 && maxDim !== 926) {
      root.style.setProperty("--pm-safe-top", "max(env(safe-area-inset-top, 0px), 56px)");
    } else if (maxDim >= 812) {
      // iPhones com Notch (X, 11, 12, 13, 13 Pro, 14, Pro Max: alturas lógicas 812, 844, 896, 926)
      root.style.setProperty("--pm-safe-top", "max(env(safe-area-inset-top, 0px), 48px)");
    } else {
      // iPhones sem Notch/Dynamic Island (iPhone SE / 8)
      root.style.setProperty("--pm-safe-top", "max(env(safe-area-inset-top, 0px), 22px)");
    }
    root.style.setProperty("--pm-safe-bottom", "max(env(safe-area-inset-bottom, 0px), 16px)");
  } else {
    // Dispositivos Android, Desktop ou aba normal do navegador (usa 100% da tela sem sobra desnecessária)
    root.style.setProperty("--pm-safe-top", "env(safe-area-inset-top, 0px)");
    root.style.setProperty("--pm-safe-bottom", "env(safe-area-inset-bottom, 0px)");
  }
}

configurarSafeAreaAdaptativa();
window.addEventListener("resize", configurarSafeAreaAdaptativa);
window.addEventListener("orientationchange", configurarSafeAreaAdaptativa);

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
