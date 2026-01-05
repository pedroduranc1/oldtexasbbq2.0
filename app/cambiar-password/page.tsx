'use client';
import { useState } from 'react';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth';

function CambiarPasswordContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if (formData.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      setLoading(false);
      return;
    }

    if (!user?.email) {
      setError('No se pudo obtener el usuario actual');
      setLoading(false);
      return;
    }

    try {
      // Reautenticar al usuario antes de cambiar la contraseña
      const credential = EmailAuthProvider.credential(
        user.email,
        formData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Cambiar la contraseña
      await updatePassword(user, formData.newPassword);

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      let errorMessage = 'Error al cambiar la contraseña';

      switch (err?.code) {
        case 'auth/wrong-password':
          errorMessage = 'La contraseña actual es incorrecta';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Por seguridad, necesitas volver a iniciar sesión';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Intenta más tarde';
          break;
        default:
          errorMessage = err?.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-texas p-8 text-center">
            <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Contraseña Actualizada</h2>
            <p className="text-muted-foreground mb-6">
              Tu contraseña ha sido cambiada exitosamente. Serás redirigido al
              dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirigiendo...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="bg-texas-gradient text-white inline-block p-4 rounded-2xl mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Cambiar Contraseña
          </h2>
          <p className="text-muted-foreground">
            Actualiza tu contraseña de forma segura
          </p>
        </div>

        {/* Formulario de cambio de contraseña */}
        <div className="bg-card border border-border rounded-2xl shadow-texas p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contraseña actual */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium mb-2"
              >
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition pr-12"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      current: !prev.current,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  disabled={loading}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium mb-2"
              >
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition pr-12"
                  placeholder="••••••••"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      new: !prev.new,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  disabled={loading}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo 6 caracteres
              </p>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2"
              >
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition pr-12"
                  placeholder="••••••••"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      confirm: !prev.confirm,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  disabled={loading}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Info message */}
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
              Por seguridad, necesitas ingresar tu contraseña actual para
              confirmar el cambio.
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Cambiando contraseña...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Cambiar contraseña
                </>
              )}
            </button>
          </form>

          {/* Link a perfil */}
          <div className="mt-6 text-center">
            <Link
              href="/perfil"
              className="text-sm text-muted-foreground hover:text-primary transition"
            >
              ← Volver al perfil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CambiarPasswordPage() {
  return (
    <ProtectedRoute>
      <CambiarPasswordContent />
    </ProtectedRoute>
  );
}
