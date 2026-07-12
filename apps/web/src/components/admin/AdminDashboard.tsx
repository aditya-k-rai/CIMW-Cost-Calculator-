"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Building,
  Users,
  User,
  Folder,
  FileText,
  Clock,
  Settings,
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
  ArrowUpDown,
  Lock,
  ChevronRight,
  TrendingUp,
  Calendar,
  Layers,
  MapPin,
  Mail,
  Phone,
  Hash
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminDashboardProps = {
  defaultTab?: string;
};

export function AdminDashboard({ defaultTab = "overview" }: AdminDashboardProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Data States
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [subscriptionKeys, setSubscriptionKeys] = useState<any[]>([]);
  
  // Loading & Sync state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");
  
  // Modal / Editing states
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isViewCompanyModalOpen, setIsViewCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isViewProjectModalOpen, setIsViewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isViewQuoteModalOpen, setIsViewQuoteModalOpen] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isViewCustomerModalOpen, setIsViewCustomerModalOpen] = useState(false);

  // Form Fields for Editing Company
  const [editCompName, setEditCompName] = useState("");
  const [editCompOwner, setEditCompOwner] = useState("");
  const [editCompEmail, setEditCompEmail] = useState("");
  const [editCompPhone, setEditCompPhone] = useState("");
  const [editCompAddress, setEditCompAddress] = useState("");
  const [editCompKey, setEditCompKey] = useState("");
  const [editCompStatus, setEditCompStatus] = useState("active");
  const [editCompMaxEmployees, setEditCompMaxEmployees] = useState(20);
  const [editCompSubPlan, setEditCompSubPlan] = useState("trial");
  const [editCompSubStart, setEditCompSubStart] = useState("");
  const [editCompSubExpiry, setEditCompSubExpiry] = useState("");
  const [editCompCalcs, setEditCompCalcs] = useState({
    construction: true,
    interior: true,
    kitchen: true,
    wardrobe: true
  });

  // Form Fields for Provisioning Tenant
  const [newCompName, setNewCompName] = useState("");
  const [newCompEmail, setNewCompEmail] = useState("");
  const [newCompPhone, setNewCompPhone] = useState("");
  const [newCompGst, setNewCompGst] = useState("");
  const [newCompDistrict, setNewCompDistrict] = useState("");
  const [newCompState, setNewCompState] = useState("");
  const [newCompPlan, setNewCompPlan] = useState("trial");
  const [newCompExpiry, setNewCompExpiry] = useState("");

  // Form Fields for Creating Key
  const [newKeyCompanyName, setNewKeyCompanyName] = useState("");
  const [newKeyPlan, setNewKeyPlan] = useState("monthly");
  const [newKeyDurationDays, setNewKeyDurationDays] = useState(30);

  // Form Fields for Editing Project
  const [editProjName, setEditProjName] = useState("");
  const [editProjStatus, setEditProjStatus] = useState("active");
  const [editProjBudget, setEditProjBudget] = useState("");
  const [editProjExpiry, setEditProjExpiry] = useState("");

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
      setErrorMsg(err.message || "Failed to sync system database logs.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Initial Fetch & Auto polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000); // 10 second polling
    return () => clearInterval(interval);
  }, []);

  // Update URL activeTab state if prop defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Quick Stats Computations
  const totalCompanies = useMemo(() => companies.length, [companies]);
  const totalEmployees = useMemo(() => users.filter((u) => u.role === "employee").length, [users]);
  // Unique customers based on users collection with role "customer", or unique customer emails
  const totalCustomers = useMemo(() => Array.from(new Set([
    ...users.filter((u) => u.role === "customer").map((u) => u.email),
    ...quotes.map((q) => q.customerEmail),
    ...projects.map((p) => p.customerDetails?.email)
  ].filter(Boolean))).length, [users, quotes, projects]);
  
  const totalProjectsCount = useMemo(() => projects.length, [projects]);
  const totalQuotationsCount = useMemo(() => quotes.length, [quotes]);

  // Last Quotation
  const sortedQuotes = useMemo(() => [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [quotes]);
  const lastQuotation = useMemo(() => sortedQuotes[0] || null, [sortedQuotes]);

  // Last Project
  const sortedProjects = useMemo(() => [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [projects]);
  const lastProject = useMemo(() => sortedProjects[0] || null, [sortedProjects]);

  // Recently Active Companies count (companies active or created in the past 7 days)
  const recentlyActiveCompaniesCount = useMemo(() => companies.filter((c) => {
    if (!c.updatedAt) return false;
    const diffTime = Math.abs(Date.now() - new Date(c.updatedAt).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length, [companies]);

  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Company management actions
  const handleToggleCompanyStatus = async (comp: any) => {
    const newStatus = comp.subscription?.status === "active" ? "suspended" : "active";
    try {
      await api.auth.updateCompany(comp.id, {
        subscription: {
          ...(comp.subscription || {}),
          status: newStatus
        }
      });
      await fetchData();
    } catch (err: any) {
      alert("Failed to toggle company status: " + err.message);
    }
  };

  const openEditCompanyModal = (comp: any) => {
    setSelectedCompany(comp);
    setEditCompName(comp.name || "");
    setEditCompOwner(comp.owner || comp.companyOwner || "");
    setEditCompEmail(comp.email || "");
    setEditCompPhone(comp.phone || "");
    setEditCompAddress(comp.address || "");
    setEditCompKey(comp.keyId || "");
    setEditCompStatus(comp.subscription?.status || "active");
    setEditCompMaxEmployees(comp.limits?.maxEmployees ?? 20);
    setEditCompSubPlan(comp.subscription?.plan || "trial");
    setEditCompSubStart(comp.subscription?.startDate ? comp.subscription.startDate.split("T")[0] : "");
    setEditCompSubExpiry(comp.subscription?.expiryDate ? comp.subscription.expiryDate.split("T")[0] : "");
    setEditCompCalcs({
      construction: comp.calculatorsEnabled?.construction !== false,
      interior: comp.calculatorsEnabled?.doors !== false, // internal code maps doors to interior
      kitchen: comp.calculatorsEnabled?.kitchen !== false,
      wardrobe: comp.calculatorsEnabled?.wardrobe !== false
    });
    setIsEditCompanyModalOpen(true);
  };

  const handleEditCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await api.auth.updateCompany(selectedCompany.id, {
        name: editCompName,
        owner: editCompOwner,
        email: editCompEmail,
        phone: editCompPhone,
        address: editCompAddress,
        keyId: editCompKey,
        subscription: {
          plan: editCompSubPlan,
          startDate: editCompSubStart || new Date().toISOString(),
          expiryDate: editCompSubExpiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: editCompStatus
        },
        limits: {
          ...(selectedCompany.limits || {}),
          maxEmployees: Number(editCompMaxEmployees)
        },
        calculatorsEnabled: {
          ...(selectedCompany.calculatorsEnabled || {}),
          construction: editCompCalcs.construction,
          doors: editCompCalcs.interior, // doors is mapped to interior internally
          kitchen: editCompCalcs.kitchen,
          wardrobe: editCompCalcs.wardrobe
        }
      });
      setIsEditCompanyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert("Failed to update company details: " + err.message);
    }
  };

  // Set subscription actions
  const adjustSubscriptionDuration = (days: number) => {
    let currentExpiry = editCompSubExpiry ? new Date(editCompSubExpiry) : new Date();
    currentExpiry.setDate(currentExpiry.getDate() + days);
    setEditCompSubExpiry(currentExpiry.toISOString().split("T")[0]);
  };

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.createCompany({
        name: newCompName,
        email: newCompEmail,
        phone: newCompPhone,
        gstNumber: newCompGst,
        district: newCompDistrict,
        state: newCompState,
        plan: newCompPlan,
        expiryDate: newCompExpiry ? new Date(newCompExpiry).toISOString() : undefined
      });
      setIsCreateCompanyModalOpen(false);
      // Clear form
      setNewCompName("");
      setNewCompEmail("");
      setNewCompPhone("");
      setNewCompGst("");
      setNewCompDistrict("");
      setNewCompState("");
      setNewCompPlan("trial");
      setNewCompExpiry("");
      await fetchData();
    } catch (err: any) {
      alert("Failed to provision company tenant: " + err.message);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company? All company credentials and data will be permanently revoked.")) return;
    try {
      await api.auth.deleteCompany(id);
      await fetchData();
    } catch (err: any) {
      alert("Failed to delete company: " + err.message);
    }
  };

  // Subscription Key catalog actions
  const handleCreateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.createSubscriptionKey({
        companyName: newKeyCompanyName,
        plan: newKeyPlan,
        durationDays: Number(newKeyDurationDays)
      });
      setNewKeyCompanyName("");
      await fetchData();
    } catch (err: any) {
      alert("Failed to generate key: " + err.message);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this registration code?")) return;
    try {
      await api.auth.deleteSubscriptionKey(id);
      await fetchData();
    } catch (err: any) {
      alert("Failed to delete key: " + err.message);
    }
  };

  // Project editing
  const openEditProjectModal = (proj: any) => {
    setSelectedProject(proj);
    setEditProjName(proj.name || "");
    setEditProjStatus(proj.status || "active");
    setEditProjBudget(proj.budgetAmount || proj.projectNotes || ""); // budget field fallback
    setEditProjExpiry(proj.expectedCompletionDate || "");
    setIsEditProjectModalOpen(true);
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      await api.projects.update(selectedProject.id, {
        name: editProjName,
        status: editProjStatus,
        expectedCompletionDate: editProjExpiry,
        projectNotes: editProjBudget // budget storage fallback helper
      });
      setIsEditProjectModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert("Failed to update project: " + err.message);
    }
  };

  // PDF Export Trigger
  const downloadQuotePDF = (quote: any) => {
    const doc = new jsPDF();
    
    // Header Banner
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CIMW ESTIMATE QUOTATION", 14, 25);
    
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.text("System generated summary sheet via Admin Console", 14, 32);

    // Metadata block
    doc.setTextColor(50);
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("QUOTATION METADATA", 14, 55);
    
    const metaData = [
      ["Quote Reference Code", quote.id || "N/A"],
      ["Date Generated", quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString()],
      ["Time Generated", quote.createdAt ? new Date(quote.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString()],
      ["Calculator Used", quote.calculatorUsed || "N/A"],
      ["Estimation Status", (quote.status || "draft").toUpperCase()]
    ];
    
    (doc as any).autoTable({
      startY: 60,
      body: metaData,
      theme: "plain",
      styles: { cellPadding: 2, fontSize: 9 }
    });

    // Customer & Company Relations
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

    // Parameters details
    const paramsY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ESTIMATION CONFIGURATION PARAMETERS", 14, paramsY);

    const paramsData = [
      ["Project Budget Preference", quote.budgetRange || "N/A"],
      ["Scope / Dimension Area", quote.roomSize ? `${quote.roomSize} sqft` : "N/A"],
      ["Target Scope / Calculator Type", quote.projectType || "N/A"],
      ["Special Customization Requirements", quote.specialRequirements || quote.notes || "None listed"]
    ];

    (doc as any).autoTable({
      startY: paramsY + 5,
      body: paramsData,
      theme: "grid",
      styles: { cellPadding: 3, fontSize: 9 }
    });

    // Budget Total
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`GRAND ESTIMATED BUDGET: ${formatCurrency(quote.totalAmount || 0)}`, 14, finalY);

    doc.save(`Quotation_${quote.customerName ? quote.customerName.replace(/\s+/g, "_") : "Reference"}.pdf`);
  };

  // Helper matching company names
  const getCompanyName = (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    return comp ? comp.name : "System / Direct Tenant";
  };

  // Filter helper functions
  const handleSearchChange = (e: any) => setSearchQuery(e.target.value);

  // Filter lists based on input queries
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || c.subscription?.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, filterStatus]);

  const filteredEmployees = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== "employee") return false;
      const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.phone?.includes(searchQuery);
      const matchesCompany = filterCompany === "all" || u.companyId === filterCompany;
      return matchesSearch && matchesCompany;
    });
  }, [users, searchQuery, filterCompany]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.customerDetails?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = filterCompany === "all" || p.companyId === filterCompany;
      return matchesSearch && matchesCompany;
    });
  }, [projects, searchQuery, filterCompany]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch = q.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            q.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            q.calculatorUsed?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [quotes, searchQuery]);

  const filteredCustomers = useMemo(() => {
    return Array.from(
      new Map(
        [
          ...users.filter((u) => u.role === "customer"),
          ...quotes.map((q) => ({
            id: q.customerId || `cust-${q.customerEmail}`,
            name: q.customerName,
            email: q.customerEmail,
            phone: q.customerPhone,
            companyId: q.createdByUserId || "",
            createdAt: q.createdAt
          }))
        ]
        .filter((c: any) => c.name && c.email)
        .map((c: any) => [c.email, c])
      ).values()
    ).filter((cust: any) => {
      const matchesSearch = cust.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            cust.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            cust.phone?.includes(searchQuery);
      return matchesSearch;
    });
  }, [users, quotes, searchQuery]);

  return (
    <div className="space-y-6 text-slate-800 pb-16">
      
      {/* Top Sync Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            Super Admin Workspace
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Highest authority panel. Complete real-time control over all tenants, systems, and quotes.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {errorMsg && (
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
              {errorMsg}
            </span>
          )}
          <Button
            onClick={() => fetchData(true)}
            disabled={syncing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 flex items-center gap-1.5 shadow-md"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync Database Logs
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-slate-500">Retrieving system registries from Cloud Firestore...</span>
        </div>
      ) : (
        <>
          {/* ===================== TAB 1: OVERVIEW ===================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
              {/* Stat Cards */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                
                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/50 hover:shadow transition">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">Total Companies</span>
                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                      <Building className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-black text-slate-900">{totalCompanies}</div>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Workspace Tenants
                    </span>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/50 hover:shadow transition">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">Total Employees</span>
                    <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                      <Users className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-black text-slate-900">{totalEmployees}</div>
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      Linked Accounts
                    </span>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/50 hover:shadow transition">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">Total Customers</span>
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                      <User className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-black text-slate-900">{totalCustomers}</div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Onboarded Leads
                    </span>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/50 hover:shadow transition">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">Total Projects</span>
                    <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                      <Folder className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-black text-slate-900">{totalProjectsCount}</div>
                    <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      System Estimations
                    </span>
                  </CardContent>
                </Card>

              </div>

              {/* Extra secondary cards */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card className="border border-slate-200 p-4">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Total Quotations</span>
                  <div className="text-xl font-bold flex items-center justify-between">
                    <span>{totalQuotationsCount}</span>
                    <span className="text-xs font-semibold text-slate-500">PDFs available</span>
                  </div>
                </Card>
                <Card className="border border-slate-200 p-4">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Recently Active Companies</span>
                  <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    <span>{recentlyActiveCompaniesCount}</span>
                  </div>
                </Card>
                <Card className="border border-slate-200 p-4 sm:col-span-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Last Action Timestamp</span>
                  <div className="text-sm font-black text-indigo-700 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                </Card>
              </div>

              {/* Last Profiles & Active Companies */}
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Last Quotation Panel */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-wider">
                        Last Quotation Generated Profile
                      </CardTitle>
                      <CardDescription className="text-[10px]">Real-time audit log of newest quote request</CardDescription>
                    </div>
                    {lastQuotation && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadQuotePDF(lastQuotation)}
                        className="h-7 text-[10px] font-bold border-indigo-200 text-indigo-600 bg-white"
                      >
                        <FileDown className="h-3 w-3 mr-1" /> PDF
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 text-xs space-y-3">
                    {lastQuotation ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-black text-indigo-500 uppercase block">Quotation Number</span>
                            <span className="font-mono font-black text-indigo-900 select-all">{lastQuotation.id}</span>
                          </div>
                          <span className="text-xs font-black text-indigo-700">{formatCurrency(lastQuotation.totalAmount)}</span>
                        </div>
                        
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Customer Name</span>
                          <span className="font-bold text-slate-800">{lastQuotation.customerName}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Company Name</span>
                          <span className="font-bold text-slate-800">{getCompanyName(lastQuotation.customerId)}</span>
                        </div>
                        
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Employee Name / ID</span>
                          <span className="font-semibold text-slate-700">{lastQuotation.createdByUserId || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Calculator Used</span>
                          <span className="font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded text-[9px] inline-block mt-0.5">
                            {lastQuotation.calculatorUsed || "Modular Kitchen"}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-[9px] text-slate-400 font-bold block">Associated Project</span>
                          <span className="font-semibold text-slate-700">{lastQuotation.projectName || "Unassigned"}</span>
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Generated Date</span>
                          <span className="font-bold text-slate-700">{new Date(lastQuotation.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Generated Time</span>
                          <span className="font-bold text-slate-700">{new Date(lastQuotation.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 font-bold">
                        No quotations registered in Firestore logs yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Last Project Panel */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                    <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Last Project Created Profile
                    </CardTitle>
                    <CardDescription className="text-[10px]">Registry log of latest initialized folder workspace</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 text-xs space-y-3">
                    {lastProject ? (
                      <div className="space-y-3">
                        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-black text-emerald-600 uppercase block">Project Name</span>
                            <span className="font-black text-slate-800">{lastProject.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                            {lastProject.status || "active"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">Company Name</span>
                            <span className="font-semibold text-slate-700">{getCompanyName(lastProject.companyId)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">Customer Name</span>
                            <span className="font-semibold text-slate-700">{lastProject.customerDetails?.name || "N/A"}</span>
                          </div>
                          
                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-400 font-bold block">Assigned Employees</span>
                            <span className="font-medium text-slate-600">
                              {lastProject.assignedEmployeeIds && lastProject.assignedEmployeeIds.length > 0
                                ? lastProject.assignedEmployeeIds.join(", ")
                                : "No employees assigned"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">Created Date</span>
                            <span className="font-bold text-slate-700">
                              {lastProject.createdAt ? new Date(lastProject.createdAt).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">Created Time</span>
                            <span className="font-bold text-slate-700">
                              {lastProject.createdAt ? new Date(lastProject.createdAt).toLocaleTimeString() : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 font-bold">
                        No projects created in system database logs yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
              
              {/* Recently Active Companies List */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="py-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-black uppercase text-slate-500">Recently Active Companies</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {companies.slice(0, 5).map((comp) => (
                      <div key={comp.id} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition text-xs font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Building className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{comp.name}</div>
                            <div className="text-[9px] text-slate-400">ID: {comp.id}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase font-bold text-indigo-600">Last activity</div>
                          <div className="text-slate-500 font-bold text-[10px]">
                            {comp.updatedAt ? new Date(comp.updatedAt).toLocaleDateString() : "N/A"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* ===================== TAB 2: COMPANIES ===================== */}
          {activeTab === "companies" && (
            <div className="space-y-6">
              
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search companies by name, email, code..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-9 h-9 text-xs border-slate-300"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>

                  <Button
                    onClick={() => setIsCreateCompanyModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-4 flex items-center gap-1.5 shadow animate-pulse"
                  >
                    <Plus className="h-4 w-4" /> Provision Company
                  </Button>
                </div>
              </div>

              {/* Companies list table */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  {filteredCompanies.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-bold text-sm">
                      No matching companies found in Firestore registry.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Company Details</th>
                          <th className="px-4 py-3">Owner & Contact</th>
                          <th className="px-4 py-3">Subscription</th>
                          <th className="px-4 py-3">Restrictions / Limits</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredCompanies.map((c) => {
                          const isExpired = !c.subscription?.expiryDate || new Date(c.subscription.expiryDate).getTime() <= Date.now();
                          const isActive = c.subscription?.status === "active" && !isExpired;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/30">
                              <td className="px-4 py-3 font-bold text-slate-900">
                                <div>{c.name}</div>
                                <span className="text-[10px] text-slate-400 font-normal">ID: {c.id}</span>
                              </td>
                              
                              <td className="px-4 py-3 text-slate-600">
                                <div className="font-semibold text-slate-800">{c.owner || c.companyOwner || "N/A"}</div>
                                <div>{c.email} | {c.phone || "No phone"}</div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-bold text-indigo-700 capitalize">
                                  {c.subscription?.plan || "Trial"} 
                                  {c.keyId && <span className="font-mono text-[9px] text-slate-400 ml-1.5">[{c.keyId}]</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  Expires: {c.subscription?.expiryDate ? new Date(c.subscription.expiryDate).toLocaleDateString() : "N/A"}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-slate-600 font-semibold">
                                <div className="text-[10px]">Limit: {c.limits?.maxEmployees ?? 20} Employees</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  Calcs: {[
                                    c.calculatorsEnabled?.construction !== false ? "Construction" : "",
                                    c.calculatorsEnabled?.doors !== false ? "Interior" : "",
                                    c.calculatorsEnabled?.kitchen !== false ? "Kitchen" : "",
                                    c.calculatorsEnabled?.wardrobe !== false ? "Wardrobe" : ""
                                  ].filter(Boolean).join(", ") || "None"}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isActive
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : isExpired
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-red-100 text-red-800 border border-red-200"
                                }`}>
                                  {isActive ? "Active" : isExpired ? "Expired" : "Suspended"}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCompany(c);
                                    setIsViewCompanyModalOpen(true);
                                  }}
                                  className="h-8 text-[11px] font-bold border border-slate-200 hover:bg-slate-100"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCompanyModal(c)}
                                  className="h-8 text-[11px] font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleCompanyStatus(c)}
                                  className={`h-8 text-[11px] font-bold ${
                                    c.subscription?.status === "active"
                                      ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {c.subscription?.status === "active" ? "Suspend" : "Activate"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCompany(c.id)}
                                  className="h-8 text-[11px] font-bold border-red-200 text-red-600 hover:bg-red-50"
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

              {/* Subscription Key Catalog Panel */}
              <div className="grid gap-6 md:grid-cols-3 items-start">
                
                {/* Generate New Key Form */}
                <Card className="border-slate-200 shadow-sm bg-white md:col-span-1">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-black uppercase text-indigo-700">Generate Registration Code</CardTitle>
                    <CardDescription className="text-[10px]">Create 10-character onboarding key codes for new companies.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleCreateKeySubmit} className="space-y-3.5 text-xs">
                      <div className="grid gap-1.5">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Company Name Assignment</Label>
                        <Input
                          placeholder="e.g. Acme Interior Solutions"
                          value={newKeyCompanyName}
                          onChange={(e) => setNewKeyCompanyName(e.target.value)}
                          className="h-9 text-xs border-slate-300 font-bold"
                          required
                        />
                      </div>
                      
                      <div className="grid gap-1.5">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Target Duration (Days)</Label>
                        <Input
                          type="number"
                          value={newKeyDurationDays}
                          onChange={(e) => setNewKeyDurationDays(Number(e.target.value) || 30)}
                          className="h-9 text-xs border-slate-300 font-bold"
                          required
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Subscription Plan Tier</Label>
                        <select
                          className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-bold"
                          value={newKeyPlan}
                          onChange={(e) => setNewKeyPlan(e.target.value)}
                        >
                          <option value="trial">Trial Access</option>
                          <option value="monthly">Monthly Professional</option>
                          <option value="yearly">Yearly Corporate</option>
                        </select>
                      </div>

                      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9">
                        Generate Invitation Key
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Key Listing Catalog */}
                <Card className="border-slate-200 shadow-sm bg-white md:col-span-2">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-black uppercase text-slate-600">Active Invitation Keys</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    {subscriptionKeys.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">
                        No invitations generated yet.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="px-4 py-3">10-Digit Code</th>
                            <th className="px-4 py-3">Tenant Allocated</th>
                            <th className="px-4 py-3">Plan / Period</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {subscriptionKeys.map((k) => (
                            <tr key={k.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-mono font-black text-indigo-700 text-sm select-all">
                                {k.id}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-800">{k.companyName}</td>
                              <td className="px-4 py-3 text-slate-600 font-semibold capitalize">
                                {k.plan} ({k.durationDays} Days)
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  k.status === "active"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-800"
                                }`}>
                                  {k.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteKey(k.id)}
                                  className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
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

            </div>
          )}

          {/* ===================== TAB 3: EMPLOYEES ===================== */}
          {activeTab === "employees" && (
            <div className="space-y-6">
              
              <div className="flex gap-4 justify-between items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search employees by name, email, phone..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-9 h-9 text-xs border-slate-300"
                  />
                </div>
                
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-bold text-sm">
                      No matching company employees registered in database logs.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Employee Name</th>
                          <th className="px-4 py-3">Employee ID</th>
                          <th className="px-4 py-3">Company Code / Name</th>
                          <th className="px-4 py-3">Role Designation</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3 text-right">Permissions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredEmployees.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-900">{e.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-400 select-all">{e.id}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {getCompanyName(e.companyId || e.companyCode)}
                              <span className="block text-[10px] text-slate-400 font-normal">Code: {e.companyCode || "N/A"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100">
                                {e.position || "Staff / Engineer"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-semibold">
                              <div>{e.email}</div>
                              <div className="text-[10px] text-slate-400">{e.phone || "No phone"}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployee(e);
                                  setIsViewEmployeeModalOpen(true);
                                }}
                                className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              >
                                View Role & Permissions
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

          {/* ===================== TAB 4: PROJECTS ===================== */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              
              <div className="flex gap-4 justify-between items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search projects by folder name, customer..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-9 h-9 text-xs border-slate-300"
                  />
                </div>
                
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  {filteredProjects.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-bold text-sm">
                      No matching projects stored in database registry.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Project Details</th>
                          <th className="px-4 py-3">Tenant Company</th>
                          <th className="px-4 py-3">Customer Reference</th>
                          <th className="px-4 py-3">Budget Allocation</th>
                          <th className="px-4 py-3">Linked Quotations</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredProjects.map((p) => {
                          const linkedQuotes = quotes.filter((q) => q.projectId === p.id);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-bold text-slate-900">
                                <div>{p.name}</div>
                                <span className="text-[10px] text-slate-400 font-normal">ID: {p.id}</span>
                              </td>
                              
                              <td className="px-4 py-3 font-bold text-indigo-700">
                                {getCompanyName(p.companyId)}
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                <div className="font-bold text-slate-800">{p.customerDetails?.name || "Direct Walkin"}</div>
                                <div className="text-[10px]">{p.customerDetails?.email || "No email"}</div>
                              </td>

                              <td className="px-4 py-3 text-slate-850 font-black">
                                {p.projectNotes ? p.projectNotes : "Rs. 2,50,000"}
                              </td>

                              <td className="px-4 py-3 font-bold text-indigo-600">
                                {linkedQuotes.length} Quotes
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  p.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                                }`}>
                                  {p.status}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-right space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProject(p);
                                    setIsViewProjectModalOpen(true);
                                  }}
                                  className="h-8 text-[11px] font-bold border border-slate-200 hover:bg-slate-100"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditProjectModal(p)}
                                  className="h-8 text-[11px] font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
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

          {/* ===================== TAB 5: QUOTATIONS ===================== */}
          {activeTab === "quotations" && (
            <div className="space-y-6">
              
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search quotations by number, customer, calculator type..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-9 h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  {filteredQuotes.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-bold text-sm">
                      No matching quotes generated in system.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Quotation Number</th>
                          <th className="px-4 py-3">Tenant Company</th>
                          <th className="px-4 py-3">Customer Info</th>
                          <th className="px-4 py-3">Scope / Project</th>
                          <th className="px-4 py-3">Calculator Model</th>
                          <th className="px-4 py-3">Estimated Total</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredQuotes.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-black text-indigo-900 select-all">{q.id}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{getCompanyName(q.customerId)}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{q.customerName}</div>
                              <div className="text-[10px] text-slate-400">{q.customerEmail}</div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-650">
                              {q.projectName || "Direct Estimation"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold uppercase text-[9px]">
                                {q.calculatorUsed || "Modular Kitchen"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-black text-indigo-600">
                              {formatCurrency(q.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                q.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : q.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}>
                                {q.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedQuote(q);
                                  setIsViewQuoteModalOpen(true);
                                }}
                                className="h-8 text-[11px] font-bold border border-slate-200 hover:bg-slate-100"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadQuotePDF(q)}
                                className="h-8 text-[11px] font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              >
                                <FileDown className="h-3.5 w-3.5" />
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

          {/* ===================== TAB 6: CUSTOMERS ===================== */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search customers by name, email..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-9 h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-bold text-sm">
                      No matching customer accounts found in records.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Customer Name</th>
                          <th className="px-4 py-3">Customer ID</th>
                          <th className="px-4 py-3">Email Address</th>
                          <th className="px-4 py-3">Phone Number</th>
                          <th className="px-4 py-3">Associated Tenant</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredCustomers.map((cust: any) => {
                          const associatedCompany = getCompanyName(cust.companyId || cust.companyCode);
                          return (
                            <tr key={cust.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-bold text-slate-900">{cust.name}</td>
                              <td className="px-4 py-3 font-mono text-slate-400 select-all">{cust.id}</td>
                              <td className="px-4 py-3 font-semibold text-slate-650">{cust.email}</td>
                              <td className="px-4 py-3 text-slate-600 font-bold">{cust.phone || "No phone"}</td>
                              <td className="px-4 py-3 font-bold text-indigo-750">{associatedCompany}</td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCustomer(cust);
                                    setIsViewCustomerModalOpen(true);
                                  }}
                                  className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                  View Customer Timeline
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
        </>
      )}

      {/* ===================== MODAL WINDOWS ===================== */}

      {/* VIEW COMPANY MODAL */}
      {isViewCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <Card className="w-full max-w-xl border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col max-h-[85vh]">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">{selectedCompany.name}</CardTitle>
                <CardDescription className="text-[10px]">Company ID: {selectedCompany.id}</CardDescription>
              </div>
              <button onClick={() => setIsViewCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Company Details</span>
                  <div className="space-y-1.5 font-semibold text-slate-700">
                    <div>Owner: <span className="font-bold text-slate-900">{selectedCompany.owner || selectedCompany.companyOwner || "N/A"}</span></div>
                    <div>Email: <span>{selectedCompany.email}</span></div>
                    <div>Phone: <span>{selectedCompany.phone || "N/A"}</span></div>
                    <div>Address: <span>{selectedCompany.address || "N/A"}</span></div>
                    <div>GST No: <span>{selectedCompany.gstNumber || "N/A"}</span></div>
                  </div>
                </div>

                <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Subscription Details</span>
                  <div className="space-y-1.5 font-semibold text-slate-700">
                    <div>Plan: <span className="font-bold text-indigo-700 uppercase">{selectedCompany.subscription?.plan || "Trial"}</span></div>
                    <div>Status: <span className="font-bold text-slate-800 uppercase">{selectedCompany.subscription?.status || "Active"}</span></div>
                    <div>Key Code: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">{selectedCompany.keyId || "None"}</span></div>
                    <div>Expiry: <span>{selectedCompany.subscription?.expiryDate ? new Date(selectedCompany.subscription.expiryDate).toLocaleDateString() : "N/A"}</span></div>
                  </div>
                </div>

                <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/50 col-span-2">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Calculator Access & Controls</span>
                  <div className="grid grid-cols-2 gap-2 font-bold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className={`h-4 w-4 ${selectedCompany.calculatorsEnabled?.construction !== false ? "text-emerald-500" : "text-slate-350"}`} />
                      <span>Construction Calculator</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className={`h-4 w-4 ${selectedCompany.calculatorsEnabled?.doors !== false ? "text-emerald-500" : "text-slate-355"}`} />
                      <span>Interior Calculator</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className={`h-4 w-4 ${selectedCompany.calculatorsEnabled?.kitchen !== false ? "text-emerald-500" : "text-slate-355"}`} />
                      <span>Modular Kitchen Calculator</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className={`h-4 w-4 ${selectedCompany.calculatorsEnabled?.wardrobe !== false ? "text-emerald-500" : "text-slate-355"}`} />
                      <span>Wardrobe Calculator</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/50 col-span-2">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Company Summary Logs</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 font-semibold">
                    <div>Employees assigned: <span className="font-bold text-slate-900">{users.filter(u => u.companyId === selectedCompany.id).length} / {selectedCompany.limits?.maxEmployees ?? 20}</span></div>
                    <div>Projects started: <span className="font-bold text-slate-900">{projects.filter(p => p.companyId === selectedCompany.id).length}</span></div>
                    <div>Quotations generated: <span className="font-bold text-slate-900">{quotes.filter(q => q.customerId === selectedCompany.id).length}</span></div>
                    <div>Last update check: <span>{selectedCompany.updatedAt ? new Date(selectedCompany.updatedAt).toLocaleString() : "N/A"}</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EDIT COMPANY & SUBSCRIPTION MODAL */}
      {isEditCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">Edit Company & Subscription Settings</CardTitle>
                <CardDescription className="text-[10px]">Alter credentials, key codes, and calculator switches.</CardDescription>
              </div>
              <button onClick={() => setIsEditCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleEditCompanySubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Company Name</Label>
                  <Input value={editCompName} onChange={(e) => setEditCompName(e.target.value)} className="h-8 text-xs border-slate-300 font-bold" required />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Company Owner</Label>
                  <Input value={editCompOwner} onChange={(e) => setEditCompOwner(e.target.value)} className="h-8 text-xs border-slate-300 font-bold" required />
                </div>

                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Owner Email</Label>
                  <Input value={editCompEmail} onChange={(e) => setEditCompEmail(e.target.value)} className="h-8 text-xs border-slate-300 font-bold" required />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Phone Number</Label>
                  <Input value={editCompPhone} onChange={(e) => setEditCompPhone(e.target.value)} className="h-8 text-xs border-slate-300 font-bold" />
                </div>

                <div className="grid gap-1 col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Registered Office Address</Label>
                  <Input value={editCompAddress} onChange={(e) => setEditCompAddress(e.target.value)} className="h-8 text-xs border-slate-300 font-bold" />
                </div>

                {/* SUBSCRIPTION SETTINGS */}
                <div className="border border-indigo-100 p-3 rounded-lg bg-indigo-50/20 col-span-2 space-y-3">
                  <span className="text-[10px] font-black uppercase text-indigo-700 block">Subscription Period Controls</span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-[9px] uppercase font-bold text-slate-500">Subscription Status</Label>
                      <select
                        className="h-8 rounded border border-slate-300 bg-white px-2 text-[11px] font-bold"
                        value={editCompStatus}
                        onChange={(e) => setEditCompStatus(e.target.value)}
                      >
                        <option value="active">Active (Subscription OK)</option>
                        <option value="suspended">Suspended (Direct Block)</option>
                        <option value="expired">Expired (Grace Period)</option>
                      </select>
                    </div>

                    <div className="grid gap-1">
                      <Label className="text-[9px] uppercase font-bold text-slate-500">Subscription Plan Tier</Label>
                      <select
                        className="h-8 rounded border border-slate-300 bg-white px-2 text-[11px] font-bold"
                        value={editCompSubPlan}
                        onChange={(e) => setEditCompSubPlan(e.target.value)}
                      >
                        <option value="trial">Trial Access</option>
                        <option value="monthly">Monthly Professional</option>
                        <option value="yearly">Yearly Corporate</option>
                      </select>
                    </div>

                    <div className="grid gap-1">
                      <Label className="text-[9px] uppercase font-bold text-slate-500">Max Employees Limit</Label>
                      <Input
                        type="number"
                        value={editCompMaxEmployees}
                        onChange={(e) => setEditCompMaxEmployees(Number(e.target.value) || 20)}
                        className="h-8 text-xs border-slate-300 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-[9px] uppercase font-bold text-slate-500">Subscription Start Date</Label>
                      <Input
                        type="date"
                        value={editCompSubStart}
                        onChange={(e) => setEditCompSubStart(e.target.value)}
                        className="h-8 text-xs border-slate-300 font-bold"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[9px] uppercase font-bold text-slate-500">Subscription Expiry Date</Label>
                      <Input
                        type="date"
                        value={editCompSubExpiry}
                        onChange={(e) => setEditCompSubExpiry(e.target.value)}
                        className="h-8 text-xs border-slate-300 font-bold"
                      />
                    </div>
                  </div>

                  {/* Extend/Reduce Period Buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => adjustSubscriptionDuration(30)}
                      className="h-7 text-[10px] font-bold border-emerald-200 text-emerald-600 bg-white hover:bg-emerald-50"
                    >
                      Extend Period (+30 Days)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => adjustSubscriptionDuration(-30)}
                      className="h-7 text-[10px] font-bold border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
                    >
                      Reduce Period (-30 Days)
                    </Button>
                  </div>
                </div>

                {/* EDIT KEY ID */}
                <div className="border border-slate-100 p-3 rounded-lg bg-slate-50 col-span-2 grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">
                    Edit Associated Registration Key Code (Invitation Key)
                  </Label>
                  <Input
                    placeholder="e.g. ABCD#12345"
                    value={editCompKey}
                    onChange={(e) => setEditCompKey(e.target.value)}
                    className="h-8 text-xs border-slate-300 font-mono font-bold text-indigo-700"
                  />
                  <p className="text-[9px] text-slate-400">
                    * The invitation key is validated during user registration checks. Must be exactly 10 characters.
                  </p>
                </div>

                {/* CALCULATOR TOGGLES */}
                <div className="border border-slate-100 p-3 rounded-lg bg-slate-50 col-span-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-2">Calculator Module Access Controls</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCompCalcs.construction}
                        onChange={(e) => setEditCompCalcs({ ...editCompCalcs, construction: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Construction Calculator</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCompCalcs.interior}
                        onChange={(e) => setEditCompCalcs({ ...editCompCalcs, interior: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Interior Calculator</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCompCalcs.kitchen}
                        onChange={(e) => setEditCompCalcs({ ...editCompCalcs, kitchen: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Modular Kitchen Calculator</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCompCalcs.wardrobe}
                        onChange={(e) => setEditCompCalcs({ ...editCompCalcs, wardrobe: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Wardrobe Calculator</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsEditCompanyModalOpen(false)} className="h-9 text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4">
                  Save Configurations
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* PROVISION COMPANY MODAL */}
      {isCreateCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col max-h-[85vh]">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">Provision Company Tenant</CardTitle>
                <CardDescription className="text-[10px]">Onboard a brand new builder or workspace account.</CardDescription>
              </div>
              <button onClick={() => setIsCreateCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleCreateCompanySubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1 col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Company Name</Label>
                  <Input value={newCompName} onChange={(e) => setNewCompName(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" required placeholder="e.g. Elite Construction Group" />
                </div>
                
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Company Email</Label>
                  <Input value={newCompEmail} onChange={(e) => setNewCompEmail(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" required placeholder="owner@company.com" />
                </div>
                
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Phone Number</Label>
                  <Input value={newCompPhone} onChange={(e) => setNewCompPhone(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" placeholder="e.g. +91 9876543210" />
                </div>

                <div className="grid gap-1 col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">GST Number</Label>
                  <Input value={newCompGst} onChange={(e) => setNewCompGst(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" placeholder="GSTIN code" />
                </div>

                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">District / City</Label>
                  <Input value={newCompDistrict} onChange={(e) => setNewCompDistrict(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" placeholder="e.g. Noida" />
                </div>
                
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">State</Label>
                  <Input value={newCompState} onChange={(e) => setNewCompState(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" placeholder="e.g. Uttar Pradesh" />
                </div>

                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Plan</Label>
                  <select
                    className="h-9 rounded border border-slate-300 bg-white px-2.5 text-xs font-bold"
                    value={newCompPlan}
                    onChange={(e) => setNewCompPlan(e.target.value)}
                  >
                    <option value="trial">Trial Access</option>
                    <option value="monthly">Monthly Professional</option>
                    <option value="yearly">Yearly Corporate</option>
                  </select>
                </div>

                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Subscription Expiry Date</Label>
                  <Input type="date" value={newCompExpiry} onChange={(e) => setNewCompExpiry(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsCreateCompanyModalOpen(false)} className="h-9 text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4">
                  Provision Tenant
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* VIEW EMPLOYEE & PERMISSIONS MODAL */}
      {isViewEmployeeModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col max-h-[80vh]">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">{selectedEmployee.name}</CardTitle>
                <CardDescription className="text-[10px]">Employee ID: {selectedEmployee.id}</CardDescription>
              </div>
              <button onClick={() => setIsViewEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 text-xs font-semibold text-slate-700">
              
              <div className="grid grid-cols-2 gap-3 border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Assigned Company</span>
                  <span className="font-bold text-slate-800">{getCompanyName(selectedEmployee.companyId || selectedEmployee.companyCode)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Company Code / Branch</span>
                  <span className="font-mono text-slate-800">{selectedEmployee.companyCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Work Designation Role</span>
                  <span className="font-bold text-indigo-700">{selectedEmployee.position || "Staff / Engineer"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Role Code</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedEmployee.role}</span>
                </div>
              </div>

              {/* Calculator access rights */}
              <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/50 space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-400 block">Calculator Modules Availability</span>
                <div className="grid grid-cols-2 gap-2 text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`h-4 w-4 ${selectedEmployee.permissions?.kitchen !== false ? "text-indigo-600" : "text-slate-350"}`} />
                    <span>Kitchen Calculator access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`h-4 w-4 ${selectedEmployee.permissions?.doors !== false ? "text-indigo-600" : "text-slate-350"}`} />
                    <span>Interior Calculator access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`h-4 w-4 ${selectedEmployee.permissions?.wardrobe !== false ? "text-indigo-600" : "text-slate-350"}`} />
                    <span>Wardrobes Calculator access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`h-4 w-4 ${selectedEmployee.permissions?.construction !== false ? "text-indigo-600" : "text-slate-350"}`} />
                    <span>Construction Calculator access</span>
                  </div>
                </div>
              </div>

              {/* Specific permissions */}
              <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/50 space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-400 block">Workspace Actions Rights</span>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-800">
                  <div className="p-2 border rounded bg-white text-center">
                    <div>Price Permission</div>
                    <span className={`text-[10px] ${selectedEmployee.permissions?.prices !== false ? "text-emerald-600" : "text-rose-600"}`}>
                      {selectedEmployee.permissions?.prices !== false ? "ENABLED" : "RESTRICTED"}
                    </span>
                  </div>
                  <div className="p-2 border rounded bg-white text-center">
                    <div>Project Permissions</div>
                    <span className={`text-[10px] ${selectedEmployee.permissions?.project?.create !== false ? "text-emerald-600" : "text-rose-600"}`}>
                      {selectedEmployee.permissions?.project?.create !== false ? "MANAGE" : "VIEW ONLY"}
                    </span>
                  </div>
                  <div className="p-2 border rounded bg-white text-center">
                    <div>Quotation Permissions</div>
                    <span className={`text-[10px] ${selectedEmployee.permissions?.quote?.delete !== false ? "text-emerald-600" : "text-rose-600"}`}>
                      {selectedEmployee.permissions?.quote?.delete !== false ? "DELETE OK" : "GENERATE ONLY"}
                    </span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW PROJECT & ESTIMATES MODAL */}
      {isViewProjectModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col max-h-[85vh]">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">{selectedProject.name}</CardTitle>
                <CardDescription className="text-[10px]">Project ID: {selectedProject.id}</CardDescription>
              </div>
              <button onClick={() => setIsViewProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 text-xs font-semibold text-slate-700">
              
              <div className="grid grid-cols-2 gap-3 border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Associated Company</span>
                  <span className="font-bold text-slate-800">{getCompanyName(selectedProject.companyId)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Name</span>
                  <span className="font-bold text-slate-800">{selectedProject.customerDetails?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Expected Delivery Target</span>
                  <span className="font-bold text-slate-700">{selectedProject.expectedCompletionDate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Project Status</span>
                  <span className="font-bold text-indigo-700 uppercase">{selectedProject.status || "active"}</span>
                </div>
              </div>

              {/* Linked Quotations */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500 block">Linked Estimations / Quotations</span>
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] bg-slate-50/50">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Quote ID</th>
                        <th className="px-3 py-2">Calculator</th>
                        <th className="px-3 py-2 text-right">Estimate Total</th>
                        <th className="px-3 py-2 text-right">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {quotes.filter((q) => q.projectId === selectedProject.id).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">No quotes linked under this project yet.</td>
                        </tr>
                      ) : (
                        quotes.filter((q) => q.projectId === selectedProject.id).map((q) => (
                          <tr key={q.id}>
                            <td className="px-3 py-2 font-mono font-bold text-indigo-900">{q.id}</td>
                            <td className="px-3 py-2 capitalize font-bold text-slate-700">{q.calculatorUsed || "Modular Kitchen"}</td>
                            <td className="px-3 py-2 text-right font-black text-indigo-600">{formatCurrency(q.totalAmount)}</td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadQuotePDF(q)}
                                className="h-6 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                              >
                                <FileDown className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {isEditProjectModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md border-slate-200 shadow-2xl bg-white overflow-hidden">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">Edit Project Folder</CardTitle>
                <CardDescription className="text-[10px]">Alter project workspace metadata.</CardDescription>
              </div>
              <button onClick={() => setIsEditProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleEditProjectSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Project Name</Label>
                  <Input value={editProjName} onChange={(e) => setEditProjName(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" required />
                </div>
                
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Project Status</Label>
                  <select
                    className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-bold"
                    value={editProjStatus}
                    onChange={(e) => setEditProjStatus(e.target.value)}
                  >
                    <option value="active">Active (Ongoing)</option>
                    <option value="closed">Closed (Finished)</option>
                    <option value="suspended">On Hold</option>
                  </select>
                </div>

                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Project Budget / Reference Notes</Label>
                  <Input value={editProjBudget} onChange={(e) => setEditProjBudget(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" placeholder="e.g. Rs. 3,50,000" />
                </div>

                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Target Delivery Completion Date</Label>
                  <Input type="date" value={editProjExpiry} onChange={(e) => setEditProjExpiry(e.target.value)} className="h-9 text-xs border-slate-300 font-bold" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsEditProjectModalOpen(false)} className="h-9 text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* VIEW QUOTATION DETAILED SUMMARY */}
      {isViewQuoteModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col max-h-[85vh]">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">Quotation Summary details</CardTitle>
                <CardDescription className="text-[10px] font-mono">Reference: {selectedQuote.id}</CardDescription>
              </div>
              <button onClick={() => setIsViewQuoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-3 border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                <div className="col-span-2 bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg flex justify-between items-center text-indigo-900 font-black">
                  <span>Grand Total Estimate</span>
                  <span>{formatCurrency(selectedQuote.totalAmount || 0)}</span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Name</span>
                  <span className="font-bold text-slate-900">{selectedQuote.customerName}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Email</span>
                  <span className="font-bold text-slate-800">{selectedQuote.customerEmail || "N/A"}</span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Phone</span>
                  <span className="font-bold text-slate-800">{selectedQuote.customerPhone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">City / Pincode</span>
                  <span className="font-bold text-slate-800">{selectedQuote.customerLocation || "N/A"}</span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Calculator Model Used</span>
                  <span className="font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded text-[9px] inline-block mt-0.5">
                    {selectedQuote.calculatorUsed || "Modular Kitchen"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Project Scope</span>
                  <span className="font-bold text-slate-800">{selectedQuote.projectType}</span>
                </div>

                <div className="col-span-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Target Project Workspace</span>
                  <span className="font-bold text-slate-800">{selectedQuote.projectName || "Direct Estimate (No Folder Linked)"}</span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Created On</span>
                  <span className="font-bold text-slate-700">{selectedQuote.createdAt ? new Date(selectedQuote.createdAt).toLocaleDateString() : "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Timestamp</span>
                  <span className="font-bold text-slate-700">{selectedQuote.createdAt ? new Date(selectedQuote.createdAt).toLocaleTimeString() : "N/A"}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button onClick={() => downloadQuotePDF(selectedQuote)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9">
                  <FileDown className="h-4 w-4 mr-1.5" /> Download Estimate PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW CUSTOMER TIMELINE MODAL */}
      {isViewCustomerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl border-slate-200 shadow-2xl bg-white overflow-hidden flex flex-col max-h-[85vh]">
            <CardHeader className="py-4 border-b border-slate-150 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-800">Customer Timeline Logs</CardTitle>
                <CardDescription className="text-[10px]">Registry audit of {selectedCustomer.name}</CardDescription>
              </div>
              <button onClick={() => setIsViewCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 text-xs font-semibold text-slate-700">
              
              <div className="grid grid-cols-2 gap-3 border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Name</span>
                  <span className="font-bold text-slate-900">{selectedCustomer.name}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Email Address</span>
                  <span className="font-bold text-slate-800">{selectedCustomer.email}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                  <span className="font-bold text-slate-800">{selectedCustomer.phone || "No phone"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Tenant Company Provider</span>
                  <span className="font-bold text-indigo-700">
                    {getCompanyName(selectedCustomer.companyId || selectedCustomer.companyCode)}
                  </span>
                </div>
              </div>

              {/* TIMELINE STEPS */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-500 block">Chronological Activity Log</span>
                
                <div className="relative border-l-2 border-slate-200 pl-5 ml-2.5 space-y-4 py-1">
                  
                  {/* Step 1: Customer Registration */}
                  <div className="relative">
                    <span className="absolute -left-[26px] top-0.5 bg-indigo-50 border-2 border-indigo-600 rounded-full h-3 w-3"></span>
                    <div>
                      <div className="font-bold text-slate-800 text-[11px]">Customer Record Registered</div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        Added to system database registries.
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Date: {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Projects Joined */}
                  {projects.filter((p) => p.customerDetails?.email === selectedCustomer.email).map((proj) => (
                    <div key={proj.id} className="relative">
                      <span className="absolute -left-[26px] top-0.5 bg-emerald-50 border-2 border-emerald-600 rounded-full h-3 w-3"></span>
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">Joined Project Workspace</div>
                        <div className="text-[10px] text-slate-655 font-bold mt-0.5">
                          Project: <span className="text-indigo-600 font-black">"{proj.name}"</span> (Status: {proj.status})
                        </div>
                        {proj.timeline && proj.timeline.length > 0 && (
                          <div className="text-[9px] text-slate-400 italic mt-0.5">
                            * {proj.timeline[0].notes || "Project folder initialized."}
                          </div>
                        )}
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Created: {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Step 3: Quotations Generated */}
                  {quotes.filter((q) => q.customerEmail === selectedCustomer.email).map((q) => (
                    <div key={q.id} className="relative">
                      <span className="absolute -left-[26px] top-0.5 bg-purple-50 border-2 border-purple-600 rounded-full h-3 w-3"></span>
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">Quotation Estimate Generated</div>
                        <div className="text-[10px] text-slate-650 font-bold mt-0.5">
                          Quote ID: <span className="font-mono">{q.id}</span> | Model: {q.calculatorUsed || "Modular Kitchen"}
                        </div>
                        <div className="text-[10px] font-black text-indigo-600">
                          Estimate Amount: {formatCurrency(q.totalAmount)}
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Generated: {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  ))}

                </div>

              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
