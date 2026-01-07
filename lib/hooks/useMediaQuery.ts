import { useState, useEffect } from 'react';

/**
 * Hook para detectar media queries
 * Útil para responsive design
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Verificar si estamos en el cliente
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);

    // Establecer el valor inicial
    setMatches(media.matches);

    // Crear listener para cambios
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Agregar listener
    media.addEventListener('change', listener);

    // Limpiar listener
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

// Hooks predefinidos para breakpoints comunes
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
