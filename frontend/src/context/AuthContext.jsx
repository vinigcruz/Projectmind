import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

function checkIsAdmin(userData) {
  if (!userData || typeof userData !== "object") return false;
  if (userData.isAdmin === true) return true;
  if (typeof userData.role === "string" && userData.role.toUpperCase() === "ADMIN") return true;
  if (typeof userData.email === "string" && userData.email.trim().toLowerCase() === "admin@projectmind.com") {
    return true;
  }
  return false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      // Restaura sessão tanto do sessionStorage quanto do localStorage (permitindo abrir o app já logado mesmo sem dados móveis)
      const savedUser = sessionStorage.getItem("pm_user") || localStorage.getItem("pm_user");
      const savedToken = sessionStorage.getItem("pm_token") || localStorage.getItem("pm_token");
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      if (!parsed || typeof parsed !== "object" || (!parsed.id && !parsed.userId && !parsed.email)) {
        sessionStorage.removeItem("pm_user");
        sessionStorage.removeItem("pm_token");
        localStorage.removeItem("pm_user");
        localStorage.removeItem("pm_token");
        return null;
      }
      sessionStorage.setItem("pm_user", JSON.stringify(parsed));
      if (savedToken) {
        sessionStorage.setItem("pm_token", savedToken);
        localStorage.setItem("pm_token", savedToken);
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    if (!userData || typeof userData !== "object" || (!userData.id && !userData.userId && !userData.email)) {
      return;
    }
    setUser(userData);
    try {
      const serialized = JSON.stringify(userData);
      sessionStorage.setItem("pm_user", serialized);
      localStorage.setItem("pm_user", serialized);
      localStorage.setItem("pm_last_known_user", serialized);
      if (userData?.token) {
        sessionStorage.setItem("pm_token", userData.token);
        localStorage.setItem("pm_token", userData.token);
      }
    } catch (e) {
      console.error("Erro ao salvar sessão:", e);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem("pm_user");
      sessionStorage.removeItem("pm_token");
      localStorage.removeItem("pm_user");
      localStorage.removeItem("pm_token");
    } catch (e) {
      console.error("Erro ao limpar sessão:", e);
    }
  };

  const atualizarUsuarioContext = (dadosAtualizados) => {
    setUser((prev) => {
      const updated = { ...prev, ...dadosAtualizados };
      try {
        const serialized = JSON.stringify(updated);
        sessionStorage.setItem("pm_user", serialized);
        localStorage.setItem("pm_user", serialized);
        localStorage.setItem("pm_last_known_user", serialized);
      } catch (e) {
        console.error("Erro ao salvar dados atualizados do usuário:", e);
      }
      return updated;
    });
  };

  const isAdmin = checkIsAdmin(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        atualizarUsuarioContext,
        isAdmin,
        isAuthenticated: !!(user && typeof user === "object" && (user.id || user.userId || user.email)),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
