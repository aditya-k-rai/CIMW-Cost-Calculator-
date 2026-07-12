"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupPincode } from "@/lib/pincode";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

type FormMode = "login" | "register" | "recover";
type ActiveRole = "customer" | "company" | "employee" | "admin";

export default function Login() {
  const router = useRouter();
  const { user, login, register, firebaseSync, recoverPassword, loading } = useAuth();

  const [mode, setMode] = useState<FormMode>("login");
  const [activeRole, setActiveRole] = useState<ActiveRole>("customer");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // General Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Role Specific Fields
  const [budgetRange, setBudgetRange] = useState("Under 5L");
  const [purpose, setPurpose] = useState("Self Use");
  const [gstNumber, setGstNumber] = useState("");
  const [businessMail, setBusinessMail] = useState("");
  const [keyId, setKeyId] = useState("");
  const [position, setPosition] = useState("Designer");
  const [companyCode, setCompanyCode] = useState("");
  const [adminKey, setAdminKey] = useState("");

  // Google Flow State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [googleUid, setGoogleUid] = useState("");

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "company") {
        router.push("/company");
      } else if (user.role === "employee") {
        router.push("/employee");
      } else {
        router.push("/customer");
      }
    }
  }, [user, router]);

  // Bind Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "1") {
        e.preventDefault();
        setEmail("customer@demo.com");
        setPassword("customer123");
        setActiveRole("customer");
        setMode("login");
        setSuccessMsg("Filled demo customer credentials! (Ctrl+1)");
        setErrorMsg("");
      } else if (e.ctrlKey && e.key === "2") {
        e.preventDefault();
        setEmail("admin@demo.com");
        setPassword("admin123");
        setActiveRole("admin");
        setMode("login");
        setSuccessMsg("Filled demo admin credentials! (Ctrl+2)");
        setErrorMsg("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Pincode Lookup Handler
  useEffect(() => {
    if (pincode.length === 6) {
      void (async () => {
        const loc = await lookupPincode(pincode);
        if (loc) {
          setDistrict(loc.district);
          setState(loc.state);
        } else {
          setDistrict("");
          setState("");
        }
      })();
    }
  }, [pincode]);

  // Firebase Google Auth Sign-in
  async function handleGoogleSignIn() {
    setErrorMsg("");
    setSuccessMsg("");
    setFormLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await firebaseSync(idToken);
      if (res.success) {
        if (res.registered) {
          setSuccessMsg("Signed in via Google successfully!");
          if (res.user.role === "admin") {
            router.push("/admin");
          } else if (res.user.role === "company") {
            router.push("/company");
          } else if (res.user.role === "employee") {
            router.push("/employee");
          } else {
            router.push("/customer");
          }
        } else {
          // Google user is not registered in our database
          setGoogleIdToken(idToken);
          setGoogleUid(res.firebaseUid);
          setEmail(res.email || "");
          setName(res.name || "");
          setShowGoogleModal(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Google Authentication failed");
    } finally {
      setFormLoading(false);
    }
  }

  // Handle Dynamic Submission
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
          } else if (res.user.role === "company") {
            router.push("/company");
          } else if (res.user.role === "employee") {
            router.push("/employee");
          } else {
            router.push("/customer");
          }
        }
      } else if (mode === "register") {
        const payload: any = {
          email,
          password,
          name,
          phone,
          pincode,
          district,
          state,
          role: activeRole,
          budgetRange,
          purpose,
          gstNumber,
          businessMail,
          keyId,
          position,
          companyCode,
          adminKey
        };

        const res = await register(payload);
        if (res.success) {
          setSuccessMsg("Account created successfully!");
          if (res.user.role === "admin") {
            router.push("/admin");
          } else if (res.user.role === "company") {
            router.push("/company");
          } else if (res.user.role === "employee") {
            router.push("/employee");
          } else {
            router.push("/customer");
          }
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

  // Complete Google sign-up flow
  async function handleGoogleCompleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setFormLoading(true);

    try {
      const customFields: any = {
        name,
        phone,
        pincode,
        district,
        state,
        budgetRange,
        purpose,
        gstNumber,
        businessMail,
        keyId,
        position,
        companyCode,
        adminKey
      };

      const res = await firebaseSync(googleIdToken, activeRole, customFields);
      if (res.success && res.registered) {
        setShowGoogleModal(false);
        setSuccessMsg("Profile registration completed successfully!");
        if (res.user.role === "admin") {
          router.push("/admin");
        } else if (res.user.role === "company") {
          router.push("/company");
        } else if (res.user.role === "employee") {
          router.push("/employee");
        } else {
          router.push("/customer");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile registration");
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

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Role Tabs for Login/Register */}
        {mode !== "recover" && activeRole !== "admin" && (
          <div className="flex gap-1 bg-slate-200/80 p-1 rounded-xl shadow-sm">
            {(["customer", "company", "employee"] as ActiveRole[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setActiveRole(r);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 px-3 text-xs font-semibold capitalize rounded-lg transition-all ${
                  activeRole === r
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-indigo-600 hover:bg-white/40"
                }`}
              >
                {r === "employee" ? "Employee" : r === "company" ? "Company / Builder" : "Customer"}
              </button>
            ))}
          </div>
        )}

        {/* Form Card */}
        <Card className="border-slate-200 shadow-xl bg-white/80 backdrop-blur-md">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === "login" && (activeRole === "admin" ? "Admin Login" : `Login as ${activeRole}`)}
              {mode === "register" && (activeRole === "admin" ? "Register Admin" : `Create ${activeRole} Account`)}
              {mode === "recover" && "Reset Password"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Enter email and password or verify with Google"}
              {mode === "register" && "Provide the requested details to set up your account"}
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

              {/* Dynamic Registration Fields */}
              {mode === "register" && (
                <div className="space-y-3">
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Full Name *</Label>
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={activeRole === "company" ? "Company / Builder Name" : "e.g. John Doe"}
                      className="border-slate-300"
                    />
                  </div>

                  {activeRole !== "employee" && (
                    <div className="grid gap-1">
                      <Label className="text-xs font-bold text-slate-700 uppercase">Phone Number *</Label>
                      <Input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="border-slate-300"
                      />
                    </div>
                  )}

                  {/* GST & Business Email for Company */}
                  {activeRole === "company" && (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">GST Number *</Label>
                        <Input
                          required
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                          placeholder="e.g. 07AAAAA1111A1Z1"
                          className="border-slate-300"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Business Billing Email *</Label>
                        <Input
                          required
                          type="email"
                          value={businessMail}
                          onChange={(e) => setBusinessMail(e.target.value)}
                          placeholder="billing@company.com"
                          className="border-slate-300"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Subscription Key-ID *</Label>
                        <Input
                          required
                          value={keyId}
                          onChange={(e) => setKeyId(e.target.value)}
                          placeholder="SUB-XXXXX"
                          className="border-slate-300"
                        />
                      </div>
                    </>
                  )}

                  {/* Pincode & Dynamic Lookup */}
                  {activeRole !== "admin" && (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Pincode *</Label>
                        <Input
                          required
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          placeholder="6-digit ZIP code"
                          className="border-slate-300"
                          maxLength={6}
                        />
                      </div>

                      {district && state && (
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                          <div>
                            <span className="text-slate-500 font-semibold uppercase block">District</span>
                            <span className="text-slate-800 font-bold">{district}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold uppercase block">State</span>
                            <span className="text-slate-800 font-bold">{state}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Customer specific: budget & purpose */}
                  {activeRole === "customer" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Budget *</Label>
                        <select
                          className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium focus:border-indigo-500 focus:ring-indigo-500"
                          value={budgetRange}
                          onChange={(e) => setBudgetRange(e.target.value)}
                        >
                          <option value="Under 5L">Under 5 Lakhs</option>
                          <option value="5L - 10L">5L - 10 Lakhs</option>
                          <option value="10L - 20L">10L - 20 Lakhs</option>
                          <option value="Above 20L">Above 20 Lakhs</option>
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Purpose *</Label>
                        <select
                          className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium focus:border-indigo-500 focus:ring-indigo-500"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                        >
                          <option value="Self Use">Self Use</option>
                          <option value="Rental">Rental Property</option>
                          <option value="Investment">Investment</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Employee specific: position & company code */}
                  {activeRole === "employee" && (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Position *</Label>
                        <select
                          className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium focus:border-indigo-500 focus:ring-indigo-500"
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                        >
                          <option value="Designer">Designer</option>
                          <option value="Project Manager">Project Manager</option>
                          <option value="Site Engineer">Site Engineer</option>
                          <option value="Accountant">Accountant</option>
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Company Code *</Label>
                        <Input
                          required
                          value={companyCode}
                          onChange={(e) => setCompanyCode(e.target.value)}
                          placeholder="Company Key-ID (SUB-XXXXX)"
                          className="border-slate-300"
                        />
                      </div>
                    </>
                  )}

                  {/* Admin Key code */}
                  {activeRole === "admin" && (
                    <div className="grid gap-1">
                      <Label className="text-xs font-bold text-slate-700 uppercase">Admin Verification Key *</Label>
                      <Input
                        required
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        placeholder="5-letter admin key"
                        className="border-slate-300"
                        maxLength={5}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Standard Email & Password Fields */}
              <div className="space-y-3">
                <div className="grid gap-1">
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

                {mode !== "recover" && (
                  <div className="grid gap-1">
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
                )}

                {mode === "recover" && (
                  <div className="grid gap-1">
                    <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700 uppercase">New Password *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="border-slate-300"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2 text-white font-bold" disabled={formLoading}>
                {formLoading ? "Processing..." : mode === "login" ? "Sign In" : mode === "register" ? "Sign Up" : "Reset Password"}
              </Button>
            </form>

            {/* Google Authentication Section */}
            {mode !== "recover" && (
              <div className="mt-4 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200"></span>
                  </div>
                  <span className="relative bg-white px-3 text-slate-400 text-xs uppercase font-bold tracking-wider">
                    Or Continue With
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-300 text-slate-700 font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={formLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            )}

            {/* Toggle Login/Signup Modes */}
            <div className="mt-4 text-center text-xs space-y-2">
              {mode === "login" && (
                <>
                  <p className="text-slate-500">
                    Don't have an account?{" "}
                    <button onClick={() => setMode("register")} className="font-bold text-indigo-600 hover:underline">
                      Register Now
                    </button>
                  </p>
                  <p>
                    <button onClick={() => setMode("recover")} className="font-semibold text-slate-500 hover:text-indigo-600 hover:underline">
                      Forgot password?
                    </button>
                  </p>
                </>
              )}
              {mode === "register" && (
                <p className="text-slate-500">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="font-bold text-indigo-600 hover:underline">
                    Log In
                  </button>
                </p>
              )}
              {mode === "recover" && (
                <p>
                  <button onClick={() => setMode("login")} className="font-bold text-indigo-600 hover:underline">
                    Back to Login
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Admin Toggle */}
        <div className="text-center">
          <button
            onClick={() => {
              setActiveRole(activeRole === "admin" ? "customer" : "admin");
              setMode("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-[10px] font-bold tracking-widest text-slate-400 hover:text-indigo-500 uppercase transition-all"
          >
            {activeRole === "admin" ? "Switch to Public Portal" : "Admin Panel Access"}
          </button>
        </div>
      </div>

      {/* Google Auth Profile Completion Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Complete Google Profile</h3>
              <p className="text-xs text-slate-500">Finish setting up your {activeRole} account</p>
            </div>

            <form onSubmit={handleGoogleCompleteSubmit} className="space-y-4">
              <div className="grid gap-1">
                <Label className="text-xs font-bold text-slate-700 uppercase">Profile Email</Label>
                <Input value={email} disabled className="bg-slate-50 border-slate-300 text-slate-500" />
              </div>

              <div className="grid gap-1">
                <Label className="text-xs font-bold text-slate-700 uppercase">Full Name *</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Verify your name"
                  className="border-slate-300"
                />
              </div>

              {activeRole !== "employee" && (
                <div className="grid gap-1">
                  <Label className="text-xs font-bold text-slate-700 uppercase">Phone Number *</Label>
                  <Input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="border-slate-300"
                  />
                </div>
              )}

              {/* Company spec */}
              {activeRole === "company" && (
                <>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">GST Number *</Label>
                    <Input
                      required
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="07AAAAA1111A1Z1"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Business Mail *</Label>
                    <Input
                      required
                      type="email"
                      value={businessMail}
                      onChange={(e) => setBusinessMail(e.target.value)}
                      placeholder="billing@company.com"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Subscription Key-ID *</Label>
                    <Input
                      required
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      placeholder="SUB-XXXXX"
                      className="border-slate-300"
                    />
                  </div>
                </>
              )}

              {/* Pincode & address */}
              {activeRole !== "admin" && (
                <>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Pincode *</Label>
                    <Input
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="ZIP code"
                      className="border-slate-300"
                      maxLength={6}
                    />
                  </div>

                  {district && state && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase">District</span>
                        <span className="text-slate-800 font-bold">{district}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase">State</span>
                        <span className="text-slate-800 font-bold">{state}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Customer spec */}
              {activeRole === "customer" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Budget *</Label>
                    <select
                      className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium"
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                    >
                      <option value="Under 5L">Under 5 Lakhs</option>
                      <option value="5L - 10L">5L - 10 Lakhs</option>
                      <option value="10L - 20L">10L - 20 Lakhs</option>
                      <option value="Above 20L">Above 20 Lakhs</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Purpose *</Label>
                    <select
                      className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    >
                      <option value="Self Use">Self Use</option>
                      <option value="Rental">Rental Property</option>
                      <option value="Investment">Investment</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Employee spec */}
              {activeRole === "employee" && (
                <>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Position *</Label>
                    <select
                      className="h-10 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    >
                      <option value="Designer">Designer</option>
                      <option value="Project Manager">Project Manager</option>
                      <option value="Site Engineer">Site Engineer</option>
                      <option value="Accountant">Accountant</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Company Code *</Label>
                    <Input
                      required
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      placeholder="Company Key-ID (SUB-XXXXX)"
                      className="border-slate-300"
                    />
                  </div>
                </>
              )}

              {/* Admin Key code */}
              {activeRole === "admin" && (
                <div className="grid gap-1">
                  <Label className="text-xs font-bold text-slate-700 uppercase">Admin Verification Key *</Label>
                  <Input
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="CIMKW"
                    className="border-slate-300"
                    maxLength={5}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowGoogleModal(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  disabled={formLoading}
                >
                  {formLoading ? "Registering..." : "Submit Registration"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
