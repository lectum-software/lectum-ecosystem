"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { hydrateAdmin, loginAdmin, logoutAdmin } from "@/api/admin-auth";
import type { AdminLoginInput } from "@/api/types";
import { isConfirmedAdminSessionRejection } from "@/lib/session-rejection";
import {
  clearAdminSession,
  type StoredAdmin,
  sanitizeAdmin,
  storeAdminSession,
} from "@/lib/storage";

const AdminAuthContext = createContext<{
  admin: StoredAdmin | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isLoggingOut: boolean;
  login: (payload: AdminLoginInput) => Promise<StoredAdmin>;
  logout: () => Promise<void>;
} | null>(null);

export const AdminAuthProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const [admin, setAdmin] = useState<StoredAdmin | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  const applyAdminSession = useCallback((adminData: Awaited<ReturnType<typeof hydrateAdmin>>) => {
    const safeAdmin = sanitizeAdmin(adminData);
    storeAdminSession();
    setAdmin(safeAdmin);
    return safeAdmin;
  }, []);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const adminData = await hydrateAdmin();
        if (active) applyAdminSession(adminData);
      } catch (error) {
        if (isConfirmedAdminSessionRejection(error)) clearAdminSession();
        if (active) setAdmin(null);
      } finally {
        if (active) setIsHydrating(false);
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [applyAdminSession]);

  const login = useCallback(
    async (payload: AdminLoginInput) => {
      const adminData = await loginAdmin(payload);
      return applyAdminSession(adminData);
    },
    [applyAdminSession],
  );

  const logout = useCallback(() => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;

    const request = (async () => {
      setIsLoggingOut(true);

      try {
        try {
          await logoutAdmin();
        } catch (error) {
          // Apenas uma rejeição controlada da própria API confirma que a
          // credencial atual já não autentica. Falha de rede/proxy preserva a
          // sessão visível para que o usuário possa tentar novamente.
          if (!isConfirmedAdminSessionRejection(error)) throw error;
        }

        clearAdminSession();
        setAdmin(null);
        router.replace("/login");
      } finally {
        setIsLoggingOut(false);
        logoutPromiseRef.current = null;
      }
    })();

    logoutPromiseRef.current = request;
    return request;
  }, [router]);

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      isHydrating,
      isLoggingOut,
      login,
      logout,
    }),
    [admin, isHydrating, isLoggingOut, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth deve ser usado dentro de AdminAuthProvider");
  }

  return context;
};
