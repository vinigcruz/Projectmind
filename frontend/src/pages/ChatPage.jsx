import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { chatIA } from "../services/auditoriaService.js";
import { listarProjetos } from "../services/projetoService.js";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import {
  Brain,
  Send,
  FileText,
  Palette,
  Network,
  BookOpen,
  Calendar,
  Shield,
  AlertTriangle,
  LogOut,
  User,
  Paperclip,
  Upload,
  X,
  CheckCircle2,
  Sparkles,
  FileCheck,
} from "lucide-react";

const sidebarButtons = [
  {
    label: "Arquivos",
    icon: FileText,
    titulo: "Validar Arquivo com a IA",
    descricao: "Envie arquivos de texto, planilhas, CSV ou código para auditoria preditiva e validação técnica.",
    placeholderTexto: "Descreva o conteúdo do arquivo ou cole o texto para análise...",
    promptPadrao: "Por favor, analise e valide as informações deste arquivo no contexto do projeto selecionado, apontando inconsistências, gargalos e melhorias.",
    sugestoes: [
      "Auditoria de consistência com o projeto",
      "Extrair tarefas e dependências a partir do arquivo",
      "Identificar riscos e lacunas técnicas",
    ],
  },
  {
    label: "Protótipo",
    icon: Palette,
    titulo: "Validar Protótipo / UI com a IA",
    descricao: "Envie links do Figma, especificações de telas ou descrições de fluxo de usuário para validar complexidade e viabilidade.",
    placeholderTexto: "Cole o link do Figma, componentes principais ou descrição detalhada das telas e fluxos de UX...",
    promptPadrao: "Avalie a viabilidade deste protótipo/fluxo de telas em relação ao cronograma do projeto e sugira tarefas de desenvolvimento.",
    sugestoes: [
      "Avaliar esforço e complexidade de desenvolvimento",
      "Decompor protótipo em tarefas de frontend",
      "Identificar potenciais riscos de usabilidade e prazo",
    ],
  },
  {
    label: "Diagrama",
    icon: Network,
    titulo: "Validar Diagrama de Arquitetura",
    descricao: "Submeta especificações de arquitetura, banco de dados ou diagramas de fluxo para validação pela IA.",
    placeholderTexto: "Descreva a arquitetura, cole especificações de banco ou diagramas de fluxo...",
    promptPadrao: "Valide esta arquitetura de sistema, identificando pontos únicos de falha, riscos de escalabilidade e dependências críticas.",
    sugestoes: [
      "Identificar gargalos e pontos únicos de falha",
      "Validar viabilidade técnica com o cronograma",
      "Sugerir tarefas de backend e infraestrutura",
    ],
  },
  {
    label: "Documentos",
    icon: BookOpen,
    titulo: "Validar Documentação / EAP",
    descricao: "Envie termos de abertura, Estrutura Analítica do Projeto (EAP) ou atas de reunião para a IA auditar.",
    placeholderTexto: "Cole trechos da documentação, atas ou especificações do projeto...",
    promptPadrao: "Audite esta documentação e verifique se as metas, marcos e entregas estão alinhados ao escopo do projeto.",
    sugestoes: [
      "Auditar clareza e completude do escopo",
      "Identificar entregáveis sem tarefas mapeadas",
      "Validar aderência às boas práticas de gestão",
    ],
  },
  {
    label: "Cronograma",
    icon: Calendar,
    titulo: "Validar Cronograma e Marcos",
    descricao: "Submeta cronogramas externos, marcos de entrega ou estimativas de prazo para conferência contra o CPM e Monte Carlo.",
    placeholderTexto: "Cole marcos de entrega, datas-chave ou estimativas de tempo...",
    promptPadrao: "Compare estas estimativas com as previsões de Monte Carlo e Caminho Crítico do projeto para validar se o prazo é realista.",
    sugestoes: [
      "Verificar se o prazo é factível (P50 vs P80)",
      "Identificar tarefas que podem atrasar a entrega",
      "Sugerir estratégias de nivelamento de prazos",
    ],
  },
  {
    label: "RF/NF",
    icon: Shield,
    titulo: "Validar Requisitos Funcionais e Não-Funcionais",
    descricao: "Audite a lista de requisitos funcionais (RF) e não-funcionais (RNF) com inteligência analítica.",
    placeholderTexto: "Ex:\nRF01: O sistema deve permitir autenticação com JWT...\nRNF01: O tempo de resposta deve ser inferior a 200ms...",
    promptPadrao: "Analise estes requisitos funcionais e não-funcionais, apontando critérios de aceitação ausentes, riscos de implementação e tarefas recomendadas.",
    sugestoes: [
      "Auditar requisitos ambíguos ou incompletos",
      "Decompor requisitos em tarefas técnicas",
      "Mapear riscos de não-atendimento aos RNF",
    ],
  },
  {
    label: "Gestão de Riscos",
    icon: AlertTriangle,
    titulo: "Validar Matriz e Gestão de Riscos",
    descricao: "Envie novos riscos, fatores de incerteza e ameaças para calibrar o impacto probabilístico no projeto.",
    placeholderTexto: "Descreva os novos riscos observados, ameaças ou dependências externas...",
    promptPadrao: "Avalie estes riscos adicionais, calcule a severidade estimada e sugira planos de mitigação práticos.",
    sugestoes: [
      "Quantificar probabilidade e impacto em dias",
      "Propor ações preventivas e planos de contingência",
      "Avaliar o impacto na data final do projeto",
    ],
  },
];

function ChatPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projetos, setProjetos] = useState([]);
  const [selectedProjetoId, setSelectedProjetoId] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagens, setMensagens] = useState([
    {
      id: 1,
      remetente: "ia",
      texto: "Olá! Sou a ProjectMind, sua assistente analítica de gestão de projetos. Você pode conversar comigo, pedir análises preditivas ou enviar arquivos e documentos na barra lateral para validação com IA.",
    },
  ]);

  // Estado para Anexo Rápido de Arquivo na barra inferior
  const [arquivoAnexado, setArquivoAnexado] = useState(null);
  const fileInputChatRef = useRef(null);

  // Estado para o Modal "Adicionar ao Projeto"
  const [modalRecursoAberto, setModalRecursoAberto] = useState(null);
  const [conteudoRecurso, setConteudoRecurso] = useState("");
  const [promptRecurso, setPromptRecurso] = useState("");
  const [arquivoModal, setArquivoModal] = useState(null);
  const [lendoArquivoModal, setLendoArquivoModal] = useState(false);
  const fileInputModalRef = useRef(null);

  const endOfChatRef = useRef(null);

  useEffect(() => {
    async function carregarProjetos() {
      try {
        const usuarioId = user?.id || user?.userId;
        const dados = await listarProjetos(usuarioId);
        setProjetos(dados || []);
        if (dados && dados.length > 0) {
          setSelectedProjetoId(dados[0].id.toString());
        }
      } catch (err) {
        console.warn("Sem conexão com o backend ou projetos ainda não criados.", err);
      }
    }
    carregarProjetos();
  }, [user?.id, user?.userId]);

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  // Envio padrão da barra de texto (com ou sem anexo)
  const handleEnviar = async (e) => {
    e?.preventDefault();
    if ((!pergunta.trim() && !arquivoAnexado) || carregando) return;

    const jaEnviouAntes = mensagens.some((m) => m.remetente === "usuario");
    const primeiraMensagem = !jaEnviouAntes;

    let textoExibicao = pergunta.trim();
    let contextoAdicional = null;

    if (arquivoAnexado) {
      contextoAdicional = `[Arquivo Anexado: ${arquivoAnexado.nome} (${arquivoAnexado.tamanho})]\n${arquivoAnexado.conteudo}`;
      textoExibicao = `📎 Arquivo: ${arquivoAnexado.nome}\n\n${textoExibicao || "Por favor, analise e valide este arquivo."}`;
    }

    const userMessage = {
      id: Date.now(),
      remetente: "usuario",
      texto: textoExibicao,
      anexo: arquivoAnexado ? { nome: arquivoAnexado.nome, tamanho: arquivoAnexado.tamanho } : null,
    };

    setMensagens((prev) => [...prev, userMessage]);
    const promptAtual = pergunta.trim() || (arquivoAnexado ? "Valide e analise as informações contidas no arquivo em anexo no contexto do projeto." : "");

    setPergunta("");
    setArquivoAnexado(null);
    setCarregando(true);

    try {
      const res = await chatIA({
        projetoId: selectedProjetoId ? parseInt(selectedProjetoId) : null,
        pergunta: promptAtual,
        contextoAdicional: contextoAdicional,
        primeiraMensagem: primeiraMensagem,
      });

      const textoResposta = res?.resposta || "Não recebi uma resposta válida da IA.";

      const iaMessage = {
        id: Date.now() + 1,
        remetente: "ia",
        texto: textoResposta,
      };
      setMensagens((prev) => [...prev, iaMessage]);
    } catch (err) {
      console.error(err);
      setMensagens((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          remetente: "ia",
          texto: "Desculpe, ocorreu um erro ao se comunicar com a IA Gemini no backend.",
        },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  // Leitura de arquivo anexado na barra de input
  const handleSelecionarArquivoChat = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const conteudo = event.target?.result || "";
      setArquivoAnexado({
        nome: file.name,
        tamanho: `${Math.round(file.size / 1024)} KB`,
        conteudo: typeof conteudo === "string" ? conteudo.substring(0, 15000) : "",
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Clique na Sidebar para abrir o Modal correspondente
  const handleAbrirModalRecurso = (item) => {
    setModalRecursoAberto(item);
    setConteudoRecurso("");
    setPromptRecurso(item.promptPadrao);
    setArquivoModal(null);
  };

  // Leitura de arquivo no modal
  const handleSelecionarArquivoModal = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLendoArquivoModal(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const texto = event.target?.result || "";
      const textoLimpo = typeof texto === "string" ? texto.substring(0, 15000) : "";
      setArquivoModal({
        nome: file.name,
        tamanho: `${Math.round(file.size / 1024)} KB`,
      });
      // Injeta o texto lido no textarea do modal
      setConteudoRecurso((prev) => (prev ? `${prev}\n\n--- Conteúdo de ${file.name} ---\n${textoLimpo}` : textoLimpo));
      setLendoArquivoModal(false);
    };
    reader.onerror = () => {
      alert("Não foi possível ler este arquivo como texto.");
      setLendoArquivoModal(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Envio do Modal de Validação para o Chat e Gemini
  const handleEnviarValidacaoModal = async (e) => {
    e.preventDefault();
    if (!conteudoRecurso.trim() && !arquivoModal) {
      alert("Por favor, adicione algum conteúdo ou arquivo para ser analisado.");
      return;
    }

    const recursoAtual = modalRecursoAberto;
    const jaEnviouAntes = mensagens.some((m) => m.remetente === "usuario");
    const primeiraMensagem = !jaEnviouAntes;

    const rotuloRecurso = recursoAtual?.label || "Recurso";
    const nomeDoArquivo = arquivoModal ? arquivoModal.nome : `${rotuloRecurso}.txt`;
    const perguntaFinal = promptRecurso.trim() || recursoAtual.promptPadrao;

    const contextoAdicional = `[Validação de ${rotuloRecurso} - Arquivo/Referência: ${nomeDoArquivo}]\n${conteudoRecurso.trim()}`;

    const userMessage = {
      id: Date.now(),
      remetente: "usuario",
      texto: `📋 [Validação de ${rotuloRecurso}] ${perguntaFinal}\n\n📄 Referência: ${nomeDoArquivo}`,
      recursoTipo: rotuloRecurso,
      anexo: arquivoModal,
    };

    setMensagens((prev) => [...prev, userMessage]);
    setModalRecursoAberto(null);
    setCarregando(true);

    try {
      const res = await chatIA({
        projetoId: selectedProjetoId ? parseInt(selectedProjetoId) : null,
        pergunta: `[Análise de ${rotuloRecurso}] ${perguntaFinal}`,
        contextoAdicional: contextoAdicional,
        primeiraMensagem: primeiraMensagem,
      });

      const textoResposta = res?.resposta || "Não recebi uma resposta válida da IA.";

      const iaMessage = {
        id: Date.now() + 1,
        remetente: "ia",
        texto: textoResposta,
      };
      setMensagens((prev) => [...prev, iaMessage]);
    } catch (err) {
      console.error(err);
      setMensagens((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          remetente: "ia",
          texto: `Ocorreu um erro ao processar a validação de ${rotuloRecurso} com o Gemini.`,
        },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header Responsivo (Desktop + Mobile iPhone) */}
      <header className="bg-white border-b border-gray-200 py-3 px-3 sm:px-6 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            onClick={() => navigate("/projetos")}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Ir para a página inicial (Meus Projetos)"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">ProjectMind</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <select
              value={selectedProjetoId}
              onChange={(e) => setSelectedProjetoId(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 focus:outline-none max-w-[155px] sm:max-w-xs truncate"
            >
              <option value="">Selecione um Projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <button
              onClick={() => navigate("/projetos")}
              className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap"
            >
              Projetos
            </button>
            {selectedProjetoId && (
              <button
                onClick={() => navigate(`/projetos/${selectedProjetoId}/analise`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition shadow-sm whitespace-nowrap"
              >
                Análise IA
              </button>
            )}
            <div
              onClick={() => navigate("/perfil")}
              className="flex items-center gap-2 cursor-pointer pl-1.5 sm:pl-2 border-l border-gray-200 group"
              title="Meu Perfil"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 group-hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition shadow-sm">
                <User className="h-4 w-4" />
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 transition"
              title="Sair"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Barra de categorias horizontal exclusiva para Celular / iPhone */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pt-2.5 mt-2.5 border-t border-gray-100">
          {sidebarButtons.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.label}
                type="button"
                onClick={() => handleAbrirModalRecurso(btn)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium whitespace-nowrap shrink-0 active:scale-95 transition"
              >
                <Icon className="h-3.5 w-3.5 text-blue-600" />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Corpo principal dividido com a Sidebar Lateral Direita do Protótipo */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col bg-gray-50/50">
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {mensagens.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.remetente === "usuario" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[80%] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 shadow-sm text-sm leading-relaxed break-words ${
                      msg.remetente === "usuario"
                        ? "bg-slate-900 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    {msg.remetente === "ia" && (
                      <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1.5">
                        <Brain className="h-4 w-4" /> ProjectMind IA
                      </div>
                    )}

                    {msg.recursoTipo && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2">
                        <FileCheck className="h-3.5 w-3.5" />
                        {msg.recursoTipo}
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.texto}</p>
                  </div>
                </div>
              ))}
              {carregando && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-5 py-3 text-sm text-gray-500 flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-1 text-xs font-medium">IA Gemini analisando o contexto e validando...</span>
                  </div>
                </div>
              )}
              <div ref={endOfChatRef} />
            </div>
          </div>

          {/* Barra de Envio de Mensagem com Botão de Anexo */}
          <div className="border-t border-gray-200 bg-white px-3 sm:px-6 py-3 sm:py-4">
            <div className="max-w-4xl mx-auto">
              {/* Pílula de Arquivo Anexado */}
              {arquivoAnexado && (
                <div className="mb-2 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-xl shadow-2xs">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span>{arquivoAnexado.nome} ({arquivoAnexado.tamanho})</span>
                  <button
                    type="button"
                    onClick={() => setArquivoAnexado(null)}
                    className="p-0.5 hover:bg-blue-100 rounded text-blue-600 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <form onSubmit={handleEnviar} className="flex items-center gap-2">
                {/* Input de Arquivo oculto */}
                <input
                  type="file"
                  ref={fileInputChatRef}
                  onChange={handleSelecionarArquivoChat}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputChatRef.current?.click()}
                  className="p-3 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition border border-gray-200"
                  title="Anexar arquivo do computador para a IA validar"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  placeholder={
                    selectedProjetoId
                      ? "Digite uma pergunta ou anexe um arquivo para a IA validar..."
                      : "Selecione um projeto acima e digite sua dúvida..."
                  }
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  disabled={carregando}
                />
                <button
                  type="submit"
                  disabled={carregando || (!pergunta.trim() && !arquivoAnexado)}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-xl px-4 sm:px-6 py-3 text-sm transition flex items-center justify-center shadow-sm shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </main>

        {/* Sidebar Lateral Direita "Adicionar ao Projeto" conforme Imagem do Protótipo */}
        <aside className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto hidden lg:block flex-shrink-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Adicionar ao Projeto
            </h2>
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          </div>

          <p className="text-[11px] text-gray-500 mb-4 px-1 leading-relaxed">
            Selecione uma categoria para anexar arquivos, especificações ou diagramas e submeter para <strong>validação da IA</strong>:
          </p>

          <div className="space-y-2">
            {sidebarButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.label}
                  onClick={() => handleAbrirModalRecurso(btn)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-gray-700 hover:text-blue-900 text-sm font-medium transition text-left shadow-2xs group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 truncate">
                    <span className="block truncate font-medium">{btn.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Modal de Adição e Validação de Arquivo / Recurso pela IA */}
      {modalRecursoAberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabeçalho do Modal */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <modalRecursoAberto.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{modalRecursoAberto.titulo}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{modalRecursoAberto.descricao}</p>
                </div>
              </div>
              <button
                onClick={() => setModalRecursoAberto(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleEnviarValidacaoModal} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Zona de Upload de Arquivo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Anexar Arquivo do Computador (Texto, Código, PDF, CSV, Diagrama)
                </label>
                <input
                  type="file"
                  ref={fileInputModalRef}
                  onChange={handleSelecionarArquivoModal}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputModalRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50/60 hover:bg-blue-50/30 rounded-xl p-4 text-center cursor-pointer transition"
                >
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1.5" />
                  <span className="text-xs font-semibold text-blue-600 block">
                    Clique para escolher um arquivo ou arraste até aqui
                  </span>
                  <span className="text-[11px] text-gray-400">
                    O texto extraído será enviado automaticamente para a IA validar
                  </span>
                </div>

                {arquivoModal && (
                  <div className="mt-2 flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <span className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {arquivoModal.nome} ({arquivoModal.tamanho})
                    </span>
                    <button
                      type="button"
                      onClick={() => setArquivoModal(null)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold"
                    >
                      Remover
                    </button>
                  </div>
                )}
                {lendoArquivoModal && (
                  <p className="text-xs text-blue-600 mt-1 animate-pulse">Lendo arquivo...</p>
                )}
              </div>

              {/* Área de Texto / Especificação */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Conteúdo / Especificação para Validação
                </label>
                <textarea
                  rows={4}
                  value={conteudoRecurso}
                  onChange={(e) => setConteudoRecurso(e.target.value)}
                  placeholder={modalRecursoAberto.placeholderTexto}
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Sugestões Rápidas de Objetivo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Sugestões Rápidas de Foco de Análise:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {modalRecursoAberto.sugestoes.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptRecurso(sug)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition text-left ${
                        promptRecurso === sug
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pergunta ou Instrução para a IA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Instrução ou Pergunta para a IA
                </label>
                <input
                  type="text"
                  value={promptRecurso}
                  onChange={(e) => setPromptRecurso(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalRecursoAberto(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Validar com IA Gemini
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
