"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  clinicId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  // Don't redirect on public pages
  if (pathname === "/login" || pathname === "/register" || pathname === "/pricing" || pathname?.startsWith("/invite")) {
    return <>{children}</>;
  }

  // Show loading spinner while checking auth
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
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
