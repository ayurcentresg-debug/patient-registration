"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { parseOverrides, parseUserOverrides, type RoleOverrides, type UserOverrides } from "@/lib/permissions";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  clinicId: string;
  clinicCountry?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  rolePermissions: RoleOverrides;
  userPermissions: UserOverrides;
  clinicCountry: string | null;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  rolePermissions: {},
  userPermissions: {},
  clinicCountry: null,
  refreshPermissions: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RoleOverrides>({});
  const [userPermissions, setUserPermissions] = useState<UserOverrides>({});
  const [clinicCountry, setClinicCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRolePermissions(parseOverrides(data.rolePermissions));
        setUserPermissions(parseUserOverrides(data.userPermissions));
        setClinicCountry(data.clinicCountry ?? data.user?.clinicCountry ?? null);
      } else {
        setUser(null);
        setRolePermissions({});
        setUserPermissions({});
        setClinicCountry(null);
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
    } catch {
      setUser(null);
      setRolePermissions({});
      setUserPermissions({});
      setClinicCountry(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const refreshPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setRolePermissions(parseOverrides(data.rolePermissions));
        setUserPermissions(parseUserOverrides(data.userPermissions));
        setClinicCountry(data.clinicCountry ?? data.user?.clinicCountry ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setRolePermissions({});
    setUserPermissions({});
    setClinicCountry(null);
    router.push("/login");
  };

  // Don't redirect or show loading on public pages
  const isPublicPath = pathname === "/login" || pathname === "/register" || pathname === "/pricing" || pathname?.startsWith("/invite") || (pathname?.startsWith("/cme") && !pathname?.startsWith("/cme/admin"));
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Show loading spinner while checking auth (only for protected pages)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
          <p className="text-[15px] font-medium" style={{ color: "#6b7280" }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect handled above
  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, rolePermissions, userPermissions, clinicCountry, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}
