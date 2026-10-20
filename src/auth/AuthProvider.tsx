import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchMe, registerWithToken, requestToken, revokeToken } from '@/api/auth';
import { setUnauthorizedHandler } from '@/api/client';
import { clearToken, loadToken, saveToken } from '@/api/session';
import type { LoginInput, RegisterInput, User } from '@/api/types';

type AuthState = {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Jeton effacé (401 ou déconnexion) : retour à la connexion, cache vidé
  const forget = useCallback(() => {
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(forget);
    return () => setUnauthorizedHandler(null);
  }, [forget]);

  // Au démarrage : jeton enregistré, puis vérification auprès du serveur (GET /api/auth/me/)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (await loadToken()) {
          const me = await fetchMe();
          if (active) setUser(me);
        }
      } catch {
        // 401 : le client a déjà effacé le jeton. Réseau ou serveur indisponible : le jeton est gardé,
        // l'écran de connexion s'affiche et une nouvelle connexion le remplace.
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    const { token, user: signedIn } = await requestToken(input);
    await saveToken(token);
    setUser(signedIn);
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const { token, user: created } = await registerWithToken(input);
    await saveToken(token);
    setUser(created);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await revokeToken();
    } catch {
      // Réseau coupé ou jeton déjà invalide : on se déconnecte quand même localement
    } finally {
      await clearToken();
      forget();
    }
  }, [forget]);

  const value = useMemo(
    () => ({ user, isSignedIn: user !== null, isLoading, signIn, signUp, signOut }),
    [user, isLoading, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}
