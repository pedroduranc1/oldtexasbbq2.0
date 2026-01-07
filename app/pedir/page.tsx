import { FormularioPedidoPublico } from '@/components/publico/FormularioPedidoPublico';
import { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme-toggle';
import { Phone, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hacer Pedido - Old Texas BBQ',
  description:
    'Ordena tu BBQ favorito en línea. Deliciosas costillas, brisket y más al estilo Texas.',
};

export default function PedirPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                🍖 Old Texas BBQ
              </h1>
              <p className="mt-1 opacity-90">
                Auténtico sabor del sur de Texas
              </p>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm opacity-80 flex items-center justify-end gap-1">
                <MapPin className="h-4 w-4" />
                Monterrey, Nuevo León
              </p>
              <p className="text-lg font-semibold flex items-center justify-end gap-1 mt-1">
                <Phone className="h-4 w-4" />
                878-XXX-XXXX
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <FormularioPedidoPublico />
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-foreground">
            © {new Date().getFullYear()} Old Texas BBQ. Todos los derechos
            reservados.
          </p>
          <p className="text-xs mt-2 text-muted-foreground">
            El mejor BBQ estilo Texas en Monterrey, Nuevo León
          </p>
        </div>
      </footer>

      {/* Theme Toggle */}
      <ThemeToggle />
    </div>
  );
}
