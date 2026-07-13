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
  Filter,
  Lock,
  ChevronRight,
  TrendingUp,
  Calendar,
  Key,
  ArrowLeft,
  Ban,
  Activity,
  Check,
  Slash
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminTab = "overview" | "companies" | "keys" | "employees" | "projects" | "quotations" | "customers";

export function AdminDashboard({ defaultTab = "overview" }: { defaultTab?: string }) {
  const { user: loggedInUser, logout } = useAuth();
  
  // Real database states
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptionKeys, setSubscriptionKeys] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Views & Tab state
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab as AdminTab);
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<any>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals Open state
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [isEditKeyModalOpen, setIsEditKeyModalOpen] = useState(false);

  // Active item selections for edit
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<any>(null);

  // Company Edit Form States
  const [editCompName, setEditCompName] = useState("");
  const [editCompOwner, setEditCompOwner] = useState("");
  const [editCompEmail, setEditCompEmail] = useState("");
  const [editCompPhone, setEditCompPhone] = useState("");
  const [editCompAddress, setEditCompAddress] = useState("");
  const [editCompStatus, setEditCompStatus] = useState("active");
  const [editCompMaxEmployees, setEditCompMaxEmployees] = useState(20);
  const [editCompCalcs, setEditCompCalcs] = useState({
    construction: true,
    interior: true,
    kitchen: true,
    wardrobe: true
  });

  // Subscription Form States
  const [subStartDate, setSubStartDate] = useState("");
  const [subExpiryDate, setSubExpiryDate] = useState("");
  const [subStatus, setSubStatus] = useState("active");
  const [subPlan, setSubPlan] = useState("trial");

  // Key Form States
  const [newKeyCode, setNewKeyCode] = useState("");
  const [newKeyCompanyName, setNewKeyCompanyName] = useState("");
  const [newKeyDurationDays, setNewKeyDurationDays] = useState(30);
  const [newKeyPlan, setNewKeyPlan] = useState("trial");
  
  const [editKeyCompanyName, setEditKeyCompanyName] = useState("");
  const [editKeyExpiryDate, setEditKeyExpiryDate] = useState("");
  const [editKeyExpiryTime, setEditKeyExpiryTime] = useState("");
  const [editKeyStatus, setEditKeyStatus] = useState("active");

  // Fetch all dashboard data
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
      console.error("Dashboard fetch error:", err);
      setErrorMsg(err.message || "Failed to sync database logs.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveTab(defaultTab as AdminTab);
    setSelectedCompanyForDetails(null);
  }, [defaultTab]);

  // Clean format helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Memoized overall system metrics
  const stats = useMemo(() => {
    const totalCompanies = companies.length;
    const totalEmployees = users.filter((u) => u.role === "employee").length;
    const totalCustomers = Array.from(new Set([
      ...users.filter((u) => u.role === "customer").map((u) => u.email),
      ...quotes.map((q) => q.customerEmail),
      ...projects.map((p) => p.customerDetails?.email)
    ].filter(Boolean))).length;

    const totalProjectsCount = projects.length;
    const totalQuotationsCount = quotes.length;

    const sortedQ = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastQuotation = sortedQ[0] || null;

    const sortedP = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastProject = sortedP[0] || null;

    // Recently Active Companies count (companies active or created in the past 7 days)
    const recentlyActiveCompaniesCount = companies.filter((c) => {
      if (!c.updatedAt) return false;
      const diffTime = Math.abs(Date.now() - new Date(c.updatedAt).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length;

    return {
      totalCompanies,
      totalEmployees,
      totalCustomers,
      totalProjectsCount,
      totalQuotationsCount,
      lastQuotation,
      lastProject,
      recentlyActiveCompaniesCount
    };
  }, [companies, users, projects, quotes]);

  // Company list search and filter logic
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || c.status === filterStatus || c.subscription?.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, filterStatus]);

  // Key list search and filter logic
  const filteredKeys = useMemo(() => {
    return subscriptionKeys.filter((k) => {
      const matchesSearch = k.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            k.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || k.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptionKeys, searchQuery, filterStatus]);

  // General employees list
  const filteredEmployees = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== "employee") return false;
      const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = filterCompany === "all" || u.companyId === filterCompany;
      return matchesSearch && matchesCompany;
    });
  }, [users, searchQuery, filterCompany]);

  // General projects list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.customerDetails?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = filterCompany === "all" || p.companyId === filterCompany;
      return matchesSearch && matchesCompany;
    });
  }, [projects, searchQuery, filterCompany]);

  // General quotes list
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch = q.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            q.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            q.calculatorUsed?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [quotes, searchQuery]);

  // General unique customer list
  const filteredCustomers = useMemo(() => {
    const unique = new Map<string, any>();
    users.filter((u) => u.role === "customer").forEach((c) => unique.set(c.email, c));
    quotes.forEach((q) => {
      if (q.customerEmail && !unique.has(q.customerEmail)) {
        unique.set(q.customerEmail, {
          id: q.customerId || `cust-${q.customerEmail}`,
          name: q.customerName,
          email: q.customerEmail,
          phone: q.customerPhone,
          companyId: q.companyId || ""
        });
      }
    });
    return Array.from(unique.values()).filter((cust) => {
      return cust.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             cust.email?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [users, quotes, searchQuery]);

  // --- KEY OPERATIONS ---
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
      alert("Failed to create key: " + err.message);
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
      alert("Failed to update key: " + err.message);
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

  const handleUpdateKeyStatus = async (key: any, targetStatus: string) => {
    try {
      await api.auth.updateSubscriptionKey(key.id, { status: targetStatus });
      await fetchData();
    } catch (err: any) {
      alert("Failed to update key status: " + err.message);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this Invitation Key?")) return;
    try {
      await api.auth.deleteSubscriptionKey(keyId);
      await fetchData();
    } catch (err: any) {
      alert("Failed to delete key: " + err.message);
    }
  };

  // --- COMPANY & SUBSCRIPTION OPERATIONS ---
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
          doors: editCompCalcs.interior, // internally mapped to doors
          kitchen: editCompCalcs.kitchen,
          wardrobe: editCompCalcs.wardrobe
        }
      });
      setIsEditCompanyModalOpen(false);
      await fetchData();
      if (selectedCompanyForDetails && selectedCompanyForDetails.id === selectedCompany.id) {
        // refresh details sub-view
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

  const handleUpdateCompanyStatus = async (comp: any, targetStatus: string) => {
    try {
      await api.auth.updateCompany(comp.id, { status: targetStatus });
      await fetchData();
      if (selectedCompanyForDetails && selectedCompanyForDetails.id === comp.id) {
        const updatedComp = companies.find((c) => c.id === comp.id);
        if (updatedComp) setSelectedCompanyForDetails(updatedComp);
      }
    } catch (err: any) {
      alert("Failed to update company status: " + err.message);
    }
  };

  const handleUpdateSubscriptionStatus = async (comp: any, status: string) => {
    try {
      await api.auth.updateCompany(comp.id, {
        subscription: {
          ...(comp.subscription || {}),
          status
        }
      });
      await fetchData();
      if (selectedCompanyForDetails && selectedCompanyForDetails.id === comp.id) {
        const updatedComp = companies.find((c) => c.id === comp.id);
        if (updatedComp) setSelectedCompanyForDetails(updatedComp);
      }
    } catch (err: any) {
      alert("Failed to update subscription status: " + err.message);
    }
  };

  // Helper matching company names
  const getCompanyName = (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    return comp ? comp.name : "Direct Tenant";
  };

  // PDF Export
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
    doc.text("System generated summary sheet via Admin Console", 14, 32);

    doc.setTextColor(50);
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("QUOTATION METADATA", 14, 55);
    
    const metaData = [
      ["Quote Reference Code", quote.id || "N/A"],
      ["Date Generated", quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString()],
      ["Calculator Used", quote.calculatorUsed || "N/A"],
      ["Estimation Status", (quote.status || "draft").toUpperCase()]
    ];
    
    (doc as any).autoTable({
      startY: 60,
      body: metaData,
      theme: "plain",
      styles: { cellPadding: 2, fontSize: 9 }
    });

    const relationY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CLIENT & ASSOCIATED TENANT DETAILS", 14, relationY);

    const clientData = [
      ["Client Name", quote.customerName || "N/A"],
      ["Client Phone", quote.customerPhone || "N/A"],
      ["Client Email", quote.customerEmail || "N/A"],
      ["Delivery Address / City", quote.customerLocation || "N/A"],
      ["Linked Project", quote.projectName || "Unassigned Project"]
    ];

    (doc as any).autoTable({
      startY: relationY + 5,
      body: clientData,
      theme: "striped",
      styles: { cellPadding: 3, fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`GRAND ESTIMATED BUDGET: ${formatCurrency(quote.totalAmount || 0)}`, 14, finalY);

    doc.save(`Quotation_${quote.customerName ? quote.customerName.replace(/\s+/g, "_") : "Reference"}.pdf`);
  };

  // View Modals utilities
  const openEditCompanyModal = (comp: any) => {
    setSelectedCompany(comp);
    setEditCompName(comp.name || "");
    setEditCompOwner(comp.companyOwner || comp.owner || "");
    setEditCompEmail(comp.email || "");
    setEditCompPhone(comp.phone || "");
    setEditCompAddress(comp.address || "");
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
    setSubPlan(comp.subscription?.plan || "trial");
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

  // Helper calculating employee parameters
  const getCompanyEmployeesData = (companyId: string) => {
    const companyEmployees = users.filter((u) => u.role === "employee" && u.companyId === companyId);
    return {
      list: companyEmployees,
      count: companyEmployees.length
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-slate-500">Loading master controls database...</span>
        </div>
      </div>
    );
  }

  // --- COMPANY DETAILS VIEW (SUB-PAGE) ---
  if (selectedCompanyForDetails) {
    const comp = selectedCompanyForDetails;
    const compEmp = getCompanyEmployeesData(comp.id);
    const compProj = projects.filter((p) => p.companyId === comp.id);
    const compQuote = quotes.filter((q) => q.companyId === comp.id || q.createdByUserId === comp.id);
    
    // Customers linked to this company
    const compCust = Array.from(new Set([
      ...users.filter((u) => u.role === "customer" && u.companyId === comp.id).map((u) => u.email),
      ...compQuote.map((q) => q.customerEmail),
      ...compProj.map((p) => p.customerDetails?.email)
    ].filter(Boolean))).map((email) => {
      const u = users.find((usr) => usr.email === email && usr.companyId === comp.id) || 
                users.find((usr) => usr.email === email);
      const qCount = compQuote.filter((q) => q.customerEmail === email).length;
      const pCount = compProj.filter((p) => p.customerDetails?.email === email).length;
      return {
        id: u?.id || `cust-${email}`,
        name: u?.name || compQuote.find((q) => q.customerEmail === email)?.customerName || "Client",
        email,
        phone: u?.phone || compQuote.find((q) => q.customerEmail === email)?.customerPhone || "N/A",
        projectsCount: pCount,
        quotesCount: qCount
      };
    });

    return (
      <div className="space-y-6 text-slate-800 pb-16">
        
        {/* Header with Back Button */}
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
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              {comp.name} Details
            </h1>
            <p className="text-xs text-slate-400 font-bold">Company ID: {comp.id}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Main Info Card */}
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
                <span className="text-slate-400 font-semibold block">Owner Name</span>
                <span className="font-bold text-slate-900">{comp.companyOwner || comp.owner || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Billing Email</span>
                <span className="font-bold text-slate-900">{comp.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Phone Number</span>
                <span className="font-bold text-slate-900">{comp.phone || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Registration Date</span>
                <span className="font-bold text-slate-900">{comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Invitation Key ID Used</span>
                <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{comp.keyId || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Subscription Status</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${
                  comp.subscription?.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}>
                  {comp.subscription?.status || "inactive"} (Plan: {comp.subscription?.plan || "trial"})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Subscription Expiry</span>
                <span className="font-bold text-slate-900">{comp.subscription?.expiryDate ? new Date(comp.subscription.expiryDate).toLocaleDateString() : "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Company Status</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${
                  comp.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {comp.status || "active"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Last Activity Log</span>
                <span className="font-bold text-slate-900">{comp.updatedAt ? new Date(comp.updatedAt).toLocaleString() : "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Calculator and Employee Limits Card */}
          <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
              <CardTitle className="text-xs font-black uppercase text-slate-500">Calculator & Employee Limits</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs flex-1 flex flex-col justify-between">
              
              {/* Employee slots */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b border-slate-200 pb-1">Employee Limits slots</span>
                <div className="grid grid-cols-3 text-center gap-2">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 block">Max Limit</span>
                    <span className="text-lg font-black text-slate-900">{comp.limits?.maxEmployees ?? 20}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 block">Current</span>
                    <span className="text-lg font-black text-slate-900">{compEmp.count}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 block">Slots Left</span>
                    <span className="text-lg font-black text-indigo-600">{(comp.limits?.maxEmployees ?? 20) - compEmp.count}</span>
                  </div>
                </div>
              </div>

              {/* Calculators list */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b border-slate-200 pb-1">Allocated Calculators</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    {comp.calculatorsEnabled?.construction !== false ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                    <span className="font-semibold text-slate-700">Construction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.calculatorsEnabled?.doors !== false ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                    <span className="font-semibold text-slate-700">Interior</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.calculatorsEnabled?.kitchen !== false ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                    <span className="font-semibold text-slate-700">Kitchen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.calculatorsEnabled?.wardrobe !== false ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                    <span className="font-semibold text-slate-700">Wardrobe</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Company Analytics Summary Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-row items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="h-5 w-5" /></div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400">Total Employees</span>
                <div className="text-xl font-black">{compEmp.count}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-row items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><UserIcon className="h-5 w-5" /></div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400">Total Customers</span>
                <div className="text-xl font-black">{compCust.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-row items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Folder className="h-5 w-5" /></div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400">Total Projects</span>
                <div className="text-xl font-black">{compProj.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-row items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><FileText className="h-5 w-5" /></div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400">Total Quotations</span>
                <div className="text-xl font-black">{compQuote.length}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sub-Lists Accordion/Tab views */}
        <div className="space-y-6">
          
          {/* Employee Directory */}
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-slate-400">Employee Directory</h3>
            <Card className="border-slate-200 overflow-hidden shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                {compEmp.list.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-bold text-xs">No registered employees assigned.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Employee Name</th>
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Email Address</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Assigned Calculators</th>
                        <th className="px-4 py-3">Last Login</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compEmp.list.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{emp.name}</td>
                          <td className="px-4 py-3 font-mono text-[10px]">{emp.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-600 capitalize">{emp.position || "Staff"}</td>
                          <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                          <td className="px-4 py-3 text-slate-600">{emp.phone || "N/A"}</td>
                          <td className="px-4 py-3">
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">Active</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {emp.permissions?.construction !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Construction</span>}
                              {emp.permissions?.doors !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Interior</span>}
                              {emp.permissions?.kitchen !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Kitchen</span>}
                              {emp.permissions?.wardrobe !== false && <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold">Wardrobe</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">{emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Directory */}
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-slate-400">Project Directory</h3>
            <Card className="border-slate-200 overflow-hidden shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                {compProj.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-bold text-xs">No project folders created.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Project Name</th>
                        <th className="px-4 py-3">Project ID</th>
                        <th className="px-4 py-3">Customer Name</th>
                        <th className="px-4 py-3">Budget</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compProj.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                          <td className="px-4 py-3 font-mono text-[10px]">{p.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-600">{p.customerDetails?.name || "Client"}</td>
                          <td className="px-4 py-3 font-black text-indigo-600">{p.budgetAmount ? formatCurrency(p.budgetAmount) : "N/A"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              p.status === "closed" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                            }`}>{p.status || "active"}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quotations Directory */}
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-slate-400">Quotations Directory</h3>
            <Card className="border-slate-200 overflow-hidden shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                {compQuote.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-bold text-xs">No quotations generated.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Quotation Number</th>
                        <th className="px-4 py-3">Customer Name</th>
                        <th className="px-4 py-3">Associated Project</th>
                        <th className="px-4 py-3">Calculator Used</th>
                        <th className="px-4 py-3 text-right">Total Amount</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compQuote.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-900 select-all">{q.id}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{q.customerName}</td>
                          <td className="px-4 py-3 font-semibold text-slate-500">{q.projectName || "Unassigned"}</td>
                          <td className="px-4 py-3 capitalize font-bold text-slate-500 text-[10px]">{q.calculatorUsed}</td>
                          <td className="px-4 py-3 text-right font-black text-indigo-600 text-sm">{formatCurrency(q.totalAmount)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">{q.status || "approved"}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => downloadQuotePDF(q)} className="h-7 text-[10px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                              <FileDown className="h-3 w-3 mr-1" /> PDF
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer Directory */}
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-slate-400">Customer Directory</h3>
            <Card className="border-slate-200 overflow-hidden shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                {compCust.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-bold text-xs">No customers database log.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Customer Name</th>
                        <th className="px-4 py-3">Email Address</th>
                        <th className="px-4 py-3">Phone Number</th>
                        <th className="px-4 py-3 text-center">Total Projects</th>
                        <th className="px-4 py-3 text-center">Total Quotations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compCust.map((cust, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{cust.name}</td>
                          <td className="px-4 py-3 text-slate-600 font-semibold">{cust.email}</td>
                          <td className="px-4 py-3 text-slate-600">{cust.phone}</td>
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
          <p className="text-xs text-slate-500 font-semibold">
            Highest authority panel. Control onboarding invitation keys, subscriptions, and limits.
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

      {/* Tabs list (horizontally scrollable on mobile) */}
      <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-xl shadow-sm overflow-x-auto scrollbar-none flex-nowrap whitespace-nowrap">
        {([
          { id: "overview", label: "Overview", icon: Activity },
          { id: "companies", label: "Registered Companies", icon: Building },
          { id: "keys", label: "Invitation Keys", icon: Key },
          { id: "employees", label: "Employees", icon: Users },
          { id: "projects", label: "Projects", icon: Folder },
          { id: "quotations", label: "Quotations", icon: FileText },
          { id: "customers", label: "Customers", icon: UserIcon }
        ] as { id: AdminTab; label: string; icon: any }[]).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                setFilterCompany("all");
                setFilterStatus("all");
              }}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all ${
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
      {activeTab !== "overview" && (
        <div className="flex flex-col sm:flex-row gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-slate-200 text-xs font-medium focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            {activeTab === "companies" && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Subscription Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            )}

            {activeTab === "keys" && (
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
            )}

            {(activeTab === "employees" || activeTab === "projects") && (
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* --- OVERVIEW TAB --- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          
          {/* Quick Metrics Grid */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/30 hover:scale-[1.01] transition-transform">
              <CardContent className="p-4 flex flex-row items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Building className="h-6 w-6" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Total Companies</span>
                  <div className="text-2xl font-black text-slate-900">{stats.totalCompanies}</div>
                  <span className="text-[9px] font-bold text-slate-400">Recently Active (7d): {stats.recentlyActiveCompaniesCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/30 hover:scale-[1.01] transition-transform">
              <CardContent className="p-4 flex flex-row items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Users className="h-6 w-6" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Total Employees</span>
                  <div className="text-2xl font-black text-slate-900">{stats.totalEmployees}</div>
                  <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1 py-0.5 rounded">Tenant Members</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/30 hover:scale-[1.01] transition-transform">
              <CardContent className="p-4 flex flex-row items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Folder className="h-6 w-6" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Total Projects</span>
                  <div className="text-2xl font-black text-slate-900">{stats.totalProjectsCount}</div>
                  <span className="text-[9px] font-bold text-slate-400">Active Workspaces</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/30 hover:scale-[1.01] transition-transform">
              <CardContent className="p-4 flex flex-row items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><FileText className="h-6 w-6" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Total Quotations</span>
                  <div className="text-2xl font-black text-slate-900">{stats.totalQuotationsCount}</div>
                  <span className="text-[9px] font-bold text-slate-400">Total Value Preference</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Last Activity Double Panels */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Last Quotation */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-slate-500">Last Quotation Generated Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                {stats.lastQuotation ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Quote Number</span>
                      <span className="font-mono font-black text-indigo-900 select-all">{stats.lastQuotation.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Customer</span>
                      <span className="font-bold text-slate-800">{stats.lastQuotation.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Associated Company</span>
                      <span className="font-bold text-slate-800">{getCompanyName(stats.lastQuotation.companyId || stats.lastQuotation.createdByUserId)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Calculator Model</span>
                      <span className="font-bold text-slate-800 capitalize">{stats.lastQuotation.calculatorUsed}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Estimate Total</span>
                      <span className="font-black text-indigo-600 text-sm">{formatCurrency(stats.lastQuotation.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400 font-semibold">Generated Date & Time</span>
                      <span className="text-slate-500 font-bold">{new Date(stats.lastQuotation.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => downloadQuotePDF(stats.lastQuotation)}
                        className="w-full h-8 text-xs font-bold border border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50"
                      >
                        <FileDown className="h-3.5 w-3.5 mr-1" /> Download Estimate PDF
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-slate-400 italic">No quotes generated in the system.</div>
                )}
              </CardContent>
            </Card>

            {/* Last Project */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-slate-500">Last Project Created Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                {stats.lastProject ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Project Name</span>
                      <span className="font-bold text-slate-900">{stats.lastProject.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Project ID</span>
                      <span className="font-mono text-slate-700">{stats.lastProject.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Company</span>
                      <span className="font-bold text-slate-800">{getCompanyName(stats.lastProject.companyId)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Customer Reference</span>
                      <span className="font-bold text-slate-800">{stats.lastProject.customerDetails?.name || "Client"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Project Status</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black uppercase text-[9px]">{stats.lastProject.status || "active"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400 font-semibold">Created Date & Time</span>
                      <span className="text-slate-500 font-bold">{new Date(stats.lastProject.createdAt).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-slate-400 italic">No projects registered.</div>
                )}
              </CardContent>
            </Card>

          </div>

        </div>
      )}

      {/* --- REGISTERED COMPANIES TAB --- */}
      {activeTab === "companies" && (
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            {filteredCompanies.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">
                No registered companies match your query.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Company Details</th>
                    <th className="px-4 py-3">Owner & Contact</th>
                    <th className="px-4 py-3">Invitation Key ID</th>
                    <th className="px-4 py-3">Stats (Emp/Cust/Proj/Quotes)</th>
                    <th className="px-4 py-3">Subscription (Expiry)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredCompanies.map((comp) => {
                    const empData = getCompanyEmployeesData(comp.id);
                    const compProjCount = projects.filter((p) => p.companyId === comp.id).length;
                    const compQuotesCount = quotes.filter((q) => q.companyId === comp.id || q.createdByUserId === comp.id).length;
                    
                    return (
                      <tr key={comp.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block text-[13px]">{comp.name}</span>
                          <span className="text-[9px] font-mono text-slate-400">ID: {comp.id}</span>
                        </td>
                        <td className="px-4 py-3 space-y-0.5">
                          <span className="font-bold text-slate-700 block">{comp.companyOwner || comp.owner || "N/A"}</span>
                          <span className="text-slate-500 block">{comp.email}</span>
                          <span className="text-slate-400 font-semibold block">{comp.phone || "N/A"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10.5px]">
                            {comp.keyId || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 text-[10.5px] font-black text-slate-500">
                            <span>Emp: <strong className="text-slate-800">{empData.count}</strong></span>
                            <span>Proj: <strong className="text-slate-800">{compProjCount}</strong></span>
                            <span>Quotes: <strong className="text-indigo-600">{compQuotesCount}</strong></span>
                          </div>
                        </td>
                        <td className="px-4 py-3 space-y-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            comp.subscription?.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {comp.subscription?.status || "inactive"}
                          </span>
                          <span className="text-[9.5px] font-semibold text-slate-500 block">
                            Expiry: {comp.subscription?.expiryDate ? new Date(comp.subscription.expiryDate).toLocaleDateString() : "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            comp.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {comp.status || "active"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            key={`view-${comp.id}`}
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCompanyForDetails(comp)}
                            className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Company
                          </Button>
                          <Button
                            key={`edit-${comp.id}`}
                            size="sm"
                            variant="outline"
                            onClick={() => openEditCompanyModal(comp)}
                            className="h-8 text-[11px] font-bold border-slate-200 text-slate-700 bg-white"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
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

      {/* --- INVITATION KEYS TAB --- */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase text-slate-400">Invitation Key Management</h2>
            <Button size="sm" onClick={() => setIsCreateKeyModalOpen(true)} className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <Plus className="h-4 w-4 mr-1.5" /> Create Invitation Key
            </Button>
          </div>

          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              {filteredKeys.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold text-xs">
                  No Invitation Keys generated.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Invitation Key Code</th>
                      <th className="px-4 py-3">Assigned Company</th>
                      <th className="px-4 py-3">Generated Date/Time</th>
                      <th className="px-4 py-3">Expiry Date/Time</th>
                      <th className="px-4 py-3">Created By</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-black text-[13px] text-indigo-900 select-all tracking-wider block">
                            {key.keyCode || key.id}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400">Key-ID: {key.id}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {key.status === "used" && key.usedByCompanyName ? (
                            <div>
                              <span>{key.usedByCompanyName}</span>
                              <span className="text-[8px] font-mono text-slate-400 block">Company ID: {key.usedByCompanyId}</span>
                            </div>
                          ) : (
                            key.companyName || <span className="text-slate-400 italic">Unassigned (Open Key)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 space-y-0.5">
                          <span className="font-bold text-slate-700 block">{key.generatedDate || "N/A"}</span>
                          <span className="text-slate-400 font-semibold block">{key.generatedTime || "N/A"}</span>
                        </td>
                        <td className="px-4 py-3 space-y-0.5">
                          <span className="font-bold text-slate-700 block">{key.expiryDate || "N/A"}</span>
                          <span className="text-slate-400 font-semibold block">{key.expiryTime || "N/A"}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">
                          {key.createdBy || "Admin"}
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
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- EMPLOYEES TAB --- */}
      {activeTab === "employees" && (
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">No employees found.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{emp.name}</td>
                      <td className="px-4 py-3 font-mono text-[10px]">{emp.id}</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{getCompanyName(emp.companyId)}</td>
                      <td className="px-4 py-3 capitalize text-slate-600 font-semibold">{emp.position || "Staff"}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.phone || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-500 font-semibold">{emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- PROJECTS TAB --- */}
      {activeTab === "projects" && (
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">No projects created.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Project Name</th>
                    <th className="px-4 py-3">Project ID</th>
                    <th className="px-4 py-3">Owner Company</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-[10px]">{p.id}</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{getCompanyName(p.companyId)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{p.customerDetails?.name || "Client"}</td>
                      <td className="px-4 py-3 font-black text-indigo-600">{p.budgetAmount ? formatCurrency(p.budgetAmount) : "N/A"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          p.status === "closed" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                        }`}>{p.status || "active"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-semibold">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- QUOTATIONS TAB --- */}
      {activeTab === "quotations" && (
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            {filteredQuotes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">No quotations generated.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Quotation Number</th>
                    <th className="px-4 py-3">Company Origin</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Calculator Used</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-900 select-all">{q.id}</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{getCompanyName(q.companyId || q.createdByUserId)}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{q.customerName}</td>
                      <td className="px-4 py-3 capitalize font-bold text-slate-500 text-[10px]">{q.calculatorUsed}</td>
                      <td className="px-4 py-3 text-right font-black text-indigo-600 text-sm">{formatCurrency(q.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">{q.status || "approved"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => downloadQuotePDF(q)} className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                          <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- CUSTOMERS TAB --- */}
      {activeTab === "customers" && (
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">No registered customers.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Linked Company</th>
                    <th className="px-4 py-3 text-center">Total Projects</th>
                    <th className="px-4 py-3 text-center">Total Quotes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust, idx) => {
                    const custQuotesCount = quotes.filter((q) => q.customerEmail === cust.email).length;
                    const custProjCount = projects.filter((p) => p.customerDetails?.email === cust.email).length;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{cust.name}</td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">{cust.email}</td>
                        <td className="px-4 py-3 text-slate-600">{cust.phone || "N/A"}</td>
                        <td className="px-4 py-3 font-bold text-indigo-700">{getCompanyName(cust.companyId)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{custProjCount}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">{custQuotesCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================== MODALS FOR EDITING & ACTIONS ===================== */}

      {/* Edit Company Info, calculator access, employee limits */}
      {isEditCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Edit {selectedCompany.name}</h3>
              <button onClick={() => setIsEditCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditCompanySubmit} className="space-y-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Company Name</Label>
                <Input value={editCompName} onChange={(e) => setEditCompName(e.target.value)} required className="h-9 border-slate-200" />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Owner Name</Label>
                <Input value={editCompOwner} onChange={(e) => setEditCompOwner(e.target.value)} className="h-9 border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Email Address</Label>
                  <Input value={editCompEmail} disabled className="h-9 border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Phone</Label>
                  <Input value={editCompPhone} onChange={(e) => setEditCompPhone(e.target.value)} className="h-9 border-slate-200" />
                </div>
              </div>

              {/* Employee limits controls */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1">Employee Limit Management</span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Max Allowed Employees</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-7 w-7 text-xs font-black p-0" onClick={() => setEditCompMaxEmployees(Math.max(1, editCompMaxEmployees - 1))}>-</Button>
                    <span className="font-bold text-sm text-slate-800 w-8 text-center">{editCompMaxEmployees}</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 w-7 text-xs font-black p-0" onClick={() => setEditCompMaxEmployees(editCompMaxEmployees + 1)}>+</Button>
                  </div>
                </div>
              </div>

              {/* Calculator switches */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block border-b pb-1">Calculator Access switches</span>
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
                {editCompStatus === "active" ? (
                  <Button type="button" variant="outline" className="flex-1 h-9 text-amber-600 border-amber-200" onClick={() => { setEditCompStatus("disabled"); handleUpdateCompanyStatus(selectedCompany, "disabled"); }}>
                    Disable Company
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="flex-1 h-9 text-emerald-600 border-emerald-200" onClick={() => { setEditCompStatus("active"); handleUpdateCompanyStatus(selectedCompany, "active"); }}>
                    Enable Company
                  </Button>
                )}
                <Button type="submit" className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit subscription timings */}
      {isSubscriptionModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Subscription Control: {selectedCompany.name}</h3>
              <button onClick={() => setIsSubscriptionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditSubscriptionSubmit} className="space-y-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Subscription Plan Tier</Label>
                <select value={subPlan} onChange={(e) => setSubPlan(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 font-bold text-slate-700">
                  <option value="trial">Free Trial</option>
                  <option value="monthly">Monthly subscription</option>
                  <option value="yearly">Yearly subscription</option>
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

              <div className="flex gap-2">
                {subStatus === "active" ? (
                  <Button type="button" variant="outline" className="flex-1 h-9 text-rose-600 border-rose-200" onClick={() => { setSubStatus("expired"); handleUpdateSubscriptionStatus(selectedCompany, "expired"); }}>
                    Expire Subscription
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="flex-1 h-9 text-emerald-600 border-emerald-200" onClick={() => { setSubStatus("active"); handleUpdateSubscriptionStatus(selectedCompany, "active"); }}>
                    Activate Subscription
                  </Button>
                )}
                <Button type="submit" className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Save Timeline</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create invitation key */}
      {isCreateKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Generate Company Invitation Key</h3>
              <button onClick={() => setIsCreateKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Custom Key Code (Optional, 10 chars)</Label>
                <Input value={newKeyCode} onChange={(e) => setNewKeyCode(e.target.value)} maxLength={10} placeholder="e.g. CIMW#72897" className="h-9 border-slate-200 font-mono tracking-widest text-center" />
                <span className="text-[9px] text-slate-400 italic">Leave empty to auto-generate code prefix based on company name.</span>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Assigned Company Name (Optional before register)</Label>
                <Input value={newKeyCompanyName} onChange={(e) => setNewKeyCompanyName(e.target.value)} placeholder="e.g. Ats Interior" className="h-9 border-slate-200" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Plan Tier</Label>
                  <select value={newKeyPlan} onChange={(e) => setNewKeyPlan(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 font-bold text-slate-700">
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Expiry Duration (Days)</Label>
                  <Input type="number" value={newKeyDurationDays} onChange={(e) => setNewKeyDurationDays(parseInt(e.target.value) || 30)} required className="h-9 border-slate-200" />
                </div>
              </div>

              <Button type="submit" className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Generate Code</Button>
            </form>
          </div>
        </div>
      )}

      {/* Edit invitation key */}
      {isEditKeyModalOpen && selectedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-md font-black uppercase text-slate-700">Edit Invitation Key Code: {selectedKey.id}</h3>
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
                  <option value="used">Used (Closed)</option>
                </select>
              </div>

              <Button type="submit" className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Save Key Changes</Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
