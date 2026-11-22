import { useEffect, useState } from "react";
import { Moon, Sun, QrCode, X, Smartphone, Copy, Check, ExternalLink } from "lucide-react";

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
          title="Exibir QR Code para acesso rápido pelo celular (Banca / Avaliadores)"
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

      {mostrarQr && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setMostrarQr(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-gray-100 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMostrarQr(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3">
              <Smartphone className="h-3.5 w-3.5" />
              Acesso Rápido Mobile & PWA
            </div>

            <h3 className="text-xl font-bold text-gray-900">Acesse o ProjectMind no Celular</h3>
            <p className="text-xs text-gray-500 mt-1 mb-5">
              Aponte a câmera do seu smartphone (iPhone ou Android) para o QR Code abaixo para abrir o sistema em tempo real:
            </p>

            <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-inner inline-block mx-auto mb-4">
              <img
                src={qrImageUrl}
                alt="QR Code de acesso ao ProjectMind"
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto rounded-lg"
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex items-center justify-between gap-2 mb-4">
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
                  title="Abrir imagem do QR Code para salvar nos slides"
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="text-left bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-[11px] text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">💡 Como instalar como App (PWA):</p>
              <p>• <strong>iPhone (Safari):</strong> Toque em <em>Compartilhar</em> → <em>Adicionar à Tela de Início</em>.</p>
              <p>• <strong>Android (Chrome):</strong> Toque no menu <em>⋮</em> → <em>Instalar aplicativo</em>.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
