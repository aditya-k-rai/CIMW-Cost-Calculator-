"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormMode = "login" | "register" | "recover";

export default function Login() {
  const router = useRouter();
  const { user, login, register, recoverPassword, loading } = useAuth();

  const [mode, setMode] = useState<FormMode>("login");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("customer");
  const [newPassword, setNewPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  // Bind Keyboard Shortcuts (Ctrl+1 and Ctrl+2) from the original app
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "1") {
        e.preventDefault();
        setEmail("customer@demo.com");
        setPassword("customer123");
        setRole("customer");
        setSuccessMsg("Filled demo customer credentials!");
        setErrorMsg("");
      } else if (e.ctrlKey && e.key === "2") {
        e.preventDefault();
        setEmail("admin@demo.com");
        setPassword("admin123");
        setRole("admin");
        setSuccessMsg("Filled demo admin credentials!");
        setErrorMsg("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setFormLoading(true);

    try {
      if (mode === "login") {
        const res = await login(email, password);
        if (res.success) {
          if (res.user.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        }
      } else if (mode === "register") {
        const res = await register({ email, password, name, phone, location, role });
        if (res.success) {
          router.push("/dashboard");
        }
      } else if (mode === "recover") {
        const res = await recoverPassword({ email, newPassword });
        if (res.success) {
          setSuccessMsg("Password reset successfully! You can now log in.");
          setMode("login");
          setPassword("");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setFormLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Validating auth status...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-200/30 rounded-full blur-3xl" />

      <Card className="w-full max-w-md border-slate-200 shadow-xl relative z-10 bg-white/80 backdrop-blur-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === "login" && "Welcome Back"}
            {mode === "register" && "Create Account"}
            {mode === "recover" && "Reset Password"}
          </CardTitle>
          <CardDescription>
            {mode === "login" && "Sign in to access your estimation workspaces"}
            {mode === "register" && "Register to save quote estimates and catalogs"}
            {mode === "recover" && "Enter your email and define your new password"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 pt-0">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-100">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-100">
                {successMsg}
              </div>
            )}

            {mode === "register" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase">Full Name *</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="border-slate-300"
                  />
                </div>
                
                <div className="grid gap-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700 uppercase">Phone Number *</Label>
                  <Input
                    id="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="border-slate-300"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="location" className="text-xs font-bold text-slate-700 uppercase">City / Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="border-slate-300"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="role" className="text-xs font-bold text-slate-700 uppercase">Account Type</Label>
                  <select
                    id="role"
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="customer">Customer View</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase">Email Address *</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="border-slate-300"
              />
            </div>

            {mode !== "recover" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-slate-300"
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700 uppercase">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="border-slate-300"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={formLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-sm"
            >
              {formLoading ? "Please wait..." : ""}
              {!formLoading && mode === "login" && "Sign In"}
              {!formLoading && mode === "register" && "Create Account"}
              {!formLoading && mode === "recover" && "Update Password"}
            </Button>
          </form>

          {/* Quick shortcuts info card for development testing */}
          {mode === "login" && (
            <div className="mt-4 rounded-lg bg-indigo-50/50 border border-indigo-100/50 p-3 text-center text-[10px] text-slate-500">
              ⚡ Shortcuts: Press <span className="font-bold text-indigo-700">Ctrl+1</span> for demo customer login or <span className="font-bold text-indigo-700">Ctrl+2</span> for admin login.
            </div>
          )}

          {/* Form action modes switcher */}
          <div className="mt-5 border-t border-slate-200 pt-4 flex flex-wrap justify-between text-xs font-semibold text-indigo-600">
            {mode === "login" && (
              <>
                <button type="button" onClick={() => { setMode("register"); setErrorMsg(""); setSuccessMsg(""); }} className="hover:underline">
                  Create an account
                </button>
                <button type="button" onClick={() => { setMode("recover"); setErrorMsg(""); setSuccessMsg(""); }} className="hover:underline">
                  Forgot Password?
                </button>
              </>
            )}
            {mode === "register" && (
              <button type="button" onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }} className="w-full text-center hover:underline">
                Already have an account? Sign In
              </button>
            )}
            {mode === "recover" && (
              <button type="button" onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }} className="w-full text-center hover:underline">
                Back to Sign In
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
