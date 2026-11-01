import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { analisarProjeto } from "../services/auditoriaService.js";
import { obterProjeto } from "../services/projetoService.js";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { Brain, ArrowLeft, Calendar, ShieldAlert, TrendingUp, AlertCircle } from "lucide-react";

function AnaliseCompletaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagnostico, setDiagnostico] = useState(null);
  const [projeto, setProjeto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      try {
        const [dadosDiag, dadosProj] = await Promise.all([
          analisarProjeto(id),
          obterProjeto(id).catch(() => null),
        ]);
        setDiagnostico(dadosDiag);
        setProjeto(dadosProj);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível carregar o diagnóstico prescritivo do backend.");
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, [id]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Executando CPM, Earned Schedule, Monte Carlo e análise Gemini...</p>
        </div>
      </div>
    );
  }

  const analise = diagnostico?.analise;
  const cronograma = analise?.cronograma;
  const previsao = analise?.previsao;
  const caracteristicas = analise?.caracteristicas;
  const riscos = analise?.riscos || [];

  const situacaoBadge = {
    ATRASADO: "bg-rose-100 text-rose-800 border-rose-200",
    NO_PRAZO: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ADIANTADO: "bg-blue-100 text-blue-800 border-blue-200",
    CONCLUIDO: "bg-purple-100 text-purple-800 border-purple-200",
    NAO_INICIADO: "bg-gray-100 text-gray-800 border-gray-200",
    SEM_DADOS: "bg-gray-100 text-gray-800 border-gray-200",
  }[cronograma?.situacaoPrazo] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(`/projetos/${id}`)}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o projeto
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Análise Completa do Projeto</h1>
              {cronograma?.situacaoPrazo && (
                <span className={`text-xs px-3 py-1 rounded-full font-bold border ${situacaoBadge}`}>
                  {cronograma.situacaoPrazo}
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">
              Diagnóstico de {projeto?.nome || `Projeto #${id}`} combinando Grafos (CPM), Earned Schedule, Monte Carlo e IA Gemini.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate("/chat")}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition shadow-sm"
            >
              Abrir Chat IA
            </button>
          </div>
        </div>

        {erro ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm">
            {erro}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cards de Métricas Principais Dinâmicas */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs uppercase font-semibold tracking-wider text-gray-400">Score de Saúde</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {diagnostico?.scoreSaude != null ? diagnostico.scoreSaude : "—"}
                  </span>
                  <span className="text-gray-400 font-medium">/ 100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${diagnostico?.scoreSaude ?? 0}%` }}
                  />
                </div>
                {analise?.historico?.tendenciaScore && analise.historico.tendenciaScore !== "SEM_HISTORICO" && (
                  <p className="text-xs text-gray-500 mt-2">Tendência: {analise.historico.tendenciaScore}</p>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs uppercase font-semibold tracking-wider text-gray-400">Progresso Físico Real</p>
                <p className="text-4xl font-extrabold text-gray-900 mt-3">
                  {cronograma?.progressoRealPercentual != null ? `${cronograma.progressoRealPercentual}%` : "0%"}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Planejado (PV): {cronograma?.progressoPlanejadoPercentual != null ? `${cronograma.progressoPlanejadoPercentual}%` : "0%"}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs uppercase font-semibold tracking-wider text-gray-400">Riscos Analisados</p>
                <p className="text-4xl font-extrabold text-amber-600 mt-3">
                  {riscos.length}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Exposição total: {analise?.exposicaoTotalRiscosDias ?? 0} dias de atraso potencial
                </p>
              </div>
            </div>

            {/* Painel de Previsões e Diagnóstico de Prazo (Monte Carlo & Earned Schedule) */}
            {previsao && (
              <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" /> Previsões de Término e Diagnóstico de Prazo
                </h2>
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Variação de Prazo</span>
                    <p className={`text-lg font-bold mt-1 ${cronograma?.atrasoDias > 0 ? "text-rose-600" : (cronograma?.atrasoDias < 0 ? "text-blue-600" : "text-emerald-600")}`}>
                      {cronograma?.atrasoDias > 0
                        ? `${cronograma.atrasoDias} dias de atraso`
                        : (cronograma?.atrasoDias < 0 ? `${Math.abs(cronograma.atrasoDias)} dias adiantado` : "Em dia")}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">SPI: {cronograma?.spi ?? "N/D"}</p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Término Provável (P50)</span>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {previsao.dataTerminoP50 ? new Date(previsao.dataTerminoP50 + "T00:00:00").toLocaleDateString("pt-BR") : "N/D"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Cenário mais provável</p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Término Conservador (P80)</span>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {previsao.dataTerminoP80 ? new Date(previsao.dataTerminoP80 + "T00:00:00").toLocaleDateString("pt-BR") : "N/D"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Considerando riscos</p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Probabilidade no Prazo</span>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      {previsao.probabilidadeNoPrazo != null ? `${previsao.probabilidadeNoPrazo}%` : "N/D"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Calibração: x{previsao.fatorCalibracaoHistorica}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 italic">
                  * Previsões geradas deterministicamente via Simulação de Monte Carlo (2000 iterações com calibração empírica e modelagem de gargalos).
                </p>
              </section>
            )}

            {/* Seção Caminho Crítico (CPM) */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                <span>⚡</span> Análise do Caminho Crítico (CPM)
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono text-xs">
                {diagnostico?.analiseCaminhoCritico || "Nenhuma dependência crítica identificada."}
              </p>
              {caracteristicas && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-400 block">Duração CPM</span>
                    <span className="font-bold text-gray-800 text-sm">{caracteristicas.duracaoCpmDias} dias</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-400 block">Tarefas Críticas</span>
                    <span className="font-bold text-gray-800 text-sm">{caracteristicas.tarefasCriticas} ({caracteristicas.percentualCritico}%)</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-400 block">Concluídas</span>
                    <span className="font-bold text-gray-800 text-sm">{caracteristicas.concluidas} de {caracteristicas.totalTarefas}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-400 block">Densidade Deps</span>
                    <span className="font-bold text-gray-800 text-sm">{caracteristicas.densidadeDependencias}</span>
                  </div>
                </div>
              )}
            </section>

            {/* Alertas do Sistema se houver */}
            {analise?.alertas && analise.alertas.length > 0 && (
              <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-600" /> Alertas do Motor Analítico
                </h2>
                <ul className="space-y-1.5 text-xs text-amber-800">
                  {analise.alertas.map((alerta, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span>•</span>
                      <span>{alerta}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Recomendações Prescritivas da IA */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <span>🤖</span> Recomendações Prescritivas e Diagnóstico IA
              </h2>
              <div className="space-y-4">
                {diagnostico?.sugestoesIA?.map((sugestao, index) => (
                  <div key={index} className="text-sm text-gray-800 bg-blue-50/40 border border-blue-100 p-5 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {sugestao}
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">Nenhuma sugestão gerada no momento.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnaliseCompletaPage;