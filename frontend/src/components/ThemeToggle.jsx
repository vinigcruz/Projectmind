import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("pm_theme") === "dark";
  });

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

  return (
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
  );
}

