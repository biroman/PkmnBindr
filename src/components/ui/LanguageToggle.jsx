import { useEffect, useState } from "react";
import { getLanguage, setLanguage } from "../../services/pokemonTcgApi";

const LanguageToggle = () => {
  const [lang, setLang] = useState(getLanguage());

  const handleSwitch = (newLang) => {
    if (newLang === lang) return;
    setLanguage(newLang);
    setLang(newLang);
    // For simplicity, reload to ensure all data refreshes under new API
    window.location.reload();
  };

  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={() => handleSwitch("en")}
        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors
          ${
            lang === "en"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
      >
        EN
      </button>
      <button
        onClick={() => handleSwitch("jp")}
        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors
          ${
            lang === "jp"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
      >
        JP
      </button>
    </div>
  );
};

export default LanguageToggle;
