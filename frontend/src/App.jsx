import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CadastroPage from "./pages/CadastroPage.jsx";
import MeusProjetosPage from "./pages/MeusProjetosPage.jsx";
import api from "./services/api.js";

// Lazy loading das páginas mais densas para acelerar o carregamento inicial na internet
const ChatPage = lazy(() => import("./pages/ChatPage.jsx"));
const ProjetoPage = lazy(() => import("./pages/ProjetoPage.jsx"));
const AnaliseCompletaPage = lazy(() => import("./pages/AnaliseCompletaPage.jsx"));
const PerfilPage = lazy(() => import("./pages/PerfilPage.jsx"));

export default function App() {
  useEffect(() => {
    // Pré-aquece o container backend na Vercel e a conexão com o banco Neon assim que o site abre
    api.get("/projetos/ping").catch(() => {});

    // Pré-carrega os módulos secundários em segundo plano após a renderização inicial
    const timer = setTimeout(() => {
      import("./pages/ProjetoPage.jsx").catch(() => {});
      import("./pages/ChatPage.jsx").catch(() => {});
      import("./pages/AnaliseCompletaPage.jsx").catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/projetos" element={<MeusProjetosPage />} />
          <Route path="/projetos/:id" element={<ProjetoPage />} />
          <Route path="/projetos/:id/analise" element={<AnaliseCompletaPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
