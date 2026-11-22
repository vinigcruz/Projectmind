import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollTopAndBlur() {
  const [rolou, setRolou] = useState(false);
  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setRolou(y > 12);
      setMostrarBotaoTopo(y > 220);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const subirParaOTopo = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Efeito de desfoque progressivo (sem linha de divisão) no topo/Notch apenas ao rolar a página */}
      <div
        aria-hidden="true"
        className={`pm-top-progressive-blur transition-opacity duration-300 ${
          rolou ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Botão flutuante para voltar ao topo quando estiver na parte inferior da página */}
      {mostrarBotaoTopo && (
        <button
          type="button"
          onClick={subirParaOTopo}
          title="Voltar ao topo da página"
          className="fixed right-4 sm:right-6 z-40 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-lg border border-white/15 transition-all duration-200 active:scale-95 cursor-pointer"
          style={{
            bottom: "calc(var(--pm-safe-bottom, env(safe-area-inset-bottom, 0px)) + 1.25rem)",
          }}
        >
          <ArrowUp className="h-4 w-4" />
          <span>Topo</span>
        </button>
      )}
    </>
  );
}
