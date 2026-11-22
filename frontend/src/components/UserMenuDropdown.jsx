import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  User,
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  Moon,
  Sun,
  QrCode,
  LogOut,
  ChevronDown,
  X,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const DEFAULT_PROD_URL = "https://projectmind-frontend.onrender.com";

export default function UserMenuDropdown() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("pm_theme") === "dark");
  const [mostrarQr, setMostrarQr] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const menuRef = useRef(null);

  const urlAcesso =
    typeof window !== "undefined" && !window.location.origin.includes("localhost")
      ? window.location.origin
      : DEFAULT_PROD_URL;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(
    urlAcesso
  )}`;

  useEffect(() => {
    const root = document.documentElement;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("pm_theme", "dark");
      metaTheme?.setAttribute("content", "#0b0f19");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("pm_theme", "light");
      metaTheme?.setAttribute("content", "#ffffff");
    }
  }, [dark]);

  useEffect(() => {
    const fecharAoClicarFora = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  const handleCopiarLink = () => {
    navigator.clipboard?.writeText(urlAcesso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const inicial = (user?.nome || "U").trim().charAt(0).toUpperCase();

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setAberto((prev) => !prev)}
          className="flex items-center gap-2.5 py-1.5 pl-2.5 pr-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-2xs cursor-pointer"
          title="Menu do Usuário"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.nome || "Usuário"}
            </p>
            <p className="text-[11px] text-gray-500 leading-tight">
              {isAdmin ? "Administrador" : user?.email || "Conta Ativa"}
            </p>
          </div>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-xs">
            {inicial}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              aberto ? "rotate-180" : ""
            }`}
          />
        </button>

        {aberto && (
          <div className="absolute right-0 mt-2.5 w-64 max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden">
            {/* Cabeçalho interno do Dropdown */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900 truncate">
                {user?.nome || "Usuário"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || "usuario@projectmind.com"}
              </p>
            </div>

            {/* Navegação Principal */}
            <div className="py-1.5 px-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  navigate("/projetos");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <span>Meus Projetos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  navigate("/chat");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span>Assistente IA</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    navigate("/admin");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span>Painel Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  navigate("/perfil");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <span>Meu Perfil</span>
              </button>
            </div>

            {/* Preferências e Utilitários */}
            <div className="py-1.5 px-1.5 border-t border-gray-100 space-y-0.5">
              <button
                type="button"
                onClick={() => setDark((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                    {dark ? (
                      <Sun className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-700" />
                    )}
                  </div>
                  <span>{dark ? "Modo Claro" : "Modo Escuro"}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-semibold">
                  {dark ? "Ativo" : "Off"}
                </span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    setMostrarQr(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <span>QR Code de Acesso</span>
                </button>
              )}
            </div>

            {/* Sair */}
            <div className="pt-1.5 px-1.5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="h-4 w-4" />
                </div>
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal do QR Code via Portal */}
      {mostrarQr &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto"
            onClick={() => setMostrarQr(false)}
          >
            <div
              className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-sm shadow-2xl border border-gray-100 text-center relative my-auto max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMostrarQr(false)}
                className="absolute top-3.5 right-3.5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg sm:text-xl font-bold text-gray-900 pr-6">
                Acesse o ProjectMind no Celular
              </h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Aponte a câmera do seu smartphone para o QR Code abaixo:
              </p>

              <div className="bg-white p-3 rounded-2xl border-2 border-blue-100 shadow-inner inline-block mx-auto mb-4">
                <img
                  src={qrImageUrl}
                  alt="QR Code de acesso ao ProjectMind"
                  className="w-52 h-52 sm:w-64 sm:h-64 object-contain mx-auto rounded-lg"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono text-gray-700 truncate select-all pl-1">
                  {urlAcesso}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopiarLink}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                  <a
                    href={qrImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir imagem do QR Code"
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarQr(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
