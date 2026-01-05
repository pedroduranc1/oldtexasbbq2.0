'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'fixed' | 'ghost';
}

export function ThemeToggle({ variant = 'fixed' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Limpiar cualquier configuración corrupta al montar
  useEffect(() => {
    if (mounted && theme !== 'light' && theme !== 'dark') {
      // Si el tema no es válido, forzar a light
      setTheme('light');
    }
  }, [mounted, theme, setTheme]);

  // Toggle simple entre light y dark
  const handleThemeChange = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isDark = resolvedTheme === 'dark';

  // Variant: Ghost (para usar en navbar)
  if (variant === 'ghost') {
    if (!mounted) {
      return (
        <Button variant="ghost" size="icon" disabled>
          <Sun className="h-5 w-5" />
        </Button>
      );
    }

    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleThemeChange}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    );
  }

  // Variant: Fixed (botón flotante - default)
  if (!mounted) {
    return (
      <button
        className="fixed bottom-6 left-6 p-3 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 shadow-lg z-50"
        aria-label="Cambiar tema"
        disabled
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleThemeChange}
      className="fixed bottom-6 left-6 p-3 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 shadow-lg hover:scale-110 transition-all duration-200 z-50 hover:shadow-xl"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
