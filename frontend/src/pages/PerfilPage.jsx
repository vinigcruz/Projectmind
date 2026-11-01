import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { atualizarUsuario, excluirUsuario } from "../services/authService.js";
import { Brain, User, LogOut, ArrowLeft, Save, Trash2, AlertTriangle, ShieldCheck, Mail, Lock } from "lucide-react";

function PerfilPage() {
  const navigate = useNavigate();
  const { user, logout, atualizarUsuarioContext } = useAuth();

  const [nome, setNome] = useState(user?.nome || "");
  const [email, setEmail] = useState(user?.email || "");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setMensagemSucesso("");
    setMensagemErro("");

    if (!nome.trim()) {
      setMensagemErro("O nome não pode ficar vazio.");
      return;
    }

    if (!email.trim()) {
      setMensagemErro("O e-mail não pode ficar vazio.");
      return;
    }

    if (novaSenha && novaSenha.length < 6) {
      setMensagemErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
      setMensagemErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      const payload = {
        nome: nome.trim(),
        email: email.trim(),
      };
      if (novaSenha) {
        payload.senha = novaSenha.trim();
      }

      const res = await atualizarUsuario(user?.id || user?.userId, payload);

      // Atualiza o contexto global e storage
      atualizarUsuarioContext({
        nome: res.nome || nome.trim(),
        email: res.email || email.trim(),
      });

      setMensagemSucesso("Informações atualizadas com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err) {
      console.error(err);
      const erroMsg =
        err.response?.data?.erro ||
        err.response?.data?.error ||
        "Erro ao atualizar as informações do perfil.";
      setMensagemErro(erroMsg);
    } finally {
      setCarregando(false);
    }
  };

  const handleExcluirConta = async () => {
    const confirmou = window.confirm(
      "ATENÇÃO: Deseja realmente excluir permanentemente sua conta?\n\nTodos os seus projetos, tarefas, riscos e análises serão apagados do banco de dados de forma definitiva. Esta ação NÃO pode ser desfeita!"
    );

    if (!confirmou) return;

    try {
      await excluirUsuario(user?.id || user?.userId);
      alert("Sua conta foi excluída com sucesso.");
      logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
      const erroMsg =
        err.response?.data?.erro ||
        err.response?.data?.error ||
        "Erro ao excluir a conta.";
      alert(erroMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Padronizado com Logo clicável */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div
              onClick={() => navigate("/projetos")}
              className="flex items-center gap-3 cursor-pointer group"
              title="Ir para a página inicial (Meus Projetos)"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition">
                  ProjectMind
                </h1>
                <p className="text-xs text-gray-500">Gestão Inteligente de Projetos</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={() => navigate("/projetos")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Meus Projetos
              </button>
              <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                  <User className="h-5 w-5" />
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        <div>
          <button
            onClick={() => navigate("/projetos")}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para Meus Projetos
          </button>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meu Perfil</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie seus dados de acesso e preferências da conta.</p>
        </div>

        {/* Card de Identificação */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-md">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{user?.nome || "Usuário"}</h3>
              <p className="text-sm text-gray-500">{user?.email || "usuario@projectmind.com"}</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <ShieldCheck className="h-4 w-4" /> Conta Ativa
              </div>
            </div>
          </div>
          <div className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-mono">
            ID: {user?.id || user?.userId || "N/A"}
          </div>
        </div>

        {/* Card Formulário de Edição */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Informações Pessoais</h3>
          <p className="text-xs text-gray-500 mb-6">Atualize seu nome, e-mail ou redefina sua senha de acesso.</p>

          {mensagemSucesso && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {mensagemErro && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{mensagemErro}</span>
            </div>
          )}

          <form onSubmit={handleSalvarPerfil} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Alteração de Senha (opcional)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nova Senha</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Deixe em branco para manter a atual"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={carregando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {carregando ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>

        {/* Zona de Perigo - Exclusão de Conta */}
        <div className="bg-red-50/60 border border-red-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900">Zona de Perigo: Excluir Conta</h3>
              <p className="text-sm text-red-700 mt-1 leading-relaxed">
                Ao excluir sua conta, todos os seus dados — incluindo projetos, tarefas, riscos identificados e
                análises de IA — serão permanentemente removidos dos nossos servidores. Essa operação é irreversível.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleExcluirConta}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Minha Conta Permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PerfilPage;
