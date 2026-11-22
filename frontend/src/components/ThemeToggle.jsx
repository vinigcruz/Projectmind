import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun, QrCode, X, Copy, Check, ExternalLink } from "lucide-react";

const DEFAULT_PROD_URL = "https://projectmind-frontend.onrender.com";

export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("pm_theme") === "dark";
  });
  const [mostrarQr, setMostrarQr] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const urlAcesso =
    typeof window !== "undefined" && !window.location.origin.includes("localhost")
      ? window.location.origin
      : DEFAULT_PROD_URL;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(
    urlAcesso
  )}`;

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("pm_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("pm_theme", "light");
    }
  }, [dark]);

  const handleCopiarLink = () => {
    navigator.clipboard?.writeText(urlAcesso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMostrarQr(true)}
          title="Exibir QR Code para acesso rápido pelo celular"
          className="px-2.5 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition flex items-center gap-1.5 shadow-2xs cursor-pointer text-xs font-semibold"
        >
          <QrCode className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="hidden sm:inline">QR Code</span>
        </button>

        <button
          type="button"
          onClick={() => setDark((prev) => !prev)}
          title={dark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          className={`p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition flex items-center justify-center shadow-2xs cursor-pointer ${className}`}
        >
          {dark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </button>
      </div>

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
