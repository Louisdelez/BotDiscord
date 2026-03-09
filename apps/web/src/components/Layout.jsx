import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Shield, Trophy, Bot, Settings, LogOut, ChevronDown, Sun, Moon, Gamepad2, Library, Users, Music, MonitorPlay, LayoutTemplate, Menu, X } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useGuildStore } from '../stores/guild';
import { useThemeStore } from '../stores/theme';
import { useT } from '../lib/i18n';
import { Avatar } from './ui/Avatar';
import { discordAvatar, guildIcon, cn } from '../lib/utils';
import { useState, useEffect } from 'react';

const navKeys = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'web.nav.dashboard', minRole: 'USER' },
  { to: '/moderation', icon: Shield, key: 'web.nav.moderation', minRole: 'MOD' },
  { to: '/xp', icon: Trophy, key: 'web.nav.xp', minRole: 'USER' },
  { to: '/ai', icon: Bot, key: 'web.nav.ai', minRole: 'ADMIN' },
  { to: '/games', icon: Gamepad2, key: 'web.nav.games', minRole: 'USER' },
  { to: '/game-library', icon: Library, key: 'web.nav.gameLibrary', minRole: 'USER' },
  { to: '/community', icon: Users, key: 'web.nav.community', minRole: 'USER' },
  { to: '/music', icon: Music, key: 'web.nav.music', minRole: 'ADMIN' },
  { to: '/watchtogether', icon: MonitorPlay, key: 'web.nav.watchTogether', minRole: 'ADMIN' },
  { to: '/server-setup', icon: LayoutTemplate, key: 'web.nav.serverSetup', minRole: 'ADMIN' },
  { to: '/settings', icon: Settings, key: 'web.nav.settings', minRole: 'ADMIN' },
];

function GuildSelector() {
  const { guilds, currentGuild, selectGuild } = useGuildStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const t = useT();

  const botGuilds = guilds.filter(g => g.botPresent);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-tertiary)] cursor-pointer"
      >
        {currentGuild ? (
          <>
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] shrink-0 flex items-center justify-center">
              {guildIcon(currentGuild.id, currentGuild.icon) ? (
                <img src={guildIcon(currentGuild.id, currentGuild.icon)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold">{currentGuild.name[0]}</span>
              )}
            </div>
            <span className="text-sm font-medium truncate flex-1 text-left">{currentGuild.name}</span>
          </>
        ) : (
          <span className="text-sm text-[var(--text-secondary)]">{t('common.selectServerSidebar')}</span>
        )}
        <ChevronDown size={16} className="text-[var(--text-secondary)]" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
          {botGuilds.map(guild => (
            <button
              key={guild.id}
              onClick={() => { selectGuild(guild.id); setOpen(false); navigate('/dashboard'); }}
              className={cn(
                'w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-secondary)] cursor-pointer text-left',
                currentGuild?.id === guild.id && 'bg-[var(--bg-secondary)]'
              )}
            >
              <div className="w-7 h-7 rounded-md overflow-hidden bg-[var(--bg-tertiary)] shrink-0 flex items-center justify-center">
                {guildIcon(guild.id, guild.icon) ? (
                  <img src={guildIcon(guild.id, guild.icon)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold">{guild.name[0]}</span>
                )}
              </div>
              <span className="text-sm truncate">{guild.name}</span>
            </button>
          ))}
          {botGuilds.length === 0 && (
            <p className="p-3 text-sm text-[var(--text-secondary)]">{t('common.noServerWithBot')}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  const t = useT();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      className={cn(
        'relative w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300',
        isDark ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
      )}
      title={isDark ? t('common.switchToLight') : t('common.switchToDark')}
    >
      <div className={cn(
        'w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform duration-300',
        isDark ? 'translate-x-6' : 'translate-x-0'
      )}>
        {isDark
          ? <Moon size={13} className="text-[var(--accent)]" />
          : <Sun size={13} className="text-amber-500" />
        }
      </div>
    </button>
  );
}

export function Layout() {
  const { user, logout } = useAuthStore();
  const { fetchGuilds, hasRole } = useGuildStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    fetchGuilds().then(() => {
      useGuildStore.getState().restoreGuild();
    });
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="h-screen p-1.5 sm:p-2 md:p-3 flex">
      <div className="flex flex-1 rounded-2xl overflow-hidden shadow-[var(--shadow)] border border-[var(--border)]">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          'bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col shrink-0 z-50',
          // Mobile: slide-in from left, fixed position
          'fixed inset-y-0 left-0 w-64 transition-transform duration-300 md:transition-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static position
          'md:static md:translate-x-0 md:w-64'
        )}>
          <div className="p-5 pb-3 flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight">Discord Bot</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-3 pb-1">
            <GuildSelector />
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navKeys.filter(n => hasRole(n.minRole)).map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                )}
              >
                <Icon size={18} />
                {t(key)}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-[var(--border)] space-y-3">
            {/* Theme toggle */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">{t('common.theme')}</span>
              <ThemeToggle />
            </div>

            {/* User */}
            <div className="flex items-center gap-3 p-2">
              <Avatar
                src={user ? discordAvatar(user.discordId, user.avatar) : null}
                alt={user?.username}
                size="sm"
              />
              <span className="text-sm font-medium truncate flex-1">{user?.username}</span>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer"
              >
                <LogOut size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-30 bg-[var(--bg-primary)] border-b border-[var(--border)] p-3 flex items-center gap-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] cursor-pointer"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-sm font-semibold truncate flex-1">Discord Bot</h1>
            <ThemeToggle />
          </div>

          <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
