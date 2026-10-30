'use client';

import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import { readLocalScans, saveLocalScan } from './local-scans';
import { authConfigured, getSupabase } from './supabase';

interface AuthState {
  configured: boolean;
  /** True until the stored session has been read. */
  loading: boolean;
  session: Session | null;
  user: User | null;
  /** True while signing out towards a specific page; auth guards must not redirect meanwhile. */
  leaving: boolean;
  /** Signs out, then (optionally) does a full navigation to `redirectTo`. */
  signOut: (redirectTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  configured: false,
  loading: false,
  session: null,
  user: null,
  leaving: false,
  signOut: async () => undefined,
});

/** Moves scans started as a guest on this device into the signed-in account. */
async function claimGuestScans(): Promise<void> {
  for (const scan of readLocalScans().filter((s) => s.scanToken)) {
    try {
      const { response } = await api.POST('/v1/scans/{id}/claim', {
        params: { path: { id: scan.id }, header: { 'x-scan-token': scan.scanToken! } },
      });
      // Claimed (200) or no longer claimable (404: expired / already claimed): drop the token.
      if (response.status === 200 || response.status === 404)
        saveLocalScan({ ...scan, scanToken: undefined });
    } catch {
      /* offline: try again next sign-in */
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authConfigured);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    void sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === 'SIGNED_IN') void claimGuestScans();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: authConfigured,
      loading,
      session,
      user: session?.user ?? null,
      leaving,
      signOut: async (redirectTo?: string) => {
        if (redirectTo) setLeaving(true);
        await getSupabase()?.auth.signOut();
        setSession(null);
        if (redirectTo) window.location.assign(redirectTo);
      },
    }),
    [loading, session, leaving],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
