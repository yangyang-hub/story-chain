"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "~~/contexts/LanguageContext";

export const SwitchTheme = ({ className }: { className?: string }) => {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const isDarkMode = resolvedTheme === "dark";

  const handleToggle = () => {
    if (isDarkMode) {
      setTheme("light");
      return;
    }
    setTheme("dark");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`flex space-x-2 h-8 items-center justify-center text-sm ${className}`}>
      <div className="flex items-center gap-2">
        <input
          id="theme-toggle"
          type="checkbox"
          className="toggle toggle-primary bg-base-300 hover:bg-base-200 transition-all border-2"
          onChange={handleToggle}
          checked={isDarkMode}
        />
        <label 
          htmlFor="theme-toggle" 
          className={`swap swap-rotate cursor-pointer ${!isDarkMode ? "swap-active" : ""}`}
          title={t("theme.toggle")}
        >
          <SunIcon className="swap-on h-5 w-5 text-warning" />
          <MoonIcon className="swap-off h-5 w-5 text-info" />
        </label>
      </div>
    </div>
  );
};
