'use client';

import React, { useState } from 'react';
import { Moon, Sun, User, LogOut, LogIn, UserPlus, Menu, Database } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../catalyst/button';
import Link from 'next/link';

interface HeaderProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onMenuClick: () => void;
}

export function Header({ onLoginClick, onRegisterClick, onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isAnonymous, anonymousMessageCount, user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            plain
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" data-slot="icon" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Eloquent AI
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Anonymous user prompt */}
          {isAnonymous && anonymousMessageCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 mr-2 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-md text-xs text-zinc-600 dark:text-zinc-400">
              <span className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold">
                {anonymousMessageCount}
              </span>
              / 3
            </div>
          )}

          {/* Theme toggle */}
          <Button
            outline
            onClick={toggleTheme}
            className="rounded-full"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" data-slot="icon" />
            ) : (
              <Sun className="w-5 h-5" data-slot="icon" />
            )}
          </Button>

          {/* Auth buttons */}
          {isAuthenticated ? (
            <div className="relative">
              <Button
                plain
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="rounded-full"
              >
                <User className="w-5 h-5" data-slot="icon" />
              </Button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-20 animate-in fade-in-0 zoom-in-95">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                      <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{user?.email}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Logged in</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/documents"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <Database className="w-4 h-4" />
                        Knowledge Base
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                plain
                onClick={onLoginClick}
              >
                <LogIn className="w-4 h-4" data-slot="icon" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
              <Button
                color="indigo"
                onClick={onRegisterClick}
              >
                <UserPlus className="w-4 h-4" data-slot="icon" />
                <span className="hidden sm:inline">Sign Up</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
