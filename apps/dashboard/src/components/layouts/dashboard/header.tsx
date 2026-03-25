import { useAuthStore } from '../../../features/auth/store/auth.store';
import { useThemeStore } from '../../../stores/theme.store';
import { Menu, Moon, Sun } from 'lucide-react';
import * as React from 'react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore();

  const displayName = user?.email?.split('@')[0] ?? 'Admin';
  const displayEmail = user?.email ?? '—';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-400 hover:text-white"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-4 ml-auto">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
        <div className="text-right">
          <p className="text-sm font-medium text-white">{displayName}</p>
          <p className="text-xs text-gray-400">{displayEmail}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold">
          {avatarLetter}
        </div>
      </div>
    </header>
  );
}
