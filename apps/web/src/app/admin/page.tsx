"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  Grid,
  FileText,
  Tag,
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  LogOut,
  ChevronRight,
  Database,
  Users,
  Building2,
  Key
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AdminTab = "products" | "brands-cats" | "woodwork" | "doors" | "users" | "quotes" | "companies" | "subscription-keys";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("products");

  // State lists
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [woodwork, setWoodwork] = useState<any[]>([]);
  const [doorData, setDoorData] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);

  // Subscription Key State lists
  const [subscriptionKeys, setSubscriptionKeys] = useState<any[]>([]);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Subscription Key Form states
  const [keyVal, setKeyVal] = useState("");
  const [keyCompany, setKeyCompany] = useState("");
  const [keyPlan, setKeyPlan] = useState("trial");
  const [keyDuration, setKeyDuration] = useState(30);

  // Company Form states
  const [compId, setCompId] = useState("");
  const [compName, setCompName] = useState("");
  const [compEmail, setCompEmail] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compGst, setCompGst] = useState("");
  const [compPlan, setCompPlan] = useState("trial");
  const [compExpiry, setCompExpiry] = useState("");
  const [compStatus, setCompStatus] = useState("active");
  const [compMaxEmployees, setCompMaxEmployees] = useState(20);
  const [compMaxStorage, setCompMaxStorage] = useState(5000);
  const [compCalculators, setCompCalculators] = useState<Record<string, boolean>>({
    interior: true,
    construction: true,
    painting: true,
    electrical: true,
    plumbing: true,
    tiles: true,
    furniture: true,
    custom: true
  });

  // Action status indicators
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Product Form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [prodId, setProdId] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCalc, setProdCalc] = useState("modular-kitchen");
  const [prodCat, setProdCat] = useState("");
  const [prodSub, setProdSub] = useState("");
  const [prodUnit, setProdUnit] = useState("running ft");
  const [prodRate, setProdRate] = useState(0);
  const [prodImage, setProdImage] = useState("");
  const [prodVariants, setProdVariants] = useState<Array<{ name: string; rate: number }>>([]);
  const [newVarName, setNewVarName] = useState("");
  const [newVarRate, setNewVarRate] = useState(0);

  // Quick addition states
  const [newBrandName, setNewBrandName] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Doors settings editing states
  const [doorTax, setDoorTax] = useState(18);
  const [doorInstallFee, setDoorInstallFee] = useState(1500);
  const [doorInstallType, setDoorInstallType] = useState("per_unit");
  const [doorWaPhone, setDoorWaPhone] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  async function loadData() {
    try {
      const [p, b, c, w, d, q, u, comp, keys] = await Promise.all([
        api.products.get(),
        api.brands.get(),
        api.categories.get(),
        api.woodwork.get(),
        api.doors.getAll(),
        api.quotes.get(),
        api.auth.getAllUsers(),
        api.auth.getAllCompanies(),
        api.auth.getAllSubscriptionKeys()
      ]);
      setProducts(p);
      setBrands(b);
      setCategories(c);
      setWoodwork(w);
      setDoorData(d);
      setUsers(u);
      setCompanies(comp || []);
      setSubscriptionKeys(keys || []);

      let quoteData = q;
      try {
        const querySnapshot = await getDocs(query(collection(db, "quotes"), orderBy("createdAt", "desc")));
        if (!querySnapshot.empty) {
          const fbQuotes: any[] = [];
          querySnapshot.forEach((doc) => {
            fbQuotes.push({ id: doc.id, ...doc.data() });
          });
          quoteData = fbQuotes;
        }
      } catch (fbErr) {
        console.error("Firebase fetch failed, falling back to SQLite API:", fbErr);
      }
      setQuotes(quoteData);

      if (d?.settings) {
        setDoorTax(d.settings.taxPercent);
        setDoorInstallFee(d.settings.installationCharges);
        setDoorInstallType(d.settings.installationType);
        setDoorWaPhone(d.settings.whatsappNumber);
      }
    } catch (err: any) {
      setErrorMsg("Failed to sync admin catalog: " + err.message);
    }
  }

  useEffect(() => {
    if (user && user.role === "admin") {
      void loadData();
    }
  }, [user]);

  function triggerSuccess(msg: string) {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  async function handleUserPermissionToggle(userId: string, key: string, val: boolean) {
    try {
      const userToEdit = users.find((u) => u.id === userId);
      if (!userToEdit) return;

      const currentPerms = userToEdit.permissions || {};
      const updatedPermissions = {
        ...currentPerms,
        [key]: val
      };

      await api.auth.adminUpdateUserPermissions(userId, updatedPermissions);
      triggerSuccess("Updated permissions for " + userToEdit.name);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, permissions: updatedPermissions } : u))
      );
    } catch (err: any) {
      setErrorMsg("Failed to toggle permission: " + err.message);
    }
  }

  // ===================== PRODUCT OPERATIONS =====================

  function openCreateModal() {
    setEditProduct(null);
    setProdId(`prod_${Date.now()}`);
    setProdName("");
    setProdDesc("");
    setProdCalc("modular-kitchen");
    setProdCat(categories[0]?.id || "");
    setProdSub("");
    setProdUnit("running ft");
    setProdRate(0);
    setProdImage("");
    setProdVariants([]);
    setShowProductModal(true);
  }

  function openEditModal(p: any) {
    setEditProduct(p);
    setProdId(p.id);
    setProdName(p.name);
    setProdDesc(p.description);
    setProdCalc(p.calculator);
    setProdCat(p.categoryId || p.category);
    setProdSub(p.subcategory || "");
    setProdUnit(p.unit);
    setProdRate(p.rate);
    setProdImage(p.imageUrl || p.image || "");
    setProdVariants(p.variants || []);
    setShowProductModal(true);
  }

  function addProductVariant() {
    if (!newVarName || newVarRate <= 0) return;
    setProdVariants(prev => [...prev, { name: newVarName, rate: newVarRate }]);
    setNewVarName("");
    setNewVarRate(0);
  }

  function removeProductVariant(index: number) {
    setProdVariants(prev => prev.filter((_, idx) => idx !== index));
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      id: prodId,
      calculator: prodCalc,
      categoryId: prodCat,
      subcategory: prodSub,
      name: prodName,
      description: prodDesc,
      imageUrl: prodImage,
      unit: prodUnit,
      rate: prodRate,
      variants: prodVariants
    };

    try {
      if (editProduct) {
        await api.products.update(prodId, payload);
        triggerSuccess("Product updated successfully!");
      } else {
        await api.products.create(payload);
        triggerSuccess("Product created successfully!");
      }
      setShowProductModal(false);
      void loadData();
    } catch (err: any) {
      setErrorMsg("Failed to save product: " + err.message);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.products.delete(id);
      triggerSuccess("Product deleted successfully!");
      void loadData();
    } catch (err: any) {
      setErrorMsg("Failed to delete product: " + err.message);
    }
  }

  // ===================== BRANDS / CATS OPERATIONS =====================

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!newBrandName) return;
    try {
      await api.brands.create({ name: newBrandName });
      triggerSuccess("Brand added successfully!");
      setNewBrandName("");
      void loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function deleteBrand(id: string) {
    try {
      await api.brands.delete(id);
      triggerSuccess("Brand deleted successfully!");
      void loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await api.categories.create({ name: newCatName, description: newCatDesc });
      triggerSuccess("Category added successfully!");
      setNewCatName("");
      setNewCatDesc("");
      void loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function deleteCategory(id: string) {
    try {
      await api.categories.delete(id);
      triggerSuccess("Category deleted successfully!");
      void loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // ===================== DOORS SETTINGS SAVE =====================

  async function saveDoorsSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.doors.saveSettings({
        taxPercent: doorTax,
        installationCharges: doorInstallFee,
        installationType: doorInstallType,
        whatsappNumber: doorWaPhone,
        floorOptions: doorData?.settings?.floorOptions || ["Ground Floor", "First Floor"],
        areaOptions: doorData?.settings?.areaOptions || ["Bathroom", "Kitchen"]
      });
      triggerSuccess("Global door settings saved successfully!");
      void loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // ===================== COMPANY OPERATIONS =====================

  function openCreateCompanyModal() {
    setEditCompany(null);
    setCompId("");
    setCompName("");
    setCompEmail("");
    setCompPhone("");
    setCompGst("");
    setCompPlan("trial");
    setCompExpiry(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setCompStatus("active");
    setCompMaxEmployees(20);
    setCompMaxStorage(5000);
    setCompCalculators({
      interior: true,
      construction: true,
      painting: true,
      electrical: true,
      plumbing: true,
      tiles: true,
      furniture: true,
      custom: true
    });
    setShowCompanyModal(true);
  }

  function openEditCompanyModal(company: any) {
    setEditCompany(company);
    setCompId(company.id);
    setCompName(company.name);
    setCompEmail(company.email);
    setCompPhone(company.phone || "");
    setCompGst(company.gstNumber || "");
    setCompPlan(company.subscription?.plan || "trial");
    setCompExpiry(company.subscription?.expiryDate ? new Date(company.subscription.expiryDate).toISOString().split("T")[0] : "");
    setCompStatus(company.subscription?.status || "active");
    setCompMaxEmployees(company.limits?.maxEmployees ?? 20);
    setCompMaxStorage(company.limits?.maxStorage ?? 5000);
    setCompCalculators(company.calculatorsEnabled || {
      interior: true,
      construction: true,
      painting: true,
      electrical: true,
      plumbing: true,
      tiles: true,
      furniture: true,
      custom: true
    });
    setShowCompanyModal(true);
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: compName,
      email: compEmail,
      phone: compPhone,
      gstNumber: compGst,
      subscription: {
        plan: compPlan,
        expiryDate: compExpiry ? new Date(compExpiry).toISOString() : new Date().toISOString(),
        status: compStatus
      },
      limits: {
        maxEmployees: compMaxEmployees,
        maxStorage: compMaxStorage,
        maxProjects: 100,
        maxQuotes: 500,
        maxCustomers: 200,
        maxProducts: 1000
      },
      calculatorsEnabled: compCalculators
    };

    try {
      if (editCompany) {
        await api.auth.updateCompany(compId, payload);
        triggerSuccess("Company updated successfully!");
      } else {
        await api.auth.createCompany(payload);
        triggerSuccess("Company created successfully!");
      }
      setShowCompanyModal(false);
      void loadData();
    } catch (err: any) {
      setErrorMsg("Failed to save company: " + err.message);
    }
  }

  async function deleteCompany(id: string) {
    if (!confirm("Are you sure you want to delete this company? This will delete all tenant configs.")) return;
    try {
      await api.auth.deleteCompany(id);
      triggerSuccess("Company deleted successfully!");
      void loadData();
    } catch (err: any) {
      setErrorMsg("Failed to delete company: " + err.message);
    }
  }

  async function toggleCompanyStatus(company: any) {
    const nextStatus = company.subscription?.status === "active" ? "suspended" : "active";
    try {
      await api.auth.updateCompany(company.id, {
        subscription: {
          ...company.subscription,
          status: nextStatus
        }
      });
      triggerSuccess(`Company status toggled to ${nextStatus}!`);
      void loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // ===================== SUBSCRIPTION KEY OPERATIONS =====================

  function openCreateKeyModal() {
    setKeyVal("");
    setKeyCompany("");
    setKeyPlan("trial");
    setKeyDuration(30);
    setShowKeyModal(true);
  }

  function handleAutoGenerateKey() {
    const prefix = (keyCompany || "CIMW").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
    const numbers = Math.floor(10000 + Math.random() * 90000);
    setKeyVal(`${prefix}#${numbers}`); // Exactly 10 characters!
  }

  async function handleKeySubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.auth.createSubscriptionKey({
        keyId: keyVal || undefined,
        companyName: keyCompany,
        plan: keyPlan,
        durationDays: keyDuration
      });
      triggerSuccess("Subscription Key generated successfully!");
      setShowKeyModal(false);
      void loadData();
    } catch (err: any) {
      setErrorMsg("Failed to generate key: " + err.message);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Are you sure you want to revoke this subscription key?")) return;
    try {
      await api.auth.deleteSubscriptionKey(id);
      triggerSuccess("Subscription Key revoked successfully!");
      void loadData();
    } catch (err: any) {
      setErrorMsg("Failed to revoke key: " + err.message);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">Authorizing credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-45 border-b border-slate-200 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Admin Control Panel</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Configuration engine and cost master</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Calculators View
            </Button>
            
            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin layout */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        
        {/* Navigation Sidebar */}
        <aside className="space-y-4">
          <nav className="grid gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              onClick={() => setModeAndClear("products")}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "products" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Grid className="h-4 w-4" /> Products
            </button>
            <button
              onClick={() => setModeAndClear("brands-cats")}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "brands-cats" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Tag className="h-4 w-4" /> Brands & Cats
            </button>
            <button
              onClick={() => setModeAndClear("doors")}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "doors" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Settings className="h-4 w-4" /> Custom Doors
            </button>
            <button
              onClick={() => setModeAndClear("users")}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "users" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Users className="h-4 w-4" /> Users Control
            </button>
            <button
              onClick={() => setModeAndClear("quotes")}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "quotes" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-4 w-4" /> Customer Quotes
            </button>
            <button
              onClick={() => setModeAndClear("companies")}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "companies" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Building2 className="h-4 w-4" /> Companies
            </button>
            <button
              onClick={() => setModeAndClear("subscription-keys")}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "subscription-keys" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Key className="h-4 w-4" /> Subscription Keys
            </button>
          </nav>
        </aside>

        {/* Action Panel Workspace */}
        <section className="space-y-6">
          {errorMsg && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-100">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-100">
              {successMsg}
            </div>
          )}

          {/* TAB 1: PRODUCT CATALOG MANAGER */}
          {activeTab === "products" && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg">Product Catalog Inventory</CardTitle>
                  <CardDescription>Configure products, basic pricing per unit, and variants.</CardDescription>
                </div>
                <Button
                  onClick={openCreateModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Plus className="h-4.5 w-4.5" /> Create Product
                </Button>
              </CardHeader>
              
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">ID / Scope</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Subcategory</th>
                      <th className="px-4 py-3">Base Unit</th>
                      <th className="px-4 py-3">Base Rate</th>
                      <th className="px-4 py-3">Variants</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="px-4 py-3 font-semibold text-slate-500">
                          {p.id}
                          <span className="block text-[9px] uppercase tracking-wider text-indigo-600 mt-0.5">
                            {p.calculator}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                        <td className="px-4 py-3">{p.subcategory}</td>
                        <td className="px-4 py-3">{p.unit}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(p.rate)}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600">
                          {p.variants?.length || 0} variant(s)
                        </td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="text-slate-500 hover:text-indigo-600 rounded p-1"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="text-slate-500 hover:text-red-600 rounded p-1"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: BRANDS AND CATEGORIES */}
          {activeTab === "brands-cats" && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Brand Creation */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Brands Management</CardTitle>
                  <CardDescription>Setup accessory manufacturers (Hafele, Blum, etc.)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={createBrand} className="flex gap-2">
                    <Input
                      placeholder="Enter brand name"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="border-slate-300 h-9 text-xs"
                      required
                    />
                    <Button type="submit" size="sm" className="bg-indigo-600 text-white font-semibold">
                      Add Brand
                    </Button>
                  </form>
                  
                  <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {brands.map((b) => (
                      <div key={b.id} className="flex justify-between items-center rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800">
                        <span>{b.name}</span>
                        <button onClick={() => deleteBrand(b.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Creation */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Categories Management</CardTitle>
                  <CardDescription>Define system-wide product classifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={createCategory} className="space-y-3">
                    <Input
                      placeholder="Category Name"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="border-slate-300 h-9 text-xs"
                      required
                    />
                    <Input
                      placeholder="Short Description"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      className="border-slate-300 h-9 text-xs"
                    />
                    <Button type="submit" size="sm" className="bg-indigo-600 text-white font-semibold w-full">
                      Add Category
                    </Button>
                  </form>
                  
                  <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {categories.map((c) => (
                      <div key={c.id} className="flex justify-between items-start rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800">
                        <div>
                          <div>{c.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5 block">{c.description}</span>
                        </div>
                        <button onClick={() => deleteCategory(c.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: CUSTOM DOORS PLATFORM CONFIGS */}
          {activeTab === "doors" && doorData && (
            <div className="grid gap-6">
              
              {/* Global Settings Panel */}
              <Card className="border-slate-200 shadow-sm border-l-4 border-l-indigo-600 bg-indigo-50/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-800">Global Door Installation & Taxes Parameters</CardTitle>
                  <CardDescription>Setup base default taxes and delivery coefficients</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={saveDoorsSettings} className="grid gap-4 sm:grid-cols-4 items-end">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">GST Percentage (%)</Label>
                      <Input
                        type="number"
                        className="border-slate-300 h-9 text-xs font-bold"
                        value={doorTax}
                        onChange={(e) => setDoorTax(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">Installation Base Charge (Rs)</Label>
                      <Input
                        type="number"
                        className="border-slate-300 h-9 text-xs font-bold"
                        value={doorInstallFee}
                        onChange={(e) => setDoorInstallFee(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">Installation Charges Scope</Label>
                      <select
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"
                        value={doorInstallType}
                        onChange={(e) => setDoorInstallType(e.target.value)}
                      >
                        <option value="fixed">Flat Charge (Fixed)</option>
                        <option value="per_unit">Per Unit configured</option>
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">WhatsApp Business Target</Label>
                      <Input
                        className="border-slate-300 h-9 text-xs font-bold"
                        value={doorWaPhone}
                        placeholder="e.g. 919582581238"
                        onChange={(e) => setDoorWaPhone(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="sm:col-span-4 bg-indigo-600 text-white font-bold h-9">
                      <Save className="h-4 w-4 mr-1" /> Save Global Configuration
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Doors subconfigs tables summary */}
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Templates */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-xs font-extrabold uppercase text-slate-500">Door Design Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {doorData.templates.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800">
                          <div>
                            <span className="text-base mr-1.5">{t.icon}</span>
                            <span>{t.name}</span>
                          </div>
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            Sort: {t.sortOrder}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Variants */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-xs font-extrabold uppercase text-slate-500">Base Materials (Variants)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {doorData.variants.map((v: any) => (
                        <div key={v.id} className="flex justify-between items-center rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800">
                          <div>
                            <div>{v.name}</div>
                            <span className="text-[9px] text-slate-400 font-normal">SKU: {v.sku || "N/A"}</span>
                          </div>
                          <span className="font-extrabold text-emerald-600">{formatCurrency(v.basePrice)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMER QUOTES LOGS */}
          {activeTab === "quotes" && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Customer Quote Requests History</CardTitle>
                <CardDescription>Review all incoming quotes captured by the database.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {quotes.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold text-sm">
                    No quote requests stored in SQLite yet.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Customer Details</th>
                        <th className="px-4 py-3">Location / Scope</th>
                        <th className="px-4 py-3">Estimated Budget</th>
                        <th className="px-4 py-3 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {quotes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3 text-slate-500 font-medium">
                            {new Date(q.createdAt).toLocaleDateString()}
                            <span className="block text-[9px] mt-0.5 text-slate-400">
                              {new Date(q.createdAt).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {q.customerName}
                            <span className="block text-[10px] text-slate-500 font-normal">
                              Phone: {q.customerPhone} | Email: {q.customerEmail}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {q.customerLocation || "N/A"}
                            <span className="block text-[9px] uppercase font-bold text-indigo-600 mt-0.5">
                              {q.projectType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-semibold">{q.budgetRange || "N/A"}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-indigo-600 text-sm">
                            {formatCurrency(q.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 5: USERS CONTROL MANAGER */}
          {activeTab === "users" && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 py-4">
                <CardTitle className="text-lg">User Accounts & Calculator Permissions</CardTitle>
                <CardDescription>Manage workspace permissions for Customers, Companies, and Employees.</CardDescription>
              </CardHeader>
              
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">User Details</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Location / Contact</th>
                      <th className="px-4 py-3">Registration Details</th>
                      <th className="px-4 py-3 text-center">Kitchen</th>
                      <th className="px-4 py-3 text-center">Doors</th>
                      <th className="px-4 py-3 text-center">Wardrobe</th>
                      <th className="px-4 py-3 text-center">Construction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {users.map((u) => {
                      if (u.role === "admin") return null;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{u.name}</div>
                            <div className="text-slate-500">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              u.role === "company" 
                                ? "bg-purple-100 text-purple-700" 
                                : u.role === "employee" 
                                  ? "bg-amber-100 text-amber-700" 
                                  : "bg-blue-100 text-blue-700"
                            }`}>
                              {u.role === "company" ? "Company" : u.role === "employee" ? "Employee" : "Customer"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{u.phone || "No phone"}</div>
                            <div className="text-[10px]">{u.pincode ? `${u.pincode} (${u.district}, ${u.state})` : ""}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {u.role === "company" && (
                              <div>
                                <div className="text-[10px]">GST: <span className="font-semibold text-slate-700">{u.gstNumber}</span></div>
                                <div className="text-[10px]">Key: <span className="font-semibold text-slate-700">{u.keyId}</span></div>
                              </div>
                            )}
                            {u.role === "employee" && (
                              <div>
                                <div className="text-[10px]">Pos: <span className="font-semibold text-slate-700">{u.position}</span></div>
                                <div className="text-[10px]">Comp: <span className="font-semibold text-slate-700">{u.companyCode}</span></div>
                              </div>
                            )}
                            {u.role === "customer" && (
                              <div>
                                <div className="text-[10px]">Budget: <span className="font-semibold text-slate-700">{u.budgetRange}</span></div>
                                <div className="text-[10px]">Purpose: <span className="font-semibold text-slate-700">{u.purpose}</span></div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={u.permissions?.kitchen !== false}
                              onChange={(e) => handleUserPermissionToggle(u.id, "kitchen", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={u.permissions?.doors !== false}
                              onChange={(e) => handleUserPermissionToggle(u.id, "doors", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={u.permissions?.wardrobe !== false}
                              onChange={(e) => handleUserPermissionToggle(u.id, "wardrobe", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={u.permissions?.construction !== false}
                              onChange={(e) => handleUserPermissionToggle(u.id, "construction", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: COMPANIES MANAGER */}
          {activeTab === "companies" && (
            <div className="space-y-6">
              {/* Analytics metrics */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric cardColor="border-l-4 border-l-indigo-600" title="Total Companies" value={`${companies.length}`} />
                <Metric cardColor="border-l-4 border-l-emerald-600" title="Active Subscriptions" value={`${companies.filter(c => c.subscription?.status === 'active' && new Date(c.subscription?.expiryDate).getTime() > Date.now()).length}`} />
                <Metric cardColor="border-l-4 border-l-rose-600" title="Expired/Suspended" value={`${companies.filter(c => c.subscription?.status !== 'active' || new Date(c.subscription?.expiryDate).getTime() <= Date.now()).length}`} />
              </div>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">Registered Company Tenants</CardTitle>
                    <CardDescription>Provision company accounts, subscription status, and calculators availability.</CardDescription>
                  </div>
                  <Button
                    onClick={openCreateCompanyModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Plus className="h-4.5 w-4.5" /> Provision Tenant
                  </Button>
                </CardHeader>
                
                <CardContent className="p-0 overflow-x-auto">
                  {companies.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-bold text-sm">
                      No companies provisioned yet.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Company Details</th>
                          <th className="px-4 py-3">Subscription</th>
                          <th className="px-4 py-3">Expiry Date</th>
                          <th className="px-4 py-3">Limits</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {companies.map((c) => {
                          const isExpired = !c.subscription?.expiryDate || new Date(c.subscription.expiryDate).getTime() <= Date.now();
                          const isActive = c.subscription?.status === 'active' && !isExpired;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/40">
                              <td className="px-4 py-3 font-bold text-slate-800">
                                {c.name}
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  GST: {c.gstNumber || "N/A"} | Email: {c.email}
                                </span>
                              </td>
                              <td className="px-4 py-3 capitalize text-slate-600 font-semibold">
                                {c.subscription?.plan || "Trial"}
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-medium">
                                {c.subscription?.expiryDate ? new Date(c.subscription.expiryDate).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium">
                                Employees: {c.limits?.maxEmployees ?? 20} <br/>
                                Storage: {(c.limits?.maxStorage ?? 5000) / 1000} GB
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isActive
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isExpired
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}>
                                  {isActive ? "Active" : isExpired ? "Expired" : "Suspended"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditCompanyModal(c)}
                                  className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                  Edit limits
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleCompanyStatus(c)}
                                  className={`h-8 text-[11px] font-bold ${
                                    c.subscription?.status === 'active'
                                      ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {c.subscription?.status === 'active' ? "Suspend" : "Activate"}
                                </Button>
                                <button
                                  onClick={() => deleteCompany(c.id)}
                                  className="text-slate-400 hover:text-red-600 p-1.5 transition-colors inline-block align-middle"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 7: SUBSCRIPTION KEYS MANAGER */}
          {activeTab === "subscription-keys" && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg">Subscription Keys Catalog</CardTitle>
                  <CardDescription>Generate 10-digit registration codes to onboard new builders and workspace tenants.</CardDescription>
                </div>
                <Button
                  onClick={openCreateKeyModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Plus className="h-4.5 w-4.5" /> Generate Key
                </Button>
              </CardHeader>
              
              <CardContent className="p-0 overflow-x-auto">
                {subscriptionKeys.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold text-sm">
                    No subscription keys generated yet.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Key Code</th>
                        <th className="px-4 py-3">Allocated Company Name</th>
                        <th className="px-4 py-3">Plan / Validity</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {subscriptionKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3 font-bold">
                            <span className="font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 text-sm select-all">
                              {k.id}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {k.companyName}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-semibold capitalize">
                            {k.plan} ({k.durationDays} Days)
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              k.status === 'active'
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                            }`}>
                              {k.status}
                              {k.usedByCompanyName && (
                                <span className="block text-[8px] font-normal lowercase mt-0.5">
                                  by {k.usedByCompanyName}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => deleteKey(k.id)}
                              className="text-slate-400 hover:text-red-600 p-1.5 transition-colors inline-block align-middle"
                              title="Revoke Key"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

        </section>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL DIALOG */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl bg-white overflow-hidden max-h-[90vh] flex flex-col justify-between">
            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{editProduct ? "Modify Product" : "New Catalog Item"}</CardTitle>
                <CardDescription className="text-[10px]">Define parameters, units, rates, and specifications.</CardDescription>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleProductSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Calculator module</Label>
                  <select
                    className="h-9 w-full rounded border border-slate-300 bg-white px-2"
                    value={prodCalc}
                    onChange={(e) => setProdCalc(e.target.value)}
                  >
                    <option value="modular-kitchen">Modular Kitchen</option>
                    <option value="interior">Interior Doors</option>
                    <option value="wardrobe">Wardrobes</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Category Tag</Label>
                  <select
                    className="h-9 w-full rounded border border-slate-300 bg-white px-2"
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Subcategory</Label>
                  <Input
                    className="border-slate-300 h-9"
                    value={prodSub}
                    placeholder="e.g. Drawers, Cabinets"
                    onChange={(e) => setProdSub(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Product Name</Label>
                  <Input
                    className="border-slate-300 h-9 font-bold"
                    value={prodName}
                    required
                    onChange={(e) => setProdName(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Description</Label>
                  <textarea
                    className="min-h-16 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Base Unit</Label>
                  <Input
                    className="border-slate-300 h-9"
                    value={prodUnit}
                    required
                    placeholder="e.g. running ft, sq ft, unit"
                    onChange={(e) => setProdUnit(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Base Rate (Rs.)</Label>
                  <Input
                    type="number"
                    className="border-slate-300 h-9 font-bold text-emerald-600"
                    value={prodRate}
                    required
                    onChange={(e) => setProdRate(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Product Image URL</Label>
                  <Input
                    className="border-slate-300 h-9"
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                  />
                </div>
              </div>

              {/* Variants subpanel */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500">Configure Variants (Optional)</Label>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Variant name"
                    className="border-slate-300 h-8 flex-1"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Rate"
                    className="border-slate-300 h-8 w-24"
                    value={newVarRate || ""}
                    onChange={(e) => setNewVarRate(parseFloat(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    onClick={addProductVariant}
                    className="bg-indigo-600 text-white font-bold h-8 text-[11px] px-3.5"
                  >
                    Add Var
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {prodVariants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full font-semibold">
                      <span>{v.name} (Rs. {v.rate})</span>
                      <button type="button" onClick={() => removeProductVariant(idx)} className="text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-sm"
                >
                  {editProduct ? "Apply Modifications" : "Publish Product"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* PROVISION / EDIT COMPANY MODAL DIALOG */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl bg-white overflow-hidden max-h-[90vh] flex flex-col justify-between">
            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{editCompany ? "Edit Company Limits" : "Provision New Company Tenant"}</CardTitle>
                <CardDescription className="text-[10px]">Define parameters, subscription tier, employee capacities, and storage limits.</CardDescription>
              </div>
              <button onClick={() => setShowCompanyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleCompanySubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Company Name</Label>
                  <Input
                    className="border-slate-300 h-9 font-bold"
                    value={compName}
                    required
                    onChange={(e) => setCompName(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">GST Number</Label>
                  <Input
                    className="border-slate-300 h-9 font-mono"
                    value={compGst}
                    placeholder="22AAAAA1111A1Z1"
                    onChange={(e) => setCompGst(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    className="border-slate-300 h-9"
                    value={compEmail}
                    required
                    onChange={(e) => setCompEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Phone Number</Label>
                  <Input
                    className="border-slate-300 h-9"
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Subscription Plan</Label>
                  <select
                    className="h-9 w-full rounded border border-slate-300 bg-white px-2"
                    value={compPlan}
                    onChange={(e) => setCompPlan(e.target.value)}
                  >
                    <option value="trial">Free Trial</option>
                    <option value="monthly">Monthly Subscription</option>
                    <option value="yearly">Yearly Subscription</option>
                    <option value="lifetime">Lifetime Access</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Expiry Date</Label>
                  <Input
                    type="date"
                    className="border-slate-300 h-9"
                    value={compExpiry}
                    required
                    onChange={(e) => setCompExpiry(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Max Employee Count</Label>
                  <Input
                    type="number"
                    className="border-slate-300 h-9 font-bold"
                    value={compMaxEmployees}
                    required
                    onChange={(e) => setCompMaxEmployees(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Max Storage Limit (MB)</Label>
                  <Input
                    type="number"
                    className="border-slate-300 h-9 font-bold"
                    value={compMaxStorage}
                    required
                    onChange={(e) => setCompMaxStorage(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Calculator Permissions */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500">Enable/Disable Calculator Modules</Label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {Object.keys(compCalculators).map((calc) => (
                    <label
                      key={calc}
                      className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={compCalculators[calc] !== false}
                        onChange={(e) => setCompCalculators(prev => ({ ...prev, [calc]: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="capitalize font-bold text-slate-700">{calc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-sm"
                >
                  {editCompany ? "Apply Limitations" : "Provision Company"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {/* GENERATE KEY MODAL DIALOG */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm border-slate-200 shadow-2xl bg-white overflow-hidden">
            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Generate Registration Key</CardTitle>
                <CardDescription className="text-[10px]">Create an active signup key allocated to a specific company name.</CardDescription>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleKeySubmit} className="p-5 space-y-4 text-xs">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Company Name</Label>
                  <Input
                    placeholder="e.g. Acme Builders"
                    className="border-slate-300 h-9 font-bold"
                    value={keyCompany}
                    required
                    onChange={(e) => setKeyCompany(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Subscription Key Code (10 characters)</Label>
                  <div className="flex gap-2">
                    <Input
                      maxLength={10}
                      placeholder="e.g. ACME#98234"
                      className="border-slate-300 h-9 font-mono font-bold text-slate-800"
                      value={keyVal}
                      required
                      onChange={(e) => setKeyVal(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={handleAutoGenerateKey}
                      className="bg-indigo-600 text-white font-bold h-9 text-[11px] px-2.5"
                    >
                      Generate
                    </Button>
                  </div>
                  <span className="text-[9px] text-slate-400 leading-normal">
                    Code must contain letters, numbers, and symbols to form exactly 10 characters.
                  </span>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Subscription Tier Plan</Label>
                  <select
                    className="h-9 w-full rounded border border-slate-300 bg-white px-2"
                    value={keyPlan}
                    onChange={(e) => setKeyPlan(e.target.value)}
                  >
                    <option value="trial">Free Trial</option>
                    <option value="monthly">Monthly Subscription Plan</option>
                    <option value="yearly">Yearly Subscription Plan</option>
                    <option value="lifetime">Lifetime Access Plan</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 font-semibold">Validity (Days)</Label>
                  <Input
                    type="number"
                    className="border-slate-300 h-9 font-bold"
                    value={keyDuration}
                    required
                    onChange={(e) => setKeyDuration(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={keyVal.length !== 10}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Create Key
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );

  function setModeAndClear(t: AdminTab) {
    setActiveTab(t);
    setErrorMsg("");
    setSuccessMsg("");
  }
}

function Metric({ title, value, cardColor = "" }: { title: string; value: string; cardColor?: string }) {
  return (
    <Card className={`border-slate-200 shadow-sm overflow-hidden bg-white ${cardColor}`}>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{title}</div>
        <div className="mt-1.5 text-base font-extrabold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  );
}
