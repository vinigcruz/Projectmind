import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import UserMenuDropdown from "../components/UserMenuDropdown.jsx";
import {
  obterResumoAdmin,
  listarUsuariosAdmin,
  alterarRoleUsuarioAdmin,
  excluirUsuarioAdmin,
  listarProjetosAdmin,
  excluirProjetoAdmin,
  listarLicoesAdmin,
  adicionarLicaoAdmin,
  excluirLicaoAdmin,
} from "../services/adminService.js";
import {
  Brain,
  ShieldCheck,
  Users,
  FolderKanban,
  BookOpen,
  AlertTriangle,
  Search,
  User,
  Plus,
  Trash2,
  ArrowUpRight,
  Crown,
  UserCheck,
  RefreshCw,
} from "lucide-react";

const CATEGORIAS_RAG = ["Todas", "Geral", "Cronograma", "Riscos", "Arquitetura", "Qualidade"];

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState("usuarios");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");

  const [resumo, setResumo] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [licoes, setLicoes] = useState([]);

  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [buscaProjeto, setBuscaProjeto] = useState("");
  const [buscaLicao, setBuscaLicao] = useState("");
  const [filtroCategoriaRag, setFiltroCategoriaRag] = useState("Todas");

  // Modal Nova Lição RAG
  const [mostrarModalLicao, setMostrarModalLicao] = useState(false);
  const [categoriaLicao, setCategoriaLicao] = useState("Geral");
  const [descLicao, setDescLicao] = useState("");
  const [salvandoLicao, setSalvandoLicao] = useState(false);

  const myUserId = user?.id || user?.userId;

  const carregarDadosAdmin = async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    setErro("");
    try {
      const [dadosResumo, dadosUsuarios, dadosProjetos, dadosLicoes] = await Promise.all([
        obterResumoAdmin(),
        listarUsuariosAdmin(),
        listarProjetosAdmin(),
        listarLicoesAdmin(),
      ]);
      setResumo(dadosResumo);
      setUsuarios(Array.isArray(dadosUsuarios) ? dadosUsuarios : []);
      setProjetos(Array.isArray(dadosProjetos) ? dadosProjetos : []);
      setLicoes(Array.isArray(dadosLicoes) ? dadosLicoes : []);
    } catch (err) {
      const msg =
        err.response?.data?.erro ||
        err.response?.data?.error ||
        "Não foi possível carregar os dados administrativos.";
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosAdmin(false);
  }, []);

  const mostrarMensagemTemporaria = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3500);
  };

  const handleAlterarRole = async (alvo) => {
    const novaRole = alvo.isAdmin ? "USER" : "ADMIN";
    const acaoTexto = novaRole === "ADMIN" ? "promover para Administrador" : "rebaixar para Usuário comum";
    if (!window.confirm(`Deseja realmente ${acaoTexto} a conta "${alvo.nome}" (${alvo.email})?`)) {
      return;
    }
    try {
      await alterarRoleUsuarioAdmin(alvo.id, novaRole);
      mostrarMensagemTemporaria(`Perfil de ${alvo.nome} atualizado para ${novaRole}.`);
      carregarDadosAdmin(true);
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao alterar perfil do usuário.");
    }
  };

  const handleExcluirUsuario = async (alvo) => {
    if (
      !window.confirm(
        `Atenção! Excluir o usuário "${alvo.nome}" (${alvo.email}) também removerá todos os ${alvo.totalProjetos} projeto(s) vinculados a ele. Confirmar?`
      )
    ) {
      return;
    }
    try {
      await excluirUsuarioAdmin(alvo.id);
      mostrarMensagemTemporaria(`Usuário "${alvo.nome}" removido com sucesso.`);
      carregarDadosAdmin(true);
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao excluir usuário.");
    }
  };

  const handleExcluirProjeto = async (proj) => {
    if (!window.confirm(`Deseja excluir o projeto "${proj.nome}" de ${proj.usuarioNome}?`)) {
      return;
    }
    try {
      await excluirProjetoAdmin(proj.id);
      mostrarMensagemTemporaria(`Projeto "${proj.nome}" excluído com sucesso.`);
      carregarDadosAdmin(true);
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao excluir projeto.");
    }
  };

  const handleAdicionarLicao = async (e) => {
    e.preventDefault();
    if (!descLicao.trim()) return;
    setSalvandoLicao(true);
    try {
      await adicionarLicaoAdmin({
        categoria: categoriaLicao,
        descricaoConhecimento: descLicao.trim(),
      });
      setDescLicao("");
      setCategoriaLicao("Geral");
      setMostrarModalLicao(false);
      mostrarMensagemTemporaria("Lição aprendida adicionada à Base RAG global!");
      carregarDadosAdmin(true);
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao salvar lição na base RAG.");
    } finally {
      setSalvandoLicao(false);
    }
  };

  const handleExcluirLicao = async (item) => {
    if (!window.confirm("Deseja remover esta lição aprendida da base de conhecimento RAG?")) return;
    try {
      await excluirLicaoAdmin(item.id);
      mostrarMensagemTemporaria("Lição removida da base RAG.");
      carregarDadosAdmin(true);
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao excluir lição.");
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = buscaUsuario.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.nome || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const projetosFiltrados = projetos.filter((p) => {
    const q = buscaProjeto.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.nome || "").toLowerCase().includes(q) ||
      (p.usuarioNome || "").toLowerCase().includes(q) ||
      (p.usuarioEmail || "").toLowerCase().includes(q)
    );
  });

  const licoesFiltradas = licoes.filter((l) => {
    const catOk =
      filtroCategoriaRag === "Todas" ||
      (l.categoria || "Geral").toLowerCase() === filtroCategoriaRag.toLowerCase();
    const q = buscaLicao.trim().toLowerCase();
    const textoOk =
      !q ||
      (l.descricaoConhecimento || "").toLowerCase().includes(q) ||
      (l.categoria || "").toLowerCase().includes(q);
    return catOk && textoOk;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Administrativo */}
      <header className="bg-white border-b border-gray-200 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => navigate("/projetos")}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 flex-1"
              title="Voltar para Meus Projetos"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition shrink-0">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight group-hover:text-purple-600 transition truncate">
                    ProjectMind Admin
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200 shrink-0">
                    Governança
                  </span>
                </div>
                <p className="text-xs text-gray-500 hidden sm:block truncate">
                  Gestão Global de Usuários, Projetos e Base RAG
                </p>
              </div>
            </div>

            <div className="flex items-center shrink-0">
              <UserMenuDropdown />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Título e botão atualizar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Crown className="h-6 w-6 text-purple-600" /> Painel de Controle Administrativo
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Controle de privilégios (RBAC), monitoramento global de projetos e curadoria do motor RAG.
            </p>
          </div>
          <button
            onClick={() => carregarDadosAdmin(false)}
            className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition shadow-2xs flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar Dados
          </button>
        </div>

        {erro && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Cards de KPIs Globais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuários Ativos</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mt-3">{resumo?.totalUsuarios ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-1">
              {resumo ? `${resumo.totalAdmins} admin(s) • ${resumo.totalUsuariosComuns} usuário(s)` : "Carregando..."}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projetos Globais</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mt-3">{resumo?.totalProjetos ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-1">
              {resumo
                ? `${resumo.totalTarefas} tarefas (${resumo.totalTarefasConcluidas} concluídas)`
                : "Carregando..."}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Riscos Mapeados</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mt-3">{resumo?.totalRiscos ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Monitorados na Simulação de Monte Carlo</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Base RAG (IA)</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mt-3">{resumo?.totalLicoesRag ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Lições aprendidas calibrando o modelo</p>
          </div>
        </div>

        {/* Abas do Painel Admin */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 px-4 sm:px-6 pt-2 gap-4 sm:gap-6">
            {[
              { id: "usuarios", label: `Gestão de Usuários (${usuarios.length})`, icon: Users },
              { id: "projetos", label: `Torre de Projetos (${projetos.length})`, icon: FolderKanban },
              { id: "rag", label: `Curadoria Base RAG (${licoes.length})`, icon: BookOpen },
            ].map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-center gap-2 pb-3 pt-2 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap shrink-0 ${abaAtiva === aba.id
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {aba.label}
                </button>
              );
            })}
          </div>

          <div className="p-5 sm:p-6">
            {carregando ? (
              <div className="py-16 text-center text-gray-400">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm">Carregando dados administrativos...</p>
              </div>
            ) : (
              <>
                {/* ABA 1: GESTÃO DE USUÁRIOS */}
                {abaAtiva === "usuarios" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Contas Cadastradas e Privilégios</h3>
                        <p className="text-xs text-gray-500">
                          Novos cadastros sempre iniciam como <strong>USER</strong>. Apenas administradores podem promover contas.
                        </p>
                      </div>
                      <div className="relative w-full sm:w-72">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={buscaUsuario}
                          onChange={(e) => setBuscaUsuario(e.target.value)}
                          placeholder="Buscar por nome ou e-mail..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                            <th className="py-3 px-4 font-semibold">Usuário</th>
                            <th className="py-3 px-4 font-semibold">Perfil</th>
                            <th className="py-3 px-4 font-semibold text-center">Projetos</th>
                            <th className="py-3 px-4 font-semibold text-center">Tarefas</th>
                            <th className="py-3 px-4 font-semibold text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {usuariosFiltrados.map((u) => {
                            const isSelf = Number(u.id) === Number(myUserId);
                            const bloqueadoRebaixar = isSelf || u.isMasterAdmin;
                            return (
                              <tr key={u.id} className="hover:bg-gray-50/70 transition">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-gray-900 flex items-center gap-2">
                                    {u.nome}
                                    {isSelf && (
                                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                        Você
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">{u.email}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  {u.isAdmin ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full border border-purple-200">
                                      <ShieldCheck className="h-3.5 w-3.5" /> ADMIN
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                                      <UserCheck className="h-3.5 w-3.5" /> USER
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                                  {u.totalProjetos}
                                </td>
                                <td className="py-3.5 px-4 text-center text-gray-600">{u.totalTarefas}</td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={bloqueadoRebaixar && u.isAdmin}
                                      onClick={() => handleAlterarRole(u)}
                                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition border ${bloqueadoRebaixar && u.isAdmin
                                          ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                          : u.isAdmin
                                            ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                                            : "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                                        }`}
                                      title={
                                        bloqueadoRebaixar && u.isAdmin
                                          ? "Conta-mestre ou conta logada não pode ser rebaixada"
                                          : u.isAdmin
                                            ? "Rebaixar para usuário comum"
                                            : "Promover a administrador"
                                      }
                                    >
                                      {u.isAdmin ? "Rebaixar p/ User" : "Promover p/ Admin"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSelf || u.isMasterAdmin}
                                      onClick={() => handleExcluirUsuario(u)}
                                      className={`p-1.5 rounded-lg transition ${isSelf || u.isMasterAdmin
                                          ? "text-gray-200 cursor-not-allowed"
                                          : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        }`}
                                      title={
                                        isSelf || u.isMasterAdmin
                                          ? "Conta protegida"
                                          : "Excluir usuário e seus projetos"
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {usuariosFiltrados.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                                Nenhum usuário encontrado para a busca informada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ABA 2: TORRE DE CONTROLE DE PROJETOS */}
                {abaAtiva === "projetos" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Torre de Controle de Projetos</h3>
                        <p className="text-xs text-gray-500">
                          Visão consolidada de todos os projetos criados na plataforma por qualquer usuário.
                        </p>
                      </div>
                      <div className="relative w-full sm:w-72">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={buscaProjeto}
                          onChange={(e) => setBuscaProjeto(e.target.value)}
                          placeholder="Buscar projeto ou proprietário..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                            <th className="py-3 px-4 font-semibold">Projeto</th>
                            <th className="py-3 px-4 font-semibold">Proprietário</th>
                            <th className="py-3 px-4 font-semibold text-center">Tarefas</th>
                            <th className="py-3 px-4 font-semibold text-center">Riscos</th>
                            <th className="py-3 px-4 font-semibold">Progresso</th>
                            <th className="py-3 px-4 font-semibold text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {projetosFiltrados.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50/70 transition">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-gray-900">
                                  <span className="text-xs font-mono text-gray-400 mr-1.5">#{p.numeroProjeto}</span>
                                  {p.nome}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                                  {p.descricao || "Sem descrição"}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="text-xs font-semibold text-gray-800">{p.usuarioNome}</div>
                                <div className="text-[11px] text-gray-400">{p.usuarioEmail}</div>
                              </td>
                              <td className="py-3.5 px-4 text-center text-xs font-semibold text-gray-700">
                                {p.tarefasConcluidas}/{p.totalTarefas}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.totalRiscos > 0
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-gray-100 text-gray-500"
                                    }`}
                                >
                                  {p.totalRiscos}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 min-w-[140px]">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${Math.min(100, p.progressoPercentual || 0)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700 w-9 text-right">
                                    {p.progressoPercentual || 0}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/projetos/${p.id}`)}
                                    className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                                  >
                                    Auditar <ArrowUpRight className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExcluirProjeto(p)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Excluir projeto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {projetosFiltrados.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                                Nenhum projeto encontrado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ABA 3: CURADORIA DA BASE DE CONHECIMENTO RAG */}
                {abaAtiva === "rag" && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-600" /> Curadoria da Base de Conhecimento RAG
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Gerencie as lições aprendidas que alimentam o modelo preditivo e a IA (acesso restrito ao Admin).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarModalLicao(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" /> Nova Lição Global
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIAS_RAG.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFiltroCategoriaRag(cat)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${filtroCategoriaRag === cat
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={buscaLicao}
                          onChange={(e) => setBuscaLicao(e.target.value)}
                          placeholder="Filtrar lições..."
                          className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {licoesFiltradas.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 border border-gray-200 rounded-xl flex items-start justify-between gap-3 bg-white hover:border-purple-200 transition"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-full">
                                {item.categoria || "Geral"}
                              </span>
                              <span className="text-[11px] font-mono text-gray-400">RAG #{item.id}</span>
                            </div>
                            <p className="text-sm text-gray-800 mt-2 leading-relaxed">
                              {item.descricaoConhecimento}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExcluirLicao(item)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                            title="Remover da Base RAG"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {licoesFiltradas.length === 0 && (
                        <p className="py-10 text-center text-sm text-gray-400">
                          Nenhuma lição aprendida encontrada com os filtros atuais.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal Nova Lição Global RAG */}
      {mostrarModalLicao && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Registrar Lição Global (RAG)</h3>
            <p className="text-xs text-gray-500 mb-4">
              Esta lição passará a calibrar as análises preditivas e recomendações da IA na plataforma.
            </p>
            <form onSubmit={handleAdicionarLicao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                <select
                  value={categoriaLicao}
                  onChange={(e) => setCategoriaLicao(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="Geral">Geral</option>
                  <option value="Cronograma">Cronograma</option>
                  <option value="Riscos">Riscos</option>
                  <option value="Arquitetura">Arquitetura</option>
                  <option value="Qualidade">Qualidade</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Conhecimento / Boa Prática
                </label>
                <textarea
                  value={descLicao}
                  onChange={(e) => setDescLicao(e.target.value)}
                  placeholder="Ex: Validar contratos de API antes de iniciar o desenvolvimento paralelo reduz atrasos..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalLicao(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoLicao}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {salvandoLicao ? "Salvando..." : "Salvar na Base RAG"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

