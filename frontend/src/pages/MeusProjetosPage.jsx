import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarProjetos, criarProjeto, atualizarProjeto, deletarProjeto } from "../services/projetoService.js";
import { obterMetricasProjeto } from "../services/auditoriaService.js";
import { useAuth } from "../context/AuthContext.jsx";
import UserMenuDropdown from "../components/UserMenuDropdown.jsx";
import { Brain, LayoutDashboard, Plus, Network, BookOpen, Pencil, Trash2 } from "lucide-react";

function MeusProjetosPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [projetos, setProjetos] = useState([]);
  const [metricasProjetos, setMetricasProjetos] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");

  // Estados para edição do projeto
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [projetoEditando, setProjetoEditando] = useState(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [descricaoEdit, setDescricaoEdit] = useState("");
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);

  const carregarProjetos = async (silencioso = false) => {
    if (!silencioso && projetos.length === 0) setCarregando(true);
    try {
      const usuarioId = user?.id || user?.userId;
      const dados = await listarProjetos(usuarioId);
      const listaSegura = Array.isArray(dados) ? dados : [];
      setProjetos(listaSegura);
      setCarregando(false); // Exibe os projetos imediatamente sem esperar o cálculo de todas as métricas

      if (listaSegura.length > 0) {
        listaSegura.forEach((p) => {
          obterMetricasProjeto(p.id)
            .then((m) => {
              if (m) {
                setMetricasProjetos((prev) => ({ ...prev, [p.id]: m }));
              }
            })
            .catch(() => { });
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProjetos();
  }, [user?.id, user?.userId]);

  const handleCriarProjeto = async (e) => {
    e.preventDefault();
    if (!novoNome.trim() || salvandoRef.current) return;
    salvandoRef.current = true;
    setSalvando(true);

    const nomeLimpo = novoNome.trim();
    const descLimpa = novaDescricao.trim();
    setNovoNome("");
    setNovaDescricao("");
    setMostrarModal(false);

    try {
      const criado = await criarProjeto({
        nome: nomeLimpo,
        descricao: descLimpa,
        usuarioId: user?.id || user?.userId,
      });
      if (criado && criado.id) {
        setProjetos((prev) => {
          if (prev.some((p) => p.id === criado.id)) return prev;
          return [...prev, criado];
        });
      }
      carregarProjetos(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar projeto.");
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  const handleAbrirEditarProjeto = (p) => {
    setProjetoEditando(p);
    setNomeEdit(p.nome);
    setDescricaoEdit(p.descricao || "");
    setMostrarModalEditar(true);
  };

  const handleSalvarEdicaoProjeto = async (e) => {
    e.preventDefault();
    if (!nomeEdit.trim() || !projetoEditando || salvandoRef.current) return;
    salvandoRef.current = true;
    setSalvando(true);
    const idAlvo = projetoEditando.id;
    const nEdit = nomeEdit.trim();
    const dEdit = descricaoEdit.trim();
    setMostrarModalEditar(false);
    setProjetoEditando(null);
    setProjetos((prev) =>
      prev.map((p) => (p.id === idAlvo ? { ...p, nome: nEdit, descricao: dEdit } : p))
    );
    try {
      await atualizarProjeto(idAlvo, {
        nome: nEdit,
        descricao: dEdit,
      });
      carregarProjetos(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar o projeto no banco de dados.");
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  const handleExcluirProjeto = async (id, nome) => {
    const confirmou = window.confirm(
      `Deseja realmente excluir o projeto "${nome}"? Todos os dados vinculados (tarefas, riscos e análises) serão excluídos permanentemente do banco de dados.`
    );
    if (!confirmou) return;

    // Atualização otimista instantânea (0ms): remove o card da tela e já renumera os restantes (1, 2, 3...)
    setProjetos((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p, idx) => ({ ...p, numeroProjeto: idx + 1 }))
    );

    try {
      await deletarProjeto(id);
      carregarProjetos(true);
    } catch (err) {
      console.error(err);
      carregarProjetos(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Padronizado */}
      <header className="bg-white border-b border-gray-200 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2.5">
            <div
              onClick={() => navigate("/projetos")}
              className="flex items-center gap-3 cursor-pointer group"
              title="Página inicial"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition">ProjectMind</h1>
                <p className="text-xs text-gray-500">Gestão Inteligente de Projetos</p>
              </div>
            </div>

            <div className="flex items-center">
              <UserMenuDropdown />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Meus Projetos</h2>
              <p className="text-gray-500 text-sm">{projetos.length} projeto(s) ativo(s)</p>
            </div>
          </div>
          <button
            onClick={() => setMostrarModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Projeto
          </button>
        </div>

        {/* Modal Criar Projeto */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Criar Novo Projeto</h2>
              <form onSubmit={handleCriarProjeto} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Projeto</label>
                  <input
                    type="text"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Sistema de E-commerce"
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                  <textarea
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    placeholder="Descrição breve dos objetivos..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 h-24 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                  >
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Projeto */}
        {mostrarModalEditar && projetoEditando && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Renomear / Editar Projeto</h2>
              <p className="text-xs text-gray-400 mb-4">As alterações serão salvas permanentemente no banco de dados.</p>
              <form onSubmit={handleSalvarEdicaoProjeto} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Projeto</label>
                  <input
                    type="text"
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    placeholder="Ex: Sistema de E-commerce"
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                  <textarea
                    value={descricaoEdit}
                    onChange={(e) => setDescricaoEdit(e.target.value)}
                    placeholder="Descrição breve dos objetivos..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 h-24 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalEditar(false);
                      setProjetoEditando(null);
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
                  >
                    Salvar Alteração
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Listagem de Projetos */}
        {carregando ? (
          <div className="text-center py-16 text-gray-500">Carregando projetos...</div>
        ) : projetos.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-700 font-medium text-lg">Nenhum projeto cadastrado.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo Projeto" para iniciar sua gestão inteligente.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projetos.map((projeto, idx) => {
              const metrica = metricasProjetos[projeto.id];
              const scoreTexto = metrica?.scoreSaude != null ? `${metrica.scoreSaude}% Saúde` : "—";
              const progressoReal = metrica?.cronograma?.progressoRealPercentual ?? 0;
              const situacaoPrazo = metrica?.cronograma?.situacaoPrazo;

              return (
                <div
                  key={projeto.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="text-xl font-bold text-gray-900 leading-snug break-words flex-1"><span className="text-xs font-mono font-semibold text-gray-400 mr-2">#{projeto.numeroProjeto || idx + 1}</span>{projeto.nome}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold mr-1 ${metrica?.scoreSaude != null && metrica.scoreSaude < 40 ? "bg-amber-100 text-amber-800" :
                            metrica?.scoreSaude != null && metrica.scoreSaude >= 70 ? "bg-emerald-100 text-emerald-800" :
                              "bg-blue-50 text-blue-700"
                          }`}>
                          {scoreTexto}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEditarProjeto(projeto);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Renomear / Editar Projeto"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExcluirProjeto(projeto.id, projeto.nome);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Excluir Projeto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {projeto.descricao || "Sem descrição informada."}
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                        <span>Progresso Físico Real</span>
                        <span className="font-semibold text-gray-900">{progressoReal}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, progressoReal))}%` }}
                        ></div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/projetos/${projeto.id}`)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl py-2.5 transition text-center shadow-sm"
                    >
                      Abrir Projeto
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default MeusProjetosPage;