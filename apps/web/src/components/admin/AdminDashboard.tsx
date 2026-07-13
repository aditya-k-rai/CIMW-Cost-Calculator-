"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Building,
  Users,
  User as UserIcon,
  Folder,
  FileText,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  FileDown,
  RefreshCw,
  Search,
  Key,
  ArrowLeft,
  Activity,
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminTab = "keys" | "companies";

export function AdminDashboard({ defaultTab = "keys" }: { defaultTab?: string }) {
  const { user: loggedInUser, logout } = useAuth();
  
  // Datastore states
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptionKeys, setSubscriptionKeys] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Navigation: Keys or Companies
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab === "companies" ? "companies" : "keys");
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [isEditKeyModalOpen, setIsEditKeyModalOpen] = useState(false);

  // Selections
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<any>(null);

  // Edit Company fields
  const [editCompName, setEditCompName] = useState("");
  const [editCompOwner, setEditCompOwner] = useState("");
  const [editCompEmail, setEditCompEmail] = useState("");
  const [editCompPhone, setEditCompPhone] = useState("");
  const [editCompStatus, setEditCompStatus] = useState("active");
  const [editCompMaxEmployees, setEditCompMaxEmployees] = useState(20);
  const [editCompCalcs, setEditCompCalcs] = useState({
    construction: true,
    interior: true,
    kitchen: true,
    wardrobe: true
  });

  // Edit Subscription fields
  const [subStartDate, setSubStartDate] = useState("");
  const [subExpiryDate, setSubExpiryDate] = useState("");
  const [subStatus, setSubStatus] = useState("active");
  const [subPlan, setSubPlan] = useState("starter");

  // Create Key fields
  const [newKeyCode, setNewKeyCode] = useState("");
  const [newKeyCompanyName, setNewKeyCompanyName] = useState("");
  const [newKeyDurationDays, setNewKeyDurationDays] = useState(30);
  const [newKeyPlan, setNewKeyPlan] = useState("starter");

  // Edit Key fields
  const [editKeyCompanyName, setEditKeyCompanyName] = useState("");
  const [editKeyExpiryDate, setEditKeyExpiryDate] = useState("");
  const [editKeyExpiryTime, setEditKeyExpiryTime] = useState("");
  const [editKeyStatus, setEditKeyStatus] = useState("active");

  const fetchData = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setSyncing(true);
    try {
      const [compsRes, usersRes, keysRes, projectsRes, quotesRes] = await Promise.all([
        api.auth.getAllCompanies(),
        api.auth.getAllUsers(),
        api.auth.getAllSubscriptionKeys(),
        api.projects.get(),
        api.quotes.get()
      ]);

      setCompanies(compsRes || []);
      setUsers(usersRes || []);
      setSubscriptionKeys(keysRes || []);
      setProjects(projectsRes || []);
      setQuotes(quotesRes || []);
      setErrorMsg("");
    } catch (err: any) {
      console.error("Fetch dashboard datastore logs error:", err);
      setErrorMsg(err.message || "Connection error to database.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveTab(defaultTab === "companies" ? "companies" : "keys");
    setSelectedCompanyForDetails(null);
  }, [defaultTab]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getPlanLabel = (plan: string) => {
    const plansMap: Record<string, string> = {
      starter: "Starter Plan",
      professional: "Professional Plan",
      enterprise: "Enterprise Plan",
      custom: "Custom Plan",
      trial: "Free Trial"
    };
    return plansMap[plan] || plan || "Starter Plan";
  };

  // Memoized query lists
  const filteredKeys = useMemo(() => {
    return subscriptionKeys.filter((k) => {
      const matchesSearch = k.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            k.keyCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            k.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || k.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptionKeys, searchQuery, filterStatus]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, filterStatus]);

  // Operations: Generate/Edit Keys
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.createSubscriptionKey({
        keyId: newKeyCode || undefined,
        companyName: newKeyCompanyName,
        plan: newKeyPlan,
        durationDays: newKeyDurationDays,
        createdBy: loggedInUser?.name || "Admin"
      });
      setNewKeyCode("");
      setNewKeyCompanyName("");
      setNewKeyDurationDays(30);
      setIsCreateKeyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert("Failed to generate key: " + err.message);
    }
  };

  const handleEditKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey) return;
    try {
      await api.auth.updateSubscriptionKey(selectedKey.id, {
        companyName: editKeyCompanyName,
        expiryDate: editKeyExpiryDate,
        expiryTime: editKeyExpiryTime,
        status: editKeyStatus
      });
      setIsEditKeyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert("Failed to save key: " + err.message);
    }
  };

  const handleAdjustKeyExpiry = async (key: any, days: number) => {
    const currentExp = key.expiryDate ? new Date(`${key.expiryDate}T${key.expiryTime || "23:59:59"}`) : new Date();
    const newExp = new Date(currentExp.getTime() + days * 24 * 60 * 60 * 1000);
    try {
      await api.auth.updateSubscriptionKey(key.id, {
        expiryDate: newExp.toISOString().split("T")[0],
        expiryTime: newExp.toTimeString().split(" ")[0]
      });
      await fetchData();
    } catch (err: any) {
      alert("Failed to adjust key expiry: " + err.message);
    }
  };

  const handleAdjustSubscription = async (comp: any, days: number) => {
    const currentExpiry = comp.subscription?.expiryDate ? new Date(comp.subscription.expiryDate) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    try {
      await api.auth.updateCompany(comp.id, {
        subscription: {
          ...(comp.subscription || {}),
          expiryDate: newExpiry.toISOString()
        }
      });
      await fetchData();
      if (selectedCompanyForDetails && selectedCompanyForDetails.id === comp.id) {
        const updatedComp = companies.find((c) => c.id === comp.id);
        if (updatedComp) setSelectedCompanyForDetails(updatedComp);
      }
    } catch (err: any) {
      alert("Failed to adjust subscription timeline: " + err.message);
    }
  };

  const handleUpdateKeyStatus = async (key: any, targetStatus: string) => {
    try {
      await api.auth.updateSubscriptionKey(key.id, { status: targetStatus });
      await fetchData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Delete this invitation key?")) return;
    try {
      await api.auth.deleteSubscriptionKey(keyId);
      await fetchData();
    } catch (err: any) {
      alert("Failed to delete key: " + err.message);
    }
  };

  // Operations: Edit Company info/limits/calculators
  const handleEditCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await api.auth.updateCompany(selectedCompany.id, {
        name: editCompName,
        status: editCompStatus,
        limits: {
          ...selectedCompany.limits,
          maxEmployees: editCompMaxEmployees
        },
        calculatorsEnabled: {
          construction: editCompCalcs.construction,
          doors: editCompCalcs.interior, // doors is interior calculator internally
          kitchen: editCompCalcs.kitchen,
          wardrobe: editCompCalcs.wardrobe
        }
      });
      setIsEditCompanyModalOpen(false);
      await fetchData();
      if (selectedCompanyForDetails && selectedCompanyForDetails.id === selectedCompany.id) {
        const updatedComp = companies.find((c) => c.id === selectedCompany.id);
        if (updatedComp) setSelectedCompanyForDetails(updatedComp);
      }
    } catch (err: any) {
      alert("Failed to update company: " + err.message);
    }
  };

  const handleEditSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await api.auth.updateCompany(selectedCompany.id, {
        subscription: {
          ...selectedCompany.subscription,
          plan: subPlan,
          startDate: subStartDate ? new Date(subStartDate).toISOString() : new Date().toISOString(),
          expiryDate: subExpiryDate ? new Date(subExpiryDate).toISOString() : new Date().toISOString(),
          status: subStatus
        }
      });
      setIsSubscriptionModalOpen(false);
      await fetchData();
      if (selectedCompanyForDetails && selectedCompanyForDetails.id === selectedCompany.id) {
        const updatedComp = companies.find((c) => c.id === selectedCompany.id);
        if (updatedComp) setSelectedCompanyForDetails(updatedComp);
      }
    } catch (err: any) {
      alert("Failed to update subscription: " + err.message);
    }
  };

  const handleUpdateCompanyStatus = async (comp: any, targetStatus: string) => {
    try {
      await api.auth.updateCompany(comp.id, { status: targetStatus });
      await fetchData();
      if (selectedCompanyForDetails && selectedCompanyForDetails.id === comp.id) {
        const updatedComp = companies.find((c) => c.id === comp.id);
        if (updatedComp) setSelectedCompanyForDetails(updatedComp);
      }
    } catch (err: any) {
      alert("Failed to change company status: " + err.message);
    }
  };

  // PDF Download
  const downloadQuotePDF = (quote: any) => {
    const doc = new jsPDF();
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CIMW ESTIMATE QUOTATION", 14, 25);
    
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.text("Admin System Generated Export Document", 14, 32);

    doc.setTextColor(50);
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("ESTIMATE META PARAMETERS", 14, 55);
    
    const metaData = [
      ["Reference Code", quote.id || "N/A"],
      ["Date Generated", quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString()],
      ["Calculator Model", quote.calculatorUsed || "N/A"],
      ["Status", (quote.status || "approved").toUpperCase()]
    ];
    
    (doc as any).autoTable({
      startY: 60,
      body: metaData,
      theme: "plain",
      styles: { cellPadding: 2, fontSize: 9 }
    });

    const clientY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CUSTOMER & TENANT INFORMATION", 14, clientY);

    const clientData = [
      ["Client Name", quote.customerName || "N/A"],
      ["Client Phone", quote.customerPhone || "N/A"],
      ["Client Email", quote.customerEmail || "N/A"],
      ["Address Location", quote.customerLocation || "N/A"],
      ["Project Target", quote.projectName || "General Workspace"]
    ];

    (doc as any).autoTable({
      startY: clientY + 5,
      body: clientData,
      theme: "striped",
      styles: { cellPadding: 3, fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`GRAND TOTAL: ${formatCurrency(quote.totalAmount || 0)}`, 14, finalY);

    doc.save(`Quotation_${quote.id}.pdf`);
  };

  // Modals openers
  const openEditCompanyModal = (comp: any) => {
    setSelectedCompany(comp);
    setEditCompName(comp.name || "");
    setEditCompOwner(comp.companyOwner || comp.owner || "");
    setEditCompEmail(comp.email || "");
    setEditCompPhone(comp.phone || "");
    setEditCompStatus(comp.status || "active");
    setEditCompMaxEmployees(comp.limits?.maxEmployees ?? 20);
    setEditCompCalcs({
      construction: comp.calculatorsEnabled?.construction !== false,
      interior: comp.calculatorsEnabled?.doors !== false,
      kitchen: comp.calculatorsEnabled?.kitchen !== false,
      wardrobe: comp.calculatorsEnabled?.wardrobe !== false
    });
    setIsEditCompanyModalOpen(true);
  };

  const openSubscriptionModal = (comp: any) => {
    setSelectedCompany(comp);
    setSubStartDate(comp.subscription?.startDate ? comp.subscription.startDate.split("T")[0] : "");
    setSubExpiryDate(comp.subscription?.expiryDate ? comp.subscription.expiryDate.split("T")[0] : "");
    setSubStatus(comp.subscription?.status || "active");
    setSubPlan(comp.subscription?.plan || "starter");
    setIsSubscriptionModalOpen(true);
  };

  const openEditKeyModal = (key: any) => {
    setSelectedKey(key);
    setEditKeyCompanyName(key.companyName || "");
    setEditKeyExpiryDate(key.expiryDate || "");
    setEditKeyExpiryTime(key.expiryTime || "");
    setEditKeyStatus(key.status || "active");
    setIsEditKeyModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-slate-500">Loading master admin datastore...</span>
        </div>
      </div>
    );
  }

  // --- COMPANY DETAILS VIEW (SUB-PAGE) ---
  if (selectedCompanyForDetails) {
    const comp = selectedCompanyForDetails;
    
    // 1. Employees belonging to this company
    const compEmployees = users.filter((u) => u.role === "employee" && u.companyId === comp.id);
    
    // 2. Projects belonging to this company
    const compProjects = projects.filter((p) => p.companyId === comp.id);
    
    // 3. Quotations belonging to this company
    const compQuotes = quotes.filter((q) => q.companyId === comp.id || q.createdByUserId === comp.id);
    
    // 4. Unique customers belonging to this company
    const compCustomers = Array.from(new Set([
      ...users.filter((u) => u.role === "customer" && u.companyId === comp.id).map((u) => u.email),
      ...compQuotes.map((q) => q.customerEmail),
      ...compProjects.map((p) => p.customerDetails?.email)
    ].filter(Boolean))).map((email) => {
      const u = users.find((usr) => usr.email === email && usr.companyId === comp.id) || 
                users.find((usr) => usr.email === email);
      const qCount = compQuotes.filter((q) => q.customerEmail === email).length;
      const pCount = compProjects.filter((p) => p.customerDetails?.email === email).length;
      return {
        id: u?.id || `cust-${email}`,
        name: u?.name || compQuotes.find((q) => q.customerEmail === email)?.customerName || "Client Name",
        email,
        phone: u?.phone || compQuotes.find((q) => q.customerEmail === email)?.customerPhone || "N/A",
        projectsCount: pCount,
        quotesCount: qCount
      };
    });

    return (
      <div className="space-y-8 text-slate-800 pb-16">
        
        {/* Detail Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCompanyForDetails(null)}
            className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase">
              {comp.name} Details
            </h1>
            <p className="text-xs text-slate-400 font-bold">Company ID: {comp.id}</p>
          </div>
        </div>

        {/* 1. COMPANY INFORMATION & CONTROLS CONTAINER */}
        <div className="grid gap-6 md:grid-cols-3">
          
          <Card className="border-slate-200 shadow-sm md:col-span-2">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase text-slate-500">Company Information</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={() => openEditCompanyModal(comp)}>
                  Edit Info
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={() => openSubscriptionModal(comp)}>
                  Edit Subscription
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Company Name</span>
                <span className="font-bold text-slate-900">{comp.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Company ID</span>
                <span className="font-bold text-slate-900 font-mono text-[11px]">{comp.id}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Owner</span>
                <span className="font-bold text-slate-900">{comp.companyOwner || comp.owner || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Email</span>
                <span className="font-bold text-slate-900">{comp.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Phone</span>
                <span className="font-bold text-slate-900">{comp.phone || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Registration Date</span>
                <span className="font-bold text-slate-900">{comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Invitation Key Used</span>
                <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10.5px]">
                  {comp.keyId || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Subscription Type</span>
                <span className="font-bold text-slate-900">{getPlanLabel(comp.subscription?.plan)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Subscription Expiry</span>
                <span className="font-bold text-slate-900">{comp.subscription?.expiryDate ? new Date(comp.subscription.expiryDate).toLocaleDateString() : "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Company Status</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[9.5px] font-black uppercase mt-1 ${
                  comp.status === "active" ? "bg-emerald-100 text-emerald-800" :
                  comp.status === "suspended" ? "bg-amber-100 text-amber-800" :
                  "bg-rose-100 text-rose-800"
                }`}>
                  {comp.status || "active"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. COMPANY CONTROLS & LIMITS CARD */}
          <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
              <CardTitle className="text-xs font-black uppercase text-slate-500">Company Controls & Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs flex-1 flex flex-col justify-between">
              
              {/* Manual Enable/Disable/Suspend Actions */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1 mb-2">Status Actions</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 font-bold text-emerald-700 border-emerald-200" onClick={() => handleUpdateCompanyStatus(comp, "active")}>
                    Reactivate / Enable
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 font-bold text-amber-700 border-amber-200" onClick={() => handleUpdateCompanyStatus(comp, "suspended")}>
                    Suspend Company
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 font-bold text-rose-700 border-rose-200 col-span-2" onClick={() => handleUpdateCompanyStatus(comp, "disabled")}>
                    Disable Company
                  </Button>
                </div>
              </div>

              {/* Calculator toggles summary */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1 mb-2">Calculators Access</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    {comp.calculatorsEnabled?.construction !== false ? <Check className="h-3.5 w-3.5 text-emerald-600 font-black" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                    <span>Construction</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {comp.calculatorsEnabled?.doors !== false ? <Check className="h-3.5 w-3.5 text-emerald-600 font-black" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                    <span>Interior</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {comp.calculatorsEnabled?.kitchen !== false ? <Check className="h-3.5 w-3.5 text-emerald-600 font-black" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                    <span>Kitchen</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {comp.calculatorsEnabled?.wardrobe !== false ? <Check className="h-3.5 w-3.5 text-emerald-600 font-black" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                    <span>Wardrobe</span>
                  </div>
                </div>
              </div>

              {/* Employee Slot limits info */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1 mb-1.5">Employee Slots Info</span>
                <div className="grid grid-cols-3 text-center gap-1 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Allowed</span>
                    <span className="font-black text-slate-800">{comp.limits?.maxEmployees ?? 20}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Current</span>
                    <span className="font-black text-slate-800">{compEmployees.length}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Slots Left</span>
                    <span className="font-black text-indigo-600">{(comp.limits?.maxEmployees ?? 20) - compEmployees.length}</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* 3. EMPLOYEE SECTION */}
        <div className="space-y-2">
          <h2 className="text-md font-black uppercase text-slate-500 flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-indigo-600" />
            Company Employees List
          </h2>
          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              {compEmployees.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-bold text-xs">No employees found.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Employee Name</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3">Assigned Calculators</th>
                      <th className="px-4 py-3 text-center">Total Quotes</th>
                      <th className="px-4 py-3">Assigned Projects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compEmployees.map((emp) => {
                      const empQuotesCount = quotes.filter((q) => q.employeeId === emp.id || q.createdByUserId === emp.id).length;
                      const empProjectsList = projects.filter((p) => p.assignedEmployeeIds && p.assignedEmployeeIds.includes(emp.id)).map((p) => p.name).join(", ") || "None";
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{emp.name}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{emp.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-600 capitalize">{emp.position || "Staff"}</td>
                          <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                          <td className="px-4 py-3 text-slate-600">{emp.phone || "N/A"}</td>
                          <td className="px-4 py-3">
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">Active</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">{emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : "N/A"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {emp.permissions?.construction !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Construction</span>}
                              {emp.permissions?.doors !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Interior</span>}
                              {emp.permissions?.kitchen !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Kitchen</span>}
                              {emp.permissions?.wardrobe !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Wardrobe</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-indigo-600">{empQuotesCount}</td>
                          <td className="px-4 py-3 text-slate-500 font-semibold truncate max-w-[120px]" title={empProjectsList}>{empProjectsList}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 4. PROJECT SECTION */}
        <div className="space-y-2">
          <h2 className="text-md font-black uppercase text-slate-500 flex items-center gap-2">
            <Folder className="h-4.5 w-4.5 text-indigo-600" />
            Company Projects & Assigned Employees List
          </h2>
          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              {compProjects.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-bold text-xs">No project folders created.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Project Name</th>
                      <th className="px-4 py-3">Project ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Budget</th>
                      <th className="px-4 py-3">Assigned Employees</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created Date</th>
                      <th className="px-4 py-3">Created Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compProjects.map((p) => {
                      const assignedNames = users
                        .filter((u) => p.assignedEmployeeIds && p.assignedEmployeeIds.includes(u.id))
                        .map((u) => u.name)
                        .join(", ") || "None";
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{p.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-600">{p.customerDetails?.name || "Client"}</td>
                          <td className="px-4 py-3 font-black text-indigo-600">{p.budgetAmount ? formatCurrency(p.budgetAmount) : "N/A"}</td>
                          <td className="px-4 py-3 font-semibold text-slate-500 truncate max-w-[120px]" title={assignedNames}>{assignedNames}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              p.status === "closed" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                            }`}>{p.status || "active"}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}</td>
                          <td className="px-4 py-3 text-slate-400 font-semibold">{p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : "N/A"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 5. QUOTATION SECTION */}
        <div className="space-y-2">
          <h2 className="text-md font-black uppercase text-slate-500 flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-indigo-600" />
            Company Quotations List
          </h2>
          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              {compQuotes.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-bold text-xs">No quotations generated.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Quotation Number</th>
                      <th className="px-4 py-3">Project Name</th>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Employee Name</th>
                      <th className="px-4 py-3">Calculator Used</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compQuotes.map((q) => {
                      const creatorName = q.employeeName || users.find((u) => u.id === q.employeeId || u.id === q.createdByUserId)?.name || "Company Owner";
                      return (
                        <tr key={q.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-900 select-all">{q.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-500">{q.projectName || "Unassigned"}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{q.customerName}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{creatorName}</td>
                          <td className="px-4 py-3 capitalize font-bold text-slate-500 text-[10px]">{q.calculatorUsed}</td>
                          <td className="px-4 py-3 text-right font-black text-indigo-600 text-sm">{formatCurrency(q.totalAmount)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">{q.status || "approved"}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">{q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "N/A"}</td>
                          <td className="px-4 py-3 text-slate-400 font-semibold">{q.createdAt ? new Date(q.createdAt).toLocaleTimeString() : "N/A"}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => downloadQuotePDF(q)} className="h-7 text-[10px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                              <FileDown className="h-3 w-3 mr-1" /> PDF
                            </Button>
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

        {/* 6. CUSTOMER SECTION */}
        <div className="space-y-2">
          <h2 className="text-md font-black uppercase text-slate-500 flex items-center gap-2">
            <UserIcon className="h-4.5 w-4.5 text-indigo-600" />
            Company Customers List
          </h2>
          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              {compCustomers.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-bold text-xs">No customers database logs.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Customer ID</th>
                      <th className="px-4 py-3">Phone Number</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3 text-center">Total Projects</th>
                      <th className="px-4 py-3 text-center">Total Quotations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compCustomers.map((cust, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{cust.name}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{cust.id}</td>
                        <td className="px-4 py-3 text-slate-600">{cust.phone}</td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">{cust.email}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{cust.projectsCount}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">{cust.quotesCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    );
  }

  // --- GENERAL TAB VIEWS ---
  return (
    <div className="space-y-6 text-slate-800 pb-16">
      
      {/* Top Sync Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            Super Admin Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-semibold border-l-2 border-indigo-600 pl-2">
            Hierarchical Control Panel. Generate invitation keys & manage registration entities.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {errorMsg && (
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
              {errorMsg}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={syncing}
            className="h-9 text-xs font-bold border-slate-200 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            Sync Datastore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-9 text-xs font-black text-rose-600 hover:bg-rose-50"
          >
            Log Out
          </Button>
        </div>
      </div>

      {/* Tabs list (following hierarchy: Invitation Keys -> Companies) */}
      <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-xl shadow-sm overflow-x-auto scrollbar-none flex-nowrap whitespace-nowrap max-w-sm">
        {([
          { id: "keys", label: "Invitation Keys", icon: Key },
          { id: "companies", label: "Registered Companies", icon: Building }
        ] as { id: AdminTab; label: string; icon: any }[]).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                setFilterStatus("all");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-6 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-white/40"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH / FILTER SUB-BAR */}
      <div className="flex flex-col sm:flex-row gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder={`Search ${activeTab === "keys" ? "Invitation Keys" : "Registered Companies"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 border-slate-200 text-xs font-medium focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          {activeTab === "keys" ? (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="expired">Expired</option>
              <option value="used">Used</option>
            </select>
          ) : (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
            </select>
          )}
        </div>
      </div>

      {/* --- INVITATION KEYS TAB PANEL --- */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase text-slate-400">Invitation Key Management</h2>
            <Button size="sm" onClick={() => setIsCreateKeyModalOpen(true)} className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <Plus className="h-4 w-4 mr-1.5" /> Generate Invitation Key
            </Button>
          </div>

          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              {filteredKeys.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold text-xs">
                  No Invitation Keys registered.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Key ID</th>
                      <th className="px-4 py-3">Invitation Key Code</th>
                      <th className="px-4 py-3">Created Date/Time</th>
                      <th className="px-4 py-3">Expiry Date/Time</th>
                      <th className="px-4 py-3">Subscription Type</th>
                      <th className="px-4 py-3">Used By Company (Name/ID/RegDate)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredKeys.map((key) => {
                      const linkedComp = companies.find((c) => c.id === key.usedByCompanyId);
                      return (
                        <tr key={key.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-400 select-all">{key.id}</td>
                          <td className="px-4 py-3 font-mono font-black text-[13px] text-indigo-900 tracking-wider select-all">{key.keyCode || key.id}</td>
                          <td className="px-4 py-3 space-y-0.5">
                            <span className="font-bold text-slate-700 block">{key.generatedDate || (key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "N/A")}</span>
                            <span className="text-slate-400 font-semibold block">{key.generatedTime || (key.createdAt ? new Date(key.createdAt).toLocaleTimeString() : "N/A")}</span>
                          </td>
                          <td className="px-4 py-3 space-y-0.5">
                            <span className="font-bold text-slate-700 block">{key.expiryDate || "N/A"}</span>
                            <span className="text-slate-400 font-semibold block">{key.expiryTime || "N/A"}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700">{getPlanLabel(key.plan)}</td>
                          <td className="px-4 py-3">
                            {key.status === "used" ? (
                              <div className="space-y-0.5 text-[11px]">
                                <span className="font-bold text-indigo-700 block">{key.usedByCompanyName || linkedComp?.name || "Client Company"}</span>
                                <span className="text-[9px] font-mono text-slate-400 block">ID: {key.usedByCompanyId}</span>
                                <span className="text-[9px] font-semibold text-slate-400 block">
                                  Reg: {linkedComp?.createdAt ? new Date(linkedComp.createdAt).toLocaleDateString() : (key.updatedAt ? new Date(key.updatedAt).toLocaleDateString() : "N/A")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-medium">Not Used yet (Open Slot)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              key.status === "used" ? "bg-indigo-100 text-indigo-800" :
                              key.status === "expired" ? "bg-rose-100 text-rose-800" :
                              key.status === "disabled" ? "bg-amber-100 text-amber-800" :
                              "bg-emerald-100 text-emerald-800"
                            }`}>
                              {key.status || "active"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                            {key.status !== "used" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditKeyModal(key)}
                                  className="h-7 text-[10px] font-bold border-slate-200 text-slate-700 bg-white"
                                >
                                  Edit Key
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdjustKeyExpiry(key, 30)}
                                  className="h-7 text-[10px] font-black text-indigo-600 border-indigo-200"
                                >
                                  +30d
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdjustKeyExpiry(key, -30)}
                                  className="h-7 text-[10px] font-black text-amber-600 border-amber-200"
                                >
                                  -30d
                                </Button>
                                {key.status === "disabled" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateKeyStatus(key, "active")}
                                    className="h-7 text-[10px] font-black text-emerald-600 border-emerald-200"
                                  >
                                    Activate
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateKeyStatus(key, "disabled")}
                                    className="h-7 text-[10px] font-black text-amber-600 border-amber-200"
                                  >
                                    Disable
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteKey(key.id)}
                              className="h-7 text-[10px] font-black text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      {/* --- REGISTERED COMPANIES TAB PANEL --- */}
      {activeTab === "companies" && (
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            {filteredCompanies.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">
                No registered companies found.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Company ID</th>
                    <th className="px-4 py-3">Invitation Key Used</th>
                    <th className="px-4 py-3">Subscription Type</th>
                    <th className="px-4 py-3">Subscription Expiry</th>
                    <th className="px-4 py-3">Company Status</th>
                    <th className="px-4 py-3 text-center">Employees</th>
                    <th className="px-4 py-3 text-center">Projects</th>
                    <th className="px-4 py-3 text-center">Quotations</th>
                    <th className="px-4 py-3 text-center">Customers</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredCompanies.map((comp) => {
                    const compEmpList = users.filter((u) => u.role === "employee" && u.companyId === comp.id);
                    const compProjList = projects.filter((p) => p.companyId === comp.id);
                    const compQuotesList = quotes.filter((q) => q.companyId === comp.id || q.createdByUserId === comp.id);
                    
                    const compCustCount = Array.from(new Set([
                      ...users.filter((u) => u.role === "customer" && u.companyId === comp.id).map((u) => u.email),
                      ...compQuotesList.map((q) => q.customerEmail),
                      ...compProjList.map((p) => p.customerDetails?.email)
                    ].filter(Boolean))).length;

                    return (
                      <tr key={comp.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900 text-[13px]">{comp.name}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{comp.id}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                            {comp.keyId || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{getPlanLabel(comp.subscription?.plan)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">
                          {comp.subscription?.expiryDate ? new Date(comp.subscription.expiryDate).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            comp.status === "active" ? "bg-emerald-100 text-emerald-800" :
                            comp.status === "suspended" ? "bg-amber-100 text-amber-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {comp.status || "active"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{compEmpList.length}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{compProjList.length}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">{compQuotesList.length}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{compCustCount}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCompanyForDetails(comp)}
                            className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================== MODALS PANEL DEFINITIONS ===================== */}

      {/* Modal: Create invitation key */}
      {isCreateKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Generate Company Invitation Key</h3>
              <button onClick={() => setIsCreateKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Invitation Key ID (Optional, 10 characters)</Label>
                <Input value={newKeyCode} onChange={(e) => setNewKeyCode(e.target.value)} maxLength={10} placeholder="e.g. CIMW#72897" className="h-9 border-slate-200 font-mono tracking-widest text-center" />
                <span className="text-[9px] text-slate-400 italic">Leave empty to auto-generate prefix + # + numbers.</span>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Company Name Assignment (Optional before signup)</Label>
                <Input value={newKeyCompanyName} onChange={(e) => setNewKeyCompanyName(e.target.value)} placeholder="e.g. Ats Interior" className="h-9 border-slate-200" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Subscription Type</Label>
                  <select value={newKeyPlan} onChange={(e) => setNewKeyPlan(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 font-bold text-slate-700">
                    <option value="starter">Starter Plan</option>
                    <option value="professional">Professional Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                    <option value="custom">Custom Plan</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Expiry Duration (Days)</Label>
                  <Input type="number" value={newKeyDurationDays} onChange={(e) => setNewKeyDurationDays(parseInt(e.target.value) || 30)} required className="h-9 border-slate-200" />
                </div>
              </div>

              <Button type="submit" className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Generate Invitation Key</Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit invitation key */}
      {isEditKeyModalOpen && selectedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Edit Invitation Key: {selectedKey.id}</h3>
              <button onClick={() => setIsEditKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditKeySubmit} className="space-y-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Company Name Assignment</Label>
                <Input value={editKeyCompanyName} onChange={(e) => setEditKeyCompanyName(e.target.value)} className="h-9 border-slate-200" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Expiry Date</Label>
                  <Input type="date" value={editKeyExpiryDate} onChange={(e) => setEditKeyExpiryDate(e.target.value)} required className="h-9 border-slate-200" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Expiry Time</Label>
                  <Input type="time" value={editKeyExpiryTime} onChange={(e) => setEditKeyExpiryTime(e.target.value)} required className="h-9 border-slate-200" />
                </div>
              </div>

              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Key Status</Label>
                <select value={editKeyStatus} onChange={(e) => setEditKeyStatus(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 font-bold text-slate-700">
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="expired">Expired</option>
                  <option value="used">Used</option>
                </select>
              </div>

              <Button type="submit" className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Save Key Changes</Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Company */}
      {isEditCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Edit Company Settings</h3>
              <button onClick={() => setIsEditCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditCompanySubmit} className="space-y-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Company Name</Label>
                <Input value={editCompName} onChange={(e) => setEditCompName(e.target.value)} required className="h-9 border-slate-200" />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Owner</Label>
                <Input value={editCompOwner} onChange={(e) => setEditCompOwner(e.target.value)} className="h-9 border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Email</Label>
                  <Input value={editCompEmail} disabled className="h-9 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Phone</Label>
                  <Input value={editCompPhone} onChange={(e) => setEditCompPhone(e.target.value)} className="h-9 border-slate-200" />
                </div>
              </div>

              {/* Employee Limit control */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1">Employee Limit Management</span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Maximum Employees Allowed</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-7 w-7 text-xs font-black p-0" onClick={() => setEditCompMaxEmployees(Math.max(1, editCompMaxEmployees - 1))}>-</Button>
                    <span className="font-bold text-sm text-slate-800 w-8 text-center">{editCompMaxEmployees}</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 w-7 text-xs font-black p-0" onClick={() => setEditCompMaxEmployees(editCompMaxEmployees + 1)}>+</Button>
                  </div>
                </div>
              </div>

              {/* Calculator Toggles */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1">Calculator Allocation</span>
                <div className="grid grid-cols-2 gap-3 pt-1.5 font-semibold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editCompCalcs.construction} onChange={(e) => setEditCompCalcs({ ...editCompCalcs, construction: e.target.checked })} className="rounded border-slate-300 text-indigo-600 h-4 w-4" />
                    <span>Construction</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editCompCalcs.interior} onChange={(e) => setEditCompCalcs({ ...editCompCalcs, interior: e.target.checked })} className="rounded border-slate-300 text-indigo-600 h-4 w-4" />
                    <span>Interior</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editCompCalcs.kitchen} onChange={(e) => setEditCompCalcs({ ...editCompCalcs, kitchen: e.target.checked })} className="rounded border-slate-300 text-indigo-600 h-4 w-4" />
                    <span>Modular Kitchen</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editCompCalcs.wardrobe} onChange={(e) => setEditCompCalcs({ ...editCompCalcs, wardrobe: e.target.checked })} className="rounded border-slate-300 text-indigo-600 h-4 w-4" />
                    <span>Wardrobe</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 h-9 border-slate-200" onClick={() => setIsEditCompanyModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Save Settings</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Subscription */}
      {isSubscriptionModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Company Subscription: {selectedCompany.name}</h3>
              <button onClick={() => setIsSubscriptionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditSubscriptionSubmit} className="space-y-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Subscription Type</Label>
                <select value={subPlan} onChange={(e) => setSubPlan(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 font-bold text-slate-700">
                  <option value="starter">Starter Plan</option>
                  <option value="professional">Professional Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                  <option value="custom">Custom Plan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Start Date</Label>
                  <Input type="date" value={subStartDate} onChange={(e) => setSubStartDate(e.target.value)} required className="h-9 border-slate-200" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Expiry Date</Label>
                  <Input type="date" value={subExpiryDate} onChange={(e) => setSubExpiryDate(e.target.value)} required className="h-9 border-slate-200" />
                </div>
              </div>

              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Subscription Status</Label>
                <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 font-bold text-slate-700">
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1">Quick Duration Extensions</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 h-8 font-black text-indigo-600" onClick={() => handleAdjustSubscription(selectedCompany, 30)}>
                    +30 Days
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1 h-8 font-black text-amber-600" onClick={() => handleAdjustSubscription(selectedCompany, -30)}>
                    -30 Days
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Save Timeline</Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
