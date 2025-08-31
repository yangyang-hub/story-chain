"use client";

import { useLanguage } from "~~/contexts/LanguageContext";
import { LanguageIcon, GlobeAltIcon } from "@heroicons/react/24/outline";

export const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "zh" ? "en" : "zh");
  };

  return (
    <div className={`flex space-x-2 h-8 items-center justify-center text-sm ${className}`}>
      <button
        onClick={toggleLanguage}
        className="btn btn-ghost btn-sm gap-2 hover:bg-secondary transition-all"
        title={t("language.toggle")}
      >
        <GlobeAltIcon className="h-4 w-4" />
        <span className="text-xs font-medium">
          {language === "zh" ? t("language.zh") : t("language.en")}
        </span>
      </button>
    </div>
  );
};