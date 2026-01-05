'use client';
import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!auth) {
      setError('Firebase no está configurado');
      setLoading(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      let errorMessage = 'Error al enviar el correo';
      switch (err?.code) {
        case 'auth/user-not-found':
          errorMessage = 'No existe una cuenta con este correo';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Correo electrónico inválido';
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
        {' '}
        <div className="w-full max-w-md">
          {' '}
          {/* Success message */}{' '}
          <div className="bg-card border border-border rounded-2xl shadow-texas p-8 text-center">
            {' '}
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              {' '}
              <CheckCircle2 className="h-8 w-8 text-green-600" />{' '}
            </div>{' '}
            <h2 className="text-2xl font-bold mb-2">Correo Enviado</h2>{' '}
            <p className="text-muted-foreground mb-6">
              {' '}
              Hemos enviado un enlace de recuperación a <strong>{email}</strong>
              . Revisa tu bandeja de entrada y sigue las instrucciones.{' '}
            </p>{' '}
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 text-sm text-left">
              {' '}
              <p className="font-medium mb-2">Pasos a seguir:</p>{' '}
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                {' '}
                <li>Revisa tu correo electrónico</li>{' '}
                <li>Haz clic en el enlace de recuperación</li>{' '}
                <li>Crea una nueva contraseña</li>{' '}
                <li>Inicia sesión con tu nueva contraseña</li>{' '}
              </ol>{' '}
            </div>{' '}
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition"
            >
              {' '}
              <ArrowLeft className="h-5 w-5" /> Volver al login{' '}
            </Link>{' '}
          </div>{' '}
        </div>{' '}
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      {' '}
      <div className="w-full max-w-md">
        {' '}
        {/* Logo y título */}{' '}
        <div className="text-center mb-8">
          {' '}
          <div className="bg-texas-gradient text-white inline-block p-4 rounded-2xl mb-4">
            {' '}
            <h1 className="text-4xl font-bold">🍖</h1>{' '}
          </div>{' '}
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {' '}
            Recuperar Contraseña{' '}
          </h2>{' '}
          <p className="text-muted-foreground">
            {' '}
            Ingresa tu correo para recibir instrucciones{' '}
          </p>{' '}
        </div>{' '}
        {/* Formulario de recuperación */}{' '}
        <div className="bg-card border border-border rounded-2xl shadow-texas p-8">
          {' '}
          <form onSubmit={handleSubmit} className="space-y-4">
            {' '}
            {/* Email */}{' '}
            <div>
              {' '}
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                {' '}
                Correo Electrónico{' '}
              </label>{' '}
              <div className="relative">
                {' '}
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />{' '}
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  placeholder="tu@email.com"
                  disabled={loading}
                />{' '}
              </div>{' '}
            </div>{' '}
            {/* Error message */}{' '}
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                {' '}
                {error}{' '}
              </div>
            )}{' '}
            {/* Info message */}{' '}
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
              {' '}
              Te enviaremos un correo con un enlace para restablecer tu
              contraseña.{' '}
            </div>{' '}
            {/* Submit button */}{' '}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {' '}
              {loading ? (
                <>
                  {' '}
                  <Loader2 className="h-5 w-5 animate-spin" /> Enviando...{' '}
                </>
              ) : (
                <>
                  {' '}
                  <Mail className="h-5 w-5" /> Enviar enlace de
                  recuperación{' '}
                </>
              )}{' '}
            </button>{' '}
          </form>{' '}
          {/* Link a login */}{' '}
          <div className="mt-6 text-center">
            {' '}
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary transition inline-flex items-center gap-2"
            >
              {' '}
              <ArrowLeft className="h-4 w-4" /> Volver al login{' '}
            </Link>{' '}
          </div>{' '}
        </div>{' '}
      </div>{' '}
    </div>
  );
}
