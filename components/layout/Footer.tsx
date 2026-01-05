'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Información de la empresa */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Old Texas BBQ - CRM. Todos los derechos reservados.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sistema de gestión de pedidos y reparto
            </p>
          </div>

          {/* Links útiles */}
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/bitacora"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Bitácora
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/perfil"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Perfil
            </Link>
          </div>

          {/* Made with love */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Hecho con</span>
            <Heart className="h-3 w-3 text-red-500 fill-current" />
            <span>en Piedras Negras</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
