"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "admin" | "customer" | "company" | "employee";
  pincode?: string | null;
  district?: string | null;
  state?: string | null;
  budgetRange?: string | null;
  purpose?: string | null;
  gstNumber?: string | null;
  businessMail?: string | null;
  keyId?: string | null;
  position?: string | null;
  companyCode?: string | null;
  companyId?: string | null;
  permissions?: Record<string, boolean>;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (body: any) => Promise<any>;
  firebaseSync: (idToken: string, role?: string, customFields?: any) => Promise<any>;
  logout: () => void;
  updateProfile: (body: any) => Promise<any>;
  recoverPassword: (body: any) => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const profile = await api.auth.getProfile();
          setUser(profile);
        } catch {
          // Token expired or invalid
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    void initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem("token", res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (body: any) => {
    const res = await api.auth.register(body);
    if (res.success && res.token) {
      localStorage.setItem("token", res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const firebaseSync = async (idToken: string, role?: string, customFields?: any) => {
    const res = await api.auth.firebaseSync({ idToken, role, customFields });
    if (res.success && res.registered && res.token) {
      localStorage.setItem("token", res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (body: any) => {
    const res = await api.auth.updateProfile(body);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const recoverPassword = async (body: any) => {
    return api.auth.recoverPassword(body);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        firebaseSync,
        logout,
        updateProfile,
        recoverPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
