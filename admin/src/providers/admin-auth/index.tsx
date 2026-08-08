"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { extractAdminToken, hydrateAdmin, loginAdmin, logoutAdmin } from "@/api/admin-auth";
import type { AdminLoginInput } from "@/api/types";
import {
  clearAdminSession,
  getAdminToken,
  type StoredAdmin,
  sanitizeAdmin,
  storeAdminSession,
} from "@/lib/storage";

const AdminAuthContext = createContext<{
  admin: StoredAdmin | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (payload: AdminLoginInput) => Promise<StoredAdmin>;
  logout: () => Promise<void>;
} | null>(null);

export const AdminAuthProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const [admin, setAdmin] = useState<StoredAdmin | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  const applyAdminSession = useCallback((adminData: Awaited<ReturnType<typeof hydrateAdmin>>) => {
    const token = extractAdminToken(adminData);

    const safeAdmin = sanitizeAdmin(adminData);
    storeAdminSession(token);
    setAdmin(safeAdmin);
    return safeAdmin;
  }, []);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      getAdminToken();

      try {
        const adminData = await hydrateAdmin();
        if (active) applyAdminSession(adminData);
      } catch {
        clearAdminSession();
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

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      clearAdminSession();
      setAdmin(null);
      router.replace("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      isHydrating,
      login,
      logout,
    }),
    [admin, isHydrating, login, logout],
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
