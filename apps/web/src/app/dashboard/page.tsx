"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw } from "lucide-react";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "company") {
        router.push("/company");
      } else if (user.role === "employee") {
        router.push("/employee");
      } else if (user.role === "customer") {
        router.push("/customer");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-slate-600 font-medium text-sm">Redirecting to your dashboard workspace...</p>
      </div>
    </div>
  );
}
