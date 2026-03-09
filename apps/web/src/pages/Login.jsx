import { LogIn, Sun, Moon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useThemeStore } from '../stores/theme';
import { useT } from '../lib/i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Login() {
  const { theme, toggle } = useThemeStore();
  const t = useT();

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] p-3 relative">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm hover:bg-[var(--bg-secondary)] cursor-pointer"
        title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
      >
        {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-[var(--text-secondary)]" />}
      </button>

      <div className="w-full max-w-sm">
        <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] shadow-[var(--shadow)] p-10 text-center space-y-8">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-5">
              <LogIn size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t('web.login.title')}</h1>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">{t('web.login.subtitle')}</p>
          </div>
          <Button size="lg" className="w-full" onClick={() => window.location.href = `${API_URL}/auth/login`}>
            {t('web.login.button')}
          </Button>
        </div>
      </div>
    </main>
  );
}
