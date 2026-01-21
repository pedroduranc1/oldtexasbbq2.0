import { create } from 'zustand';
import { onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { usuariosService } from '@/lib/services';
import type { Usuario } from '@/lib/types/firestore';

/**
 * Crea sesión JWT en el servidor después de login exitoso
 */
async function createServerSession(userData: Usuario): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        rol: userData.rol,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[AuthStore] Error creating server session:', error);
    return false;
  }
}

/**
 * Destruye sesión JWT en el servidor
 */
async function destroyServerSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', { method: 'DELETE' });
    return response.ok;
  } catch (error) {
    console.error('[AuthStore] Error destroying server session:', error);
    return false;
  }
}

interface AuthStoreState {
  user: User | null;
  userData: Usuario | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuthListener: () => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  userData: null,
  loading: true,
  error: null,
  initialized: false,

  initializeAuthListener: () => {
    if (get().initialized) return;

    console.log('[AuthStore] Initializing auth listener...');

    if (!auth) {
      console.warn('[AuthStore] Firebase auth not configured');
      set({ loading: false, initialized: true });
      return;
    }

    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('[AuthStore] Error setting persistence:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthStore] Auth state changed:', firebaseUser ? 'User logged in' : 'No user');

      if (firebaseUser) {
        try {
          console.log('[AuthStore] Loading user data for UID:', firebaseUser.uid);

          // Timeout para evitar loading infinito
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout loading user data')), 10000)
          );

          const userData = await Promise.race([
            usuariosService.getById(firebaseUser.uid),
            timeoutPromise
          ]) as Usuario | null;

          console.log('[AuthStore] User data loaded:', userData ? 'Success' : 'No data');

          set({
            user: firebaseUser,
            userData,
            loading: false,
            error: null,
            initialized: true
          });

          // Crear sesión JWT en el servidor (para protección de API routes)
          if (userData) {
            createServerSession(userData).then((success) => {
              if (success) {
                console.log('[AuthStore] Server session created');
              } else {
                console.warn('[AuthStore] Failed to create server session');
              }
            });

            // Actualizar última conexión en background (no bloquear)
            usuariosService.updateUltimaConexion(firebaseUser.uid).catch((err) => {
              console.error('[AuthStore] Error updating last connection:', err);
            });
          }
        } catch (e: any) {
          console.error('[AuthStore] Error loading user data:', e);
          set({
            user: firebaseUser,
            userData: null,
            loading: false,
            error: 'Error al cargar datos del usuario',
            initialized: true
          });
        }
      } else {
        console.log('[AuthStore] No user, setting state to logged out');
        // Destruir sesión JWT si existía
        destroyServerSession().catch(() => {});
        set({ user: null, userData: null, loading: false, error: null, initialized: true });
      }
    });

    // Guardar unsubscribe para cleanup
    set({ initialized: true });
  },

  signIn: async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase no está configurado');
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El listener actualizará el estado
    } catch (error: any) {
      let errorMessage = 'Error al iniciar sesión';
      switch (error?.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Usuario deshabilitado';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Intenta más tarde';
          break;
        default:
          errorMessage = error?.message || errorMessage;
      }
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  signOut: async () => {
    // Destruir sesión JWT del servidor
    await destroyServerSession();

    if (!auth) {
      set({ user: null, userData: null, loading: false, error: null });
      return;
    }
    await firebaseSignOut(auth);
    set({ user: null, userData: null, loading: false, error: null });
  },
}));


