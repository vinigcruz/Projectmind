import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { login as loginService } from "../services/authService.js";
import { Brain, AlertCircle, Loader2 } from "lucide-react";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setErro("");

    if (!email.trim() || !senha.trim()) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }

    setCarregando(true);

    try {
      // Comunicação com o backend: POST /api/usuarios/login
      const dadosUsuario = await loginService({
        email: email.trim(),
        senha: senha,
      });

      if (!dadosUsuario || typeof dadosUsuario !== "object" || (!dadosUsuario.id && !dadosUsuario.userId && !dadosUsuario.email)) {
        setErro("O servidor está reiniciando na nuvem. Aguarde 5 segundos e clique em Entrar novamente.");
        return;
      }
      login(dadosUsuario);
      navigate("/projetos");
    } catch (err) {
      const mensagemErro =
        err.response?.data?.erro ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        "E-mail ou senha inválidos!";
      setErro(mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ProjectMind</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Login</h2>
            <p className="text-sm text-gray-500 mt-1">Acesse sua conta para gerenciar projetos com IA</p>
          </div>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
                disabled={carregando}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha:</label>
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
                disabled={carregando}
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-xl p-3 bg-slate-900 hover:bg-slate-800 text-white font-medium transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {carregando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="text-center pt-6 border-t border-gray-100 mt-6">
            <button
              onClick={() => navigate("/cadastro")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Não tem conta? Cadastre-se
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;