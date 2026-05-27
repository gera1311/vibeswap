import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { Language } from '../i18n/translations';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguageStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-4 py-2 glass rounded-xl hover:bg-surface/80 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Globe className="w-4 h-4 text-textSecondary" />
        <span className="text-sm font-semibold">{currentLang.flag}</span>
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 glass rounded-xl overflow-hidden shadow-xl z-50"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                </div>
                {language === lang.code && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
