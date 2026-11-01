import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  obterProjeto,
  adicionarTarefa,
  atualizarTarefa,
  excluirTarefa,
  atualizarProjeto,
  deletarProjeto,
  adicionarRisco,
  atualizarRisco,
  excluirRisco,
  listarLicoes,
  adicionarLicao,
  excluirLicao,
} from "../services/projetoService.js";
import { obterMetricasProjeto } from "../services/auditoriaService.js";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import {
  Brain,
  User,
  LogOut,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  LayoutDashboard,
  ListTodo,
  Pencil,
  Trash2,
  TrendingUp,
  Clock,
  ShieldAlert,
  Kanban,
  List,
  Check,
  ArrowRight,
  PlayCircle,
} from "lucide-react";

function ProjetoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [projeto, setProjeto] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("dashboards");

  // Visualização de Tarefas (Backlog Kanban ou Grafo CPM)
  const [modoVisualizacaoTarefas, setModoVisualizacaoTarefas] = useState("backlog");

  // Modal de Nova Tarefa
  const [mostrarModalTarefa, setMostrarModalTarefa] = useState(false);
  const [descTarefa, setDescTarefa] = useState("");
  const [duracao, setDuracao] = useState(5);
  const [statusTarefa, setStatusTarefa] = useState("A Fazer");
  const [pctTarefa, setPctTarefa] = useState(0);

  // Modal de Edição de Tarefa
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState(null);
  const [descEdit, setDescEdit] = useState("");
  const [duracaoEdit, setDuracaoEdit] = useState(5);
  const [pctEdit, setPctEdit] = useState(0);
  const [statusEdit, setStatusEdit] = useState("A Fazer");

  // Modal de Edição do Projeto
  const [mostrarModalEditarProjeto, setMostrarModalEditarProjeto] = useState(false);
  const [nomeProjetoEdit, setNomeProjetoEdit] = useState("");
  const [descProjetoEdit, setDescProjetoEdit] = useState("");

  // Modal de Novo Risco
  const [mostrarModalRisco, setMostrarModalRisco] = useState(false);
  const [descRisco, setDescRisco] = useState("");
  const [probRisco, setProbRisco] = useState(50);
  const [impactoRisco, setImpactoRisco] = useState(3);

  // Modal de Edição de Risco
  const [mostrarModalEditarRisco, setMostrarModalEditarRisco] = useState(false);
  const [riscoEditando, setRiscoEditando] = useState(null);
  const [descRiscoEdit, setDescRiscoEdit] = useState("");
  const [probRiscoEdit, setProbRiscoEdit] = useState(50);
  const [impactoRiscoEdit, setImpactoRiscoEdit] = useState(3);

  // Base de Lições Aprendidas (RAG)
  const [todasLicoes, setTodasLicoes] = useState([]);
  const [mostrarModalLicao, setMostrarModalLicao] = useState(false);
  const [categoriaLicao, setCategoriaLicao] = useState("Geral");
  const [descLicao, setDescLicao] = useState("");

  const carregarProjeto = async () => {
    setCarregando(true);
    try {
      const [dadosProj, dadosMetricas, dadosLicoes] = await Promise.all([
        obterProjeto(id),
        obterMetricasProjeto(id).catch(() => null),
        listarLicoes(id).catch(() => []),
      ]);
      if (dadosProj && dadosProj.tarefas) {
        dadosProj.tarefas.sort((a, b) => (a.id || 0) - (b.id || 0));
      }
      setProjeto(dadosProj);
      setMetricas(dadosMetricas);
      setTodasLicoes(dadosLicoes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProjeto();
  }, [id]);

  // Manipulação de Tarefas
  const handleNovaTarefa = async (e) => {
    e.preventDefault();
    if (!descTarefa.trim()) return;
    try {
      await adicionarTarefa(id, {
        descricao: descTarefa.trim(),
        duracaoDias: parseInt(duracao),
        status: statusTarefa,
        percentualConcluido: parseInt(pctTarefa),
        tipoDependencia: "TI",
      });
      setDescTarefa("");
      setDuracao(5);
      setStatusTarefa("A Fazer");
      setPctTarefa(0);
      setMostrarModalTarefa(false);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar tarefa.");
    }
  };

  const handleAbrirEditar = (t) => {
    setTarefaEditando(t);
    setDescEdit(t.descricao);
    setDuracaoEdit(t.duracaoDias || 1);
    const pct = t.percentualConcluido != null ? t.percentualConcluido : 0;
    setPctEdit(pct);
    setStatusEdit(t.status || (pct === 100 ? "Feito" : pct > 0 ? "Fazendo" : "A Fazer"));
    setMostrarModalEditar(true);
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!descEdit.trim() || !tarefaEditando) return;
    try {
      await atualizarTarefa(id, tarefaEditando.id, {
        descricao: descEdit.trim(),
        duracaoDias: parseInt(duracaoEdit),
        status: statusEdit,
        percentualConcluido: parseInt(pctEdit),
      });
      setMostrarModalEditar(false);
      setTarefaEditando(null);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar tarefa.");
    }
  };

  // Transição rápida de status para o Backlog Kanban
  const handleMudarStatusRapido = async (t, novoStatus) => {
    let novoPct = t.percentualConcluido ?? 0;
    if (novoStatus === "Feito") {
      novoPct = 100;
    } else if (novoStatus === "A Fazer") {
      novoPct = 0;
    } else if (novoStatus === "Fazendo") {
      if (novoPct === 0 || novoPct === 100) novoPct = 50;
    }
    try {
      await atualizarTarefa(id, t.id, {
        status: novoStatus,
        percentualConcluido: novoPct,
      });
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status da tarefa.");
    }
  };

  const handleAjustarProgressoRapido = async (t, novoPct) => {
    const pct = Math.max(0, Math.min(100, parseInt(novoPct)));
    let novoStatus = t.status;
    if (pct === 100) novoStatus = "Feito";
    else if (pct > 0) novoStatus = "Fazendo";
    else novoStatus = "A Fazer";
    try {
      await atualizarTarefa(id, t.id, {
        status: novoStatus,
        percentualConcluido: pct,
      });
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar progresso da tarefa.");
    }
  };

  const handleExcluirTarefa = async (tarefaId, descricao) => {
    const confirmou = window.confirm(
      `Deseja realmente excluir a tarefa "${descricao}"? Ela será excluída permanentemente do banco de dados.`
    );
    if (!confirmou) return;
    try {
      await excluirTarefa(id, tarefaId);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir a tarefa.");
    }
  };

  // Manipulação de Riscos
  const handleNovoRisco = async (e) => {
    e.preventDefault();
    if (!descRisco.trim()) return;
    try {
      await adicionarRisco(id, {
        descricao: descRisco.trim(),
        probabilidade: parseFloat(probRisco) / 100.0,
        impacto: parseFloat(impactoRisco),
      });
      setDescRisco("");
      setMostrarModalRisco(false);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar risco.");
    }
  };

  const handleAbrirEditarRisco = (r) => {
    setRiscoEditando(r);
    setDescRiscoEdit(r.descricao || "");
    const prob = Math.round((r.probabilidade || 0.5) * 100);
    setProbRiscoEdit(prob);
    setImpactoRiscoEdit(r.impactoDias || r.impacto || 1);
    setMostrarModalEditarRisco(true);
  };

  const handleSalvarEdicaoRisco = async (e) => {
    e.preventDefault();
    if (!descRiscoEdit.trim() || !riscoEditando) return;
    try {
      await atualizarRisco(id, riscoEditando.id, {
        descricao: descRiscoEdit.trim(),
        probabilidade: parseFloat(probRiscoEdit) / 100.0,
        impacto: parseFloat(impactoRiscoEdit),
      });
      setMostrarModalEditarRisco(false);
      setRiscoEditando(null);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar o risco.");
    }
  };

  const handleExcluirRisco = async (riscoId, descricao) => {
    const confirmou = window.confirm(`Deseja realmente excluir o risco "${descricao}"?`);
    if (!confirmou) return;
    try {
      await excluirRisco(id, riscoId);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir o risco.");
    }
  };

  // Manipulação de Lições Aprendidas (RAG)
  const handleNovaLicao = async (e) => {
    e.preventDefault();
    if (!descLicao.trim()) return;
    try {
      await adicionarLicao(id, {
        categoria: categoriaLicao,
        descricaoConhecimento: descLicao.trim(),
      });
      setDescLicao("");
      setCategoriaLicao("Geral");
      setMostrarModalLicao(false);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar lição aprendida.");
    }
  };

  const handleExcluirLicao = async (licaoId) => {
    if (!window.confirm("Deseja remover esta lição aprendida da base de conhecimento RAG?")) return;
    try {
      await excluirLicao(id, licaoId);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir lição aprendida.");
    }
  };

  // Edição do Projeto
  const handleAbrirEditarProjeto = () => {
    setNomeProjetoEdit(projeto?.nome || "");
    setDescProjetoEdit(projeto?.descricao || "");
    setMostrarModalEditarProjeto(true);
  };

  const handleSalvarEdicaoProjeto = async (e) => {
    e.preventDefault();
    if (!nomeProjetoEdit.trim()) return;
    try {
      await atualizarProjeto(id, {
        nome: nomeProjetoEdit.trim(),
        descricao: descProjetoEdit.trim(),
      });
      setMostrarModalEditarProjeto(false);
      carregarProjeto();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar o projeto.");
    }
  };

  const handleExcluirProjeto = async () => {
    const confirmou = window.confirm(
      `Deseja realmente excluir o projeto "${projeto?.nome}"? Todos os dados vinculados serão excluídos permanentemente.`
    );
    if (!confirmou) return;
    try {
      await deletarProjeto(id);
      navigate("/projetos");
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir o projeto.");
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando detalhes do projeto...</p>
        </div>
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Projeto não encontrado</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          O projeto com ID #{id} não foi encontrado ou você não possui permissão para acessá-lo.
        </p>
        <button
          onClick={() => navigate("/projetos")}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
        >
          Voltar para Projetos
        </button>
      </div>
    );
  }

  const cronograma = metricas?.cronograma;
  const previsao = metricas?.previsao;
  const caracteristicas = metricas?.caracteristicas;
  const listaTarefasCpm = cronograma?.tarefas || [];
  const cpmMap = new Map(listaTarefasCpm.map((tc) => [tc.id, tc]));

  // Mapa de severidade de riscos
  const listaRiscos = metricas?.riscos || (projeto?.riscos ? projeto.riscos.map(r => ({
    id: r.id,
    descricao: r.descricao,
    probabilidade: r.probabilidade,
    impactoDias: r.impacto,
    severidade: "Médio"
  })) : []);

  const situacaoBadge = {
    ATRASADO: "bg-rose-100 text-rose-800 border-rose-200",
    NO_PRAZO: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ADIANTADO: "bg-blue-100 text-blue-800 border-blue-200",
    CONCLUIDO: "bg-purple-100 text-purple-800 border-purple-200",
    NAO_INICIADO: "bg-gray-100 text-gray-800 border-gray-200",
    SEM_DADOS: "bg-gray-100 text-gray-800 border-gray-200",
  }[cronograma?.situacaoPrazo] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Fixo */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div
              onClick={() => navigate("/projetos")}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="Ir para a página inicial"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">ProjectMind</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <button
                onClick={() => navigate(`/projetos/${id}/analise`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition shadow-sm whitespace-nowrap"
              >
                Análise IA
              </button>
              <button
                onClick={() => navigate("/chat")}
                className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap"
              >
                Chat IA
              </button>
              <div
                onClick={() => navigate("/perfil")}
                className="flex items-center gap-2 cursor-pointer pl-2 border-l border-gray-200 group"
                title="Meu Perfil"
              >
                <div className="w-9 h-9 bg-blue-600 group-hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition shadow-sm">
                  <User className="h-4 w-4" />
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-gray-400 hover:text-gray-600 p-2 transition"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/projetos")}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Meus Projetos
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">{projeto?.nome || `Projeto #${id}`}</h2>
              {cronograma?.situacaoPrazo && (
                <span className={`text-xs px-3 py-1 rounded-full font-bold border ${situacaoBadge}`}>
                  {cronograma.situacaoPrazo}
                </span>
              )}
              <button
                onClick={handleAbrirEditarProjeto}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Renomear / Editar Projeto"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={handleExcluirProjeto}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Excluir Projeto"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">{projeto?.descricao || "Sem descrição disponível."}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-blue-600">
              {metricas?.scoreSaude != null ? `${metricas.scoreSaude}%` : "—"}
            </span>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Score de Saúde</p>
          </div>
        </div>

        {/* Cards de Resumo Superior com dados reais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase">Progresso Físico Real</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {cronograma?.progressoRealPercentual != null ? `${cronograma.progressoRealPercentual}%` : "0%"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Planejado: {cronograma?.progressoPlanejadoPercentual != null ? `${cronograma.progressoPlanejadoPercentual}%` : "0%"}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Tarefas Cadastradas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{projeto?.tarefas?.length || 0}</p>
              <p className="text-xs text-gray-400 mt-1">
                {caracteristicas?.tarefasCriticas ?? 0} no caminho crítico
              </p>
            </div>
            <button
              onClick={() => setMostrarModalTarefa(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl transition shadow-sm"
              title="Adicionar Tarefa"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Riscos Mapeados</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{listaRiscos.length}</p>
              <p className="text-xs text-gray-400 mt-1">
                Exposição: {metricas?.exposicaoTotalRiscosDias ?? 0} dias
              </p>
            </div>
            <button
              onClick={() => setMostrarModalRisco(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl transition shadow-sm"
              title="Cadastrar Risco"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sistema de Abas */}
        <div className="flex overflow-x-auto no-scrollbar whitespace-nowrap border-b border-gray-200 mb-6 gap-4 sm:gap-6 bg-white px-3 sm:px-6 rounded-t-2xl border-x border-t pt-2">
          {[
            { id: "dashboards", label: "Dashboards", icon: LayoutDashboard },
            { id: "tarefas", label: "Tarefas", icon: ListTodo },
            { id: "riscos", label: "Riscos", icon: AlertTriangle },
            { id: "feedback", label: "IA Feedback", icon: Brain },
            { id: "licoes", label: "Lições", icon: BookOpen },
          ].map((aba) => {
            const Icon = aba.icon;
            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center gap-1.5 sm:gap-2 pb-3 pt-2 text-xs sm:text-sm font-medium border-b-2 transition shrink-0 ${
                  abaAtiva === aba.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {aba.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo Dinâmico por Aba */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {/* ABA DASHBOARDS */}
          {abaAtiva === "dashboards" && (
            <div className="space-y-6">
              {/* Card de Previsões Estocásticas */}
              {previsao && (
                <div className="p-5 border border-blue-100 bg-blue-50/40 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Previsão Analítica de Término (Monte Carlo + Earned Schedule)
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                      {previsao.probabilidadeNoPrazo != null ? `${previsao.probabilidadeNoPrazo}% de chance no prazo` : "Calibrando..."}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 text-xs">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block">Término mais provável (P50)</span>
                      <span className="font-bold text-gray-900 text-sm block mt-1">
                        {previsao.dataTerminoP50 ? new Date(previsao.dataTerminoP50 + "T00:00:00").toLocaleDateString("pt-BR") : "N/D"}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block">Cenário com Riscos (P80)</span>
                      <span className="font-bold text-gray-900 text-sm block mt-1">
                        {previsao.dataTerminoP80 ? new Date(previsao.dataTerminoP80 + "T00:00:00").toLocaleDateString("pt-BR") : "N/D"}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block">Variação Acumulada</span>
                      <span className={`font-bold text-sm block mt-1 ${cronograma?.atrasoDias > 0 ? "text-rose-600" : (cronograma?.atrasoDias < 0 ? "text-blue-600" : "text-emerald-600")}`}>
                        {cronograma?.atrasoDias > 0
                          ? `${cronograma.atrasoDias} dias de atraso`
                          : (cronograma?.atrasoDias < 0 ? `${Math.abs(cronograma.atrasoDias)} dias adiantado` : "Em dia")}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block">Índice SPI</span>
                      <span className="font-bold text-gray-900 text-sm block mt-1">
                        {cronograma?.spi != null ? cronograma.spi : "N/D"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status de Tarefas e Riscos */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-5 border border-gray-100 rounded-xl bg-gray-50/50">
                  <h4 className="font-semibold text-gray-800 text-sm mb-3">Distribuição das Tarefas</h4>
                  {caracteristicas ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Concluídas ({caracteristicas.concluidas})</span>
                          <span>{caracteristicas.totalTarefas > 0 ? Math.round((caracteristicas.concluidas / caracteristicas.totalTarefas) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${caracteristicas.totalTarefas > 0 ? (caracteristicas.concluidas / caracteristicas.totalTarefas) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Em Andamento ({caracteristicas.emAndamento})</span>
                          <span>{caracteristicas.totalTarefas > 0 ? Math.round((caracteristicas.emAndamento / caracteristicas.totalTarefas) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${caracteristicas.totalTarefas > 0 ? (caracteristicas.emAndamento / caracteristicas.totalTarefas) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Não Iniciadas ({caracteristicas.naoIniciadas})</span>
                          <span>{caracteristicas.totalTarefas > 0 ? Math.round((caracteristicas.naoIniciadas / caracteristicas.totalTarefas) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gray-400 h-2 rounded-full"
                            style={{ width: `${caracteristicas.totalTarefas > 0 ? (caracteristicas.naoIniciadas / caracteristicas.totalTarefas) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Sem dados de tarefas.</p>
                  )}
                </div>

                <div className="p-5 border border-gray-100 rounded-xl bg-gray-50/50">
                  <h4 className="font-semibold text-gray-800 text-sm mb-3">Riscos por Severidade</h4>
                  {listaRiscos.length > 0 ? (
                    <div className="space-y-2 text-xs">
                      {listaRiscos.map((r, idx) => (
                        <div key={r.id || idx} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-lg">
                          <span className="font-medium text-gray-800 truncate max-w-[200px]">{r.descricao}</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            r.severidade === "Crítico" ? "bg-rose-100 text-rose-800" :
                            r.severidade === "Alto" ? "bg-amber-100 text-amber-800" :
                            r.severidade === "Médio" ? "bg-yellow-100 text-yellow-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {r.severidade || "Normal"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhum risco registrado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA TAREFAS (BACKLOG KANBAN + GRAFO CPM) */}
          {abaAtiva === "tarefas" && (() => {
            const todasTarefas = [...(projeto?.tarefas || [])].sort((a, b) => (a.id || 0) - (b.id || 0));

            const tarefasAFazer = todasTarefas.filter(
              (t) => t.status === "A Fazer" || (!t.status && (t.percentualConcluido ?? 0) === 0)
            );
            const tarefasFazendo = todasTarefas.filter(
              (t) => t.status === "Fazendo" || (!t.status && (t.percentualConcluido ?? 0) > 0 && (t.percentualConcluido ?? 0) < 100)
            );
            const tarefasFeito = todasTarefas.filter(
              (t) => t.status === "Feito" || (!t.status && (t.percentualConcluido ?? 0) === 100)
            );

            return (
              <div>
                {/* Cabeçalho com Seletor de Modo (Backlog vs Grafo) */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <ListTodo className="h-5 w-5 text-blue-600" />
                      Backlog e Tarefas do Projeto
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Organize o fluxo em <strong>A Fazer</strong>, <strong>Fazendo</strong> e <strong>Feito</strong> mantendo a porcentagem e o caminho crítico.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Botões de alternância de visualização */}
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setModoVisualizacaoTarefas("backlog")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                          modoVisualizacaoTarefas === "backlog"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Kanban className="h-3.5 w-3.5" />
                        Quadro Backlog
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoVisualizacaoTarefas("grafo")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                          modoVisualizacaoTarefas === "grafo"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <List className="h-3.5 w-3.5" />
                        Grafo CPM (Lista)
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setDescTarefa("");
                        setDuracao(5);
                        setStatusTarefa("A Fazer");
                        setPctTarefa(0);
                        setMostrarModalTarefa(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> Nova Tarefa
                    </button>
                  </div>
                </div>

                {/* VISUALIZAÇÃO 1: QUADRO BACKLOG (A FAZER | FAZENDO | FEITO) */}
                {modoVisualizacaoTarefas === "backlog" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* COLUNA: A FAZER */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                          <h4 className="font-bold text-sm text-slate-800">A Fazer</h4>
                        </div>
                        <span className="text-xs font-bold bg-white text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                          {tarefasAFazer.length}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                        {tarefasAFazer.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                            Nenhuma tarefa pendente
                          </div>
                        ) : (
                          tarefasAFazer.map((t) => {
                            const cpmInfo = cpmMap.get(t.id);
                            const isCritica = cpmInfo?.critica;
                            const folga = cpmInfo?.folga ?? 0;
                            const pct = t.percentualConcluido ?? 0;

                            return (
                              <div
                                key={t.id}
                                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition space-y-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-900 text-sm leading-snug">{t.descricao}</p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      <span className="text-[11px] font-semibold text-slate-400">ID: #{t.id}</span>
                                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {t.duracaoDias}d
                                      </span>
                                      {isCritica && (
                                        <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                                          Gargalo (0d)
                                        </span>
                                      )}
                                      {!isCritica && folga > 0 && (
                                        <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                                          Folga: {folga}d
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleAbrirEditar(t)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                      title="Editar tarefa"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleExcluirTarefa(t.id, t.descricao)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                      title="Excluir tarefa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Barra de Progresso */}
                                <div>
                                  <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                                    <span>Progresso</span>
                                    <span className="font-bold text-slate-700">{pct}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-slate-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>

                                {/* Ações rápidas de movimentação no Backlog */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => handleMudarStatusRapido(t, "Fazendo")}
                                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1"
                                    title="Mover para Fazendo (Inicia com 50% de avanço)"
                                  >
                                    <PlayCircle className="h-3.5 w-3.5" />
                                    Iniciar
                                  </button>
                                  <button
                                    onClick={() => handleMudarStatusRapido(t, "Feito")}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-1.5 px-2 rounded-lg transition"
                                    title="Concluir tarefa diretamente (100%)"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* COLUNA: FAZENDO */}
                    <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4 flex flex-col">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-200/70">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                          <h4 className="font-bold text-sm text-blue-900">Fazendo</h4>
                        </div>
                        <span className="text-xs font-bold bg-white text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                          {tarefasFazendo.length}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                        {tarefasFazendo.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-blue-200 rounded-xl text-xs text-blue-400">
                            Nenhuma tarefa em execução
                          </div>
                        ) : (
                          tarefasFazendo.map((t) => {
                            const cpmInfo = cpmMap.get(t.id);
                            const isCritica = cpmInfo?.critica;
                            const folga = cpmInfo?.folga ?? 0;
                            const pct = t.percentualConcluido ?? 50;

                            return (
                              <div
                                key={t.id}
                                className="bg-white p-4 rounded-xl border border-blue-200 hover:border-blue-300 shadow-xs hover:shadow-sm transition space-y-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-900 text-sm leading-snug">{t.descricao}</p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      <span className="text-[11px] font-semibold text-slate-400">ID: #{t.id}</span>
                                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {t.duracaoDias}d
                                      </span>
                                      {isCritica && (
                                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          Gargalo Ativo
                                        </span>
                                      )}
                                      {!isCritica && folga > 0 && (
                                        <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                                          Folga: {folga}d
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleAbrirEditar(t)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                      title="Editar tarefa"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleExcluirTarefa(t.id, t.descricao)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                      title="Excluir tarefa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Barra de Progresso Interativa */}
                                <div>
                                  <div className="flex justify-between items-center text-[11px] text-slate-600 mb-1">
                                    <span>Progresso Atual</span>
                                    <span className="font-bold text-blue-600">{pct}%</span>
                                  </div>
                                  <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  {/* Botões rápidos de avanço de porcentagem */}
                                  <div className="flex items-center justify-between gap-1 mt-2">
                                    {[25, 50, 75].map((val) => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => handleAjustarProgressoRapido(t, val)}
                                        className={`text-[10px] py-0.5 px-2 rounded font-semibold transition ${
                                          pct === val
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                      >
                                        {val}%
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Ações de movimentação no Backlog */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => handleMudarStatusRapido(t, "A Fazer")}
                                    className="text-slate-500 hover:text-slate-800 text-xs py-1 px-2 hover:bg-slate-100 rounded-lg transition"
                                    title="Voltar para A Fazer (0%)"
                                  >
                                    ⬅️ A Fazer
                                  </button>
                                  <button
                                    onClick={() => handleMudarStatusRapido(t, "Feito")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition flex items-center gap-1 shadow-2xs"
                                    title="Concluir tarefa (100%)"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Concluir
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* COLUNA: FEITO */}
                    <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4 flex flex-col">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200/70">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <h4 className="font-bold text-sm text-emerald-900">Feito</h4>
                        </div>
                        <span className="text-xs font-bold bg-white text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                          {tarefasFeito.length}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                        {tarefasFeito.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-emerald-200 rounded-xl text-xs text-emerald-500">
                            Nenhuma tarefa concluída ainda
                          </div>
                        ) : (
                          tarefasFeito.map((t) => {
                            const cpmInfo = cpmMap.get(t.id);
                            const isCritica = cpmInfo?.critica;

                            return (
                              <div
                                key={t.id}
                                className="bg-white/95 p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-3 opacity-90 hover:opacity-100 transition"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <p className="font-bold text-slate-800 text-sm line-through text-slate-500">{t.descricao}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      <span className="text-[11px] font-semibold text-slate-400">ID: #{t.id}</span>
                                      <span className="text-[11px] text-slate-500">Duração: {t.duracaoDias}d</span>
                                      {isCritica && (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                                          Caminho Crítico (OK)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleAbrirEditar(t)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                      title="Editar tarefa"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleExcluirTarefa(t.id, t.descricao)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                      title="Excluir tarefa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Barra de Progresso 100% */}
                                <div>
                                  <div className="flex justify-between items-center text-[11px] text-emerald-700 font-semibold mb-1">
                                    <span>Concluída</span>
                                    <span>100%</span>
                                  </div>
                                  <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full w-full" />
                                  </div>
                                </div>

                                {/* Ação de Reabrir */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                                  <button
                                    onClick={() => handleMudarStatusRapido(t, "Fazendo")}
                                    className="text-slate-500 hover:text-blue-700 text-xs font-medium py-1 px-2.5 rounded-lg hover:bg-slate-100 transition"
                                    title="Reabrir tarefa e mover para Fazendo (50%)"
                                  >
                                    ⬅️ Reabrir Tarefa
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* VISUALIZAÇÃO 2: GRAFO CPM (LISTA COM DETALHES DE GARGALO E FOLGAS) */}
                {modoVisualizacaoTarefas === "grafo" && (
                  <div>
                    {todasTarefas.length > 0 ? (
                      <div className="space-y-3">
                        {todasTarefas.map((t, idx) => {
                          const cpmInfo = cpmMap.get(t.id);
                          const isCritica = cpmInfo?.critica;
                          const folga = cpmInfo?.folga ?? 0;
                          const pct = t.percentualConcluido ?? 0;
                          const isConcluida = pct === 100;
                          const isGargaloAtivo = isCritica && !isConcluida;
                          const statusAtual = t.status || (isConcluida ? "Feito" : pct > 0 ? "Fazendo" : "A Fazer");

                          return (
                            <div
                              key={t.id || idx}
                              className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition bg-white shadow-sm ${
                                isGargaloAtivo
                                  ? "border-rose-300 ring-1 ring-rose-200"
                                  : isConcluida
                                  ? "border-gray-200 bg-gray-50/30"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex-1 mr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${isConcluida ? "text-emerald-600" : "text-gray-300"}`} />
                                  <p className="font-bold text-gray-900 text-sm">{t.descricao}</p>

                                  {/* Badge de Status do Backlog */}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    statusAtual === "Feito"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : statusAtual === "Fazendo"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}>
                                    {statusAtual}
                                  </span>

                                  {isGargaloAtivo && (
                                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Gargalo Crítico Ativo (Folga 0d)
                                    </span>
                                  )}
                                  {isCritica && isConcluida && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                                      Caminho Crítico (Concluído)
                                    </span>
                                  )}
                                  {!isCritica && folga > 0 && (
                                    <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                                      Folga: {folga}d
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-4 mt-2">
                                  <div className="w-36 bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-600">{pct}%</span>
                                  <span className="text-xs text-gray-400">Duração: {t.duracaoDias} dias</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAbrirEditar(t)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Atualizar tarefa e progresso"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleExcluirTarefa(t.id, t.descricao)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Excluir tarefa"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium ml-1">
                                  ID: {t.id}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm py-8 text-center">Nenhuma tarefa cadastrada até o momento.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ABA RISCOS */}
          {abaAtiva === "riscos" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Matriz Quantitativa de Riscos</h3>
                  <p className="text-xs text-gray-500">Riscos alimentam a Simulação de Monte Carlo com impacto estocástico de término.</p>
                </div>
                <button
                  onClick={() => setMostrarModalRisco(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-2 rounded-xl"
                >
                  + Cadastrar Risco
                </button>
              </div>

              {listaRiscos.length > 0 ? (
                <div className="space-y-3">
                  {listaRiscos.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className="p-4 border border-gray-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white hover:border-gray-300 transition"
                    >
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{r.descricao}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Probabilidade: {Math.round((r.probabilidade || 0.5) * 100)}% | Impacto potencial: {r.impactoDias || r.impacto || 1} dias
                          {r.exposicaoDias ? ` | Exposição: ${r.exposicaoDias}d` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          r.severidade === "Crítico" ? "bg-rose-100 text-rose-800" :
                          r.severidade === "Alto" ? "bg-amber-100 text-amber-800" :
                          r.severidade === "Médio" ? "bg-yellow-100 text-yellow-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {r.severidade || "MÉDIO"}
                        </span>
                        {r.id && (
                          <>
                            <button
                              onClick={() => handleAbrirEditarRisco(r)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Editar risco"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleExcluirRisco(r.id, r.descricao)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Excluir risco"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center">Nenhum risco cadastrado para este projeto.</p>
              )}
            </div>
          )}

          {/* ABA IA FEEDBACK */}
          {abaAtiva === "feedback" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Diagnóstico e Histórico Analítico</h3>
                <button
                  onClick={() => navigate(`/projetos/${id}/analise`)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Ver Análise Completa &rarr;
                </button>
              </div>

              {metricas?.alertas && metricas.alertas.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                  <h4 className="font-semibold text-amber-900 text-sm mb-2">Alertas do Motor Analítico</h4>
                  <ul className="text-xs text-amber-800 space-y-1">
                    {metricas.alertas.map((al, i) => (
                      <li key={i}>• {al}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <h4 className="font-semibold text-blue-900 text-sm">Resumo da Calibração Histórica</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Amostras históricas do usuário: {metricas?.historico?.amostrasHistoricasUsuario ?? 0} tarefa(s) concluída(s).
                  Fator de calibração empírico atual: x{metricas?.previsao?.fatorCalibracaoHistorica ?? 1.0}.
                </p>
              </div>
            </div>
          )}

          {/* ABA LIÇÕES */}
          {abaAtiva === "licoes" && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Lições Aprendidas Relevantes (RAG)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    O motor RAG aprende automaticamente quando você conclui tarefas ou mapeia riscos, além de permitir registros manuais.
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalLicao(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Registrar Lição Aprendida
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3">
                  Top Recomendações Correlacionadas ao Projeto Atual
                </h4>
                {metricas?.licoesRelevantes && metricas.licoesRelevantes.length > 0 ? (
                  <div className="space-y-3">
                    {metricas.licoesRelevantes.map((licao, idx) => (
                      <div key={idx} className="p-4 border border-purple-200 rounded-xl bg-purple-50/30">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-semibold">
                          Match Semântico / Contextual #{idx + 1}
                        </span>
                        <p className="text-sm font-medium text-gray-800 mt-2">{licao}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-6 text-center">Nenhuma lição aprendida correlacionada no momento.</p>
                )}
              </div>

              {todasLicoes.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Base de Conhecimento RAG ({todasLicoes.length} lições armazenadas)
                  </h4>
                  <div className="space-y-2.5">
                    {todasLicoes.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 border border-gray-200 rounded-xl flex items-center justify-between gap-3 bg-white hover:border-gray-300 transition"
                      >
                        <div>
                          <span className="text-[11px] font-bold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                            {item.categoria || "Geral"}
                          </span>
                          <p className="text-xs text-gray-700 mt-1.5">{item.descricaoConhecimento}</p>
                        </div>
                        <button
                          onClick={() => handleExcluirLicao(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                          title="Remover da base RAG"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Nova Tarefa com Backlog e Progresso */}
        {mostrarModalTarefa && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Adicionar Tarefa ao Backlog</h3>
              <form onSubmit={handleNovaTarefa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição da Tarefa</label>
                  <input
                    type="text"
                    value={descTarefa}
                    onChange={(e) => setDescTarefa(e.target.value)}
                    placeholder="Ex: Desenvolvimento da API de Pagamento"
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duração Estimada (Dias)</label>
                  <input
                    type="number"
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    min="1"
                    required
                  />
                </div>

                {/* Seleção de Status do Backlog */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status no Backlog</label>
                  <select
                    value={statusTarefa}
                    onChange={(e) => {
                      const st = e.target.value;
                      setStatusTarefa(st);
                      if (st === "Feito") setPctTarefa(100);
                      else if (st === "A Fazer") setPctTarefa(0);
                      else if (st === "Fazendo" && (pctTarefa === 0 || pctTarefa === 100)) setPctTarefa(50);
                    }}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="A Fazer">📌 A Fazer</option>
                    <option value="Fazendo">⚡ Fazendo (Em Andamento)</option>
                    <option value="Feito">✅ Feito (Concluído)</option>
                  </select>
                </div>

                {/* % Concluído com sincronização */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-600">% Concluído (Avanço Físico)</label>
                    <span className="text-xs font-bold text-blue-600">{pctTarefa}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={pctTarefa}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setPctTarefa(val);
                      if (val === 100) setStatusTarefa("Feito");
                      else if (val > 0) setStatusTarefa("Fazendo");
                      else setStatusTarefa("A Fazer");
                    }}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalTarefa(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
                  >
                    Salvar Tarefa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Tarefa com Backlog e Progresso */}
        {mostrarModalEditar && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Atualizar Tarefa e Progresso</h3>
              <form onSubmit={handleSalvarEdicao} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={descEdit}
                    onChange={(e) => setDescEdit(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duração Planejada (Dias)</label>
                  <input
                    type="number"
                    value={duracaoEdit}
                    onChange={(e) => setDuracaoEdit(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    min="1"
                    required
                  />
                </div>

                {/* Seleção de Status do Backlog */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status no Backlog</label>
                  <select
                    value={statusEdit}
                    onChange={(e) => {
                      const st = e.target.value;
                      setStatusEdit(st);
                      if (st === "Feito") setPctEdit(100);
                      else if (st === "A Fazer") setPctEdit(0);
                      else if (st === "Fazendo" && (pctEdit === 0 || pctEdit === 100)) setPctEdit(50);
                    }}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="A Fazer">📌 A Fazer</option>
                    <option value="Fazendo">⚡ Fazendo (Em Andamento)</option>
                    <option value="Feito">✅ Feito (Concluído)</option>
                  </select>
                </div>

                {/* % Concluído com sincronização */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-600">% Concluído (Avanço Físico)</label>
                    <span className="text-xs font-bold text-blue-600">{pctEdit}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={pctEdit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setPctEdit(val);
                      if (val === 100) setStatusEdit("Feito");
                      else if (val > 0) setStatusEdit("Fazendo");
                      else setStatusEdit("A Fazer");
                    }}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalEditar(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Novo Risco */}
        {mostrarModalRisco && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cadastrar Risco</h3>
              <form onSubmit={handleNovoRisco} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição do Risco</label>
                  <input
                    type="text"
                    value={descRisco}
                    onChange={(e) => setDescRisco(e.target.value)}
                    placeholder="Ex: Atraso na aprovação de ambiente pelo cliente"
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-600">Probabilidade de Ocorrência</label>
                    <span className="text-xs font-bold text-amber-600">{probRisco}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    step="5"
                    value={probRisco}
                    onChange={(e) => setProbRisco(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Impacto Potencial de Atraso (Dias)</label>
                  <input
                    type="number"
                    value={impactoRisco}
                    onChange={(e) => setImpactoRisco(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    min="1"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalRisco(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
                  >
                    Cadastrar Risco
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Risco */}
        {mostrarModalEditarRisco && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Risco</h3>
              <form onSubmit={handleSalvarEdicaoRisco} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição do Risco</label>
                  <input
                    type="text"
                    value={descRiscoEdit}
                    onChange={(e) => setDescRiscoEdit(e.target.value)}
                    placeholder="Ex: Atraso na aprovação de ambiente pelo cliente"
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-600">Probabilidade de Ocorrência</label>
                    <span className="text-xs font-bold text-amber-600">{probRiscoEdit}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    step="5"
                    value={probRiscoEdit}
                    onChange={(e) => setProbRiscoEdit(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Impacto Potencial de Atraso (Dias)</label>
                  <input
                    type="number"
                    value={impactoRiscoEdit}
                    onChange={(e) => setImpactoRiscoEdit(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    min="1"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalEditarRisco(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Registrar Lição Aprendida (RAG) */}
        {mostrarModalLicao && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar Lição Aprendida (RAG)</h3>
              <form onSubmit={handleNovaLicao} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria de Conhecimento</label>
                  <select
                    value={categoriaLicao}
                    onChange={(e) => setCategoriaLicao(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                  >
                    <option value="Geral">📘 Geral</option>
                    <option value="Cronograma">⏱️ Cronograma e Prazos</option>
                    <option value="Riscos">⚠️ Riscos e Mitigação</option>
                    <option value="Arquitetura">🏗️ Arquitetura e Integração</option>
                    <option value="Qualidade">✅ Qualidade e Testes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição do Aprendizado / Recomendação</label>
                  <textarea
                    rows={3}
                    value={descLicao}
                    onChange={(e) => setDescLicao(e.target.value)}
                    placeholder="Ex: Validar regras de estoque e pagamento com testes integrados reduz falhas em homologação..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalLicao(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
                  >
                    Salvar na Base RAG
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Projeto */}
        {mostrarModalEditarProjeto && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Projeto</h3>
              <form onSubmit={handleSalvarEdicaoProjeto} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Projeto</label>
                  <input
                    type="text"
                    value={nomeProjetoEdit}
                    onChange={(e) => setNomeProjetoEdit(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    value={descProjetoEdit}
                    onChange={(e) => setDescProjetoEdit(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalEditarProjeto(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
                  >
                    Salvar Projeto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProjetoPage;