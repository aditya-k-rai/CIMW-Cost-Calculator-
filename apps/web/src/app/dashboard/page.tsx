"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Calculator,
  ChefHat,
  DoorOpen,
  Layers3,
  Send,
  ShoppingCart,
  Trash2,
  LogOut,
  User,
  Plus,
  PlusCircle,
  X,
  Lock,
  Phone,
  FileText,
  Folder,
  Calendar,
  Clock,
  Edit,
  Copy,
  Check,
  CheckSquare,
  FileDown,
  Printer
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateConstruction,
  constructionConfig,
  constructionInputSchema,
  quoteSchema,
  type ConstructionInput,
  type QuoteInput,
  type CalculatorMethod
} from "@cost-calculator/shared";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Extend jsPDF types for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: any;
  }
}

type WorkspaceTab = "overview" | "projects" | "construction" | "modular-kitchen" | "interior" | "wardrobe" | "quote" | "employees" | "quote-history";

type CartItem = {
  id: string;
  productId: string;
  calculator: "modular-kitchen" | "wardrobe";
  name: string;
  category: string;
  unit: string;
  rate: number;
  quantity: number;
  variant?: string;
};

// Door selection configuration interfaces
interface DoorConfigRow {
  id: string;
  floor: string;
  area: string;
  templateId: string;
  variantId: string;
  finishId: string;
  addons: Array<{ addonId: string; quantity: number }>;
  doorQuantity: number;
}

const tabs: Array<{ id: WorkspaceTab; label: string; icon: any }> = [
  { id: "construction", label: "Construction", icon: Building2 },
  { id: "modular-kitchen", label: "Kitchen", icon: ChefHat },
  { id: "interior", label: "Interior", icon: DoorOpen },
  { id: "wardrobe", label: "Wardrobe", icon: Layers3 },
  { id: "quote", label: "Quote", icon: Send }
];

const methodLabels: Record<CalculatorMethod, string> = {
  costPerSqFt: "Cost per sq ft",
  materialPercentage: "Material breakdown",
  quantityEstimation: "Quantity estimate",
  timeline: "Timeline cash-flow"
};

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const isSubscriptionExpired = user?.companySubscriptionStatus === "expired";

  const formatCurrency = (amount: number) => {
    if (user?.role === "employee" && user.permissions?.pricing === "hide") {
      return "Hidden";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [employees, setEmployees] = useState<any[]>([]);
  const [quoteList, setQuoteList] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Employee detail permission editor states
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedEmployeeRole, setSelectedEmployeeRole] = useState<string>("Site Engineer");
  const [calcsAccess, setCalcsAccess] = useState<any>({ construction: true, interior: true, kitchen: true, wardrobe: true });
  const [priceMode, setPriceMode] = useState<string>("show");
  const [quotePerms, setQuotePerms] = useState<any>({ create: true, edit: true, delete: true, duplicate: true, downloadPdf: true, print: true });
  const [projPerms, setProjPerms] = useState<any>({ access: true, create: true, edit: true, close: true, uploadImages: true, updateProgress: true });

  // Project management states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projName, setProjName] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [projExpectedDate, setProjExpectedDate] = useState("");
  const [projAssignedEmployees, setProjAssignedEmployees] = useState<string[]>([]);
  const [projNotes, setProjNotes] = useState("");
  const [projProgressInput, setProjProgressInput] = useState(0);
  const [projImageInput, setProjImageInput] = useState("");
  const [timelineTitleInput, setTimelineTitleInput] = useState("");
  const [timelineNotesInput, setTimelineNotesInput] = useState("");

  const [selectedProjectIdForQuote, setSelectedProjectIdForQuote] = useState("");

  const ROLE_PRESETS = {
    "Site Engineer": {
      calculators: { construction: true, interior: false, kitchen: false, wardrobe: false },
      pricingMode: "hide",
      quote: { create: true, edit: false, delete: false, duplicate: false, downloadPdf: true, print: true },
      project: { access: true, create: false, edit: false, close: false, uploadImages: true, updateProgress: true }
    },
    "Project Manager": {
      calculators: { construction: true, interior: true, kitchen: true, wardrobe: true },
      pricingMode: "show",
      quote: { create: true, edit: true, delete: false, duplicate: true, downloadPdf: true, print: true },
      project: { access: true, create: true, edit: true, close: true, uploadImages: true, updateProgress: true }
    },
    "Interior Designer": {
      calculators: { construction: false, interior: true, kitchen: true, wardrobe: true },
      pricingMode: "show",
      quote: { create: true, edit: true, delete: false, duplicate: true, downloadPdf: true, print: true },
      project: { access: true, create: false, edit: false, close: false, uploadImages: true, updateProgress: true }
    },
    "Business Development Executive": {
      calculators: { construction: true, interior: true, kitchen: true, wardrobe: true },
      pricingMode: "no-prices",
      quote: { create: true, edit: true, delete: false, duplicate: true, downloadPdf: true, print: true },
      project: { access: true, create: false, edit: false, close: false, uploadImages: false, updateProgress: false }
    }
  };

  // Parsed user permissions dictionary
  const userPermissions = useMemo(() => {
    if (!user) return {};
    try {
      return typeof user.permissions === "string" ? JSON.parse(user.permissions) : (user.permissions || {});
    } catch {
      return user.permissions || {};
    }
  }, [user]);

  const hasConstructionAccess = user?.role !== "employee" || userPermissions.calculators?.construction !== false;
  const hasKitchenAccess = user?.role !== "employee" || userPermissions.calculators?.kitchen !== false;
  const hasInteriorAccess = user?.role !== "employee" || userPermissions.calculators?.doors !== false;
  const hasWardrobeAccess = user?.role !== "employee" || userPermissions.calculators?.wardrobe !== false;

  const formatIndividualPrice = (amount: number) => {
    const mode = userPermissions.pricingMode;
    if (user?.role === "employee" && (mode === "hide" || mode === "no-prices")) {
      return "Hidden";
    }
    return formatCurrency(amount);
  };

  const formatTotalAmount = (amount: number) => {
    const mode = userPermissions.pricingMode;
    if (user?.role === "employee" && mode === "no-prices") {
      return "Hidden";
    }
    return formatCurrency(amount);
  };

  // Memoized tabs configuration based on role
  const availableTabs = useMemo(() => {
    const role = user?.role;
    const perms = userPermissions;
    
    const standardTabs = [
      { id: "overview" as WorkspaceTab, label: "Overview", icon: Calculator },
      { id: "construction" as WorkspaceTab, label: "Construction", icon: Building2 },
      { id: "modular-kitchen" as WorkspaceTab, label: "Kitchen", icon: ChefHat },
      { id: "interior" as WorkspaceTab, label: "Interior", icon: DoorOpen },
      { id: "wardrobe" as WorkspaceTab, label: "Wardrobe", icon: Layers3 },
      { id: "quote" as WorkspaceTab, label: "New Quote", icon: Send },
      { id: "quote-history" as WorkspaceTab, label: "Quotation History", icon: FileText }
    ];

    if (role === "company") {
      return [
        { id: "overview" as WorkspaceTab, label: "Overview", icon: Calculator },
        { id: "construction" as WorkspaceTab, label: "Construction", icon: Building2 },
        { id: "modular-kitchen" as WorkspaceTab, label: "Kitchen", icon: ChefHat },
        { id: "interior" as WorkspaceTab, label: "Interior", icon: DoorOpen },
        { id: "wardrobe" as WorkspaceTab, label: "Wardrobe", icon: Layers3 },
        { id: "projects" as WorkspaceTab, label: "Projects", icon: Folder },
        { id: "quote" as WorkspaceTab, label: "New Quote", icon: Send },
        { id: "quote-history" as WorkspaceTab, label: "Quotation History", icon: FileText }
      ];
    }

    if (role === "employee") {
      const showProjects = perms.project?.access !== false;
      return [
        { id: "overview" as WorkspaceTab, label: "Overview", icon: Calculator },
        ...(perms.calculators?.construction !== false ? [{ id: "construction" as WorkspaceTab, label: "Construction", icon: Building2 }] : []),
        ...(perms.calculators?.kitchen !== false ? [{ id: "modular-kitchen" as WorkspaceTab, label: "Kitchen", icon: ChefHat }] : []),
        ...(perms.calculators?.doors !== false ? [{ id: "interior" as WorkspaceTab, label: "Interior", icon: DoorOpen }] : []),
        ...(perms.calculators?.wardrobe !== false ? [{ id: "wardrobe" as WorkspaceTab, label: "Wardrobe", icon: Layers3 }] : []),
        ...(showProjects ? [{ id: "projects" as WorkspaceTab, label: "Projects", icon: Folder }] : []),
        { id: "quote" as WorkspaceTab, label: "New Quote", icon: Send },
        { id: "quote-history" as WorkspaceTab, label: "Quotation History", icon: FileText }
      ];
    }

    return standardTabs;
  }, [user, userPermissions]);

  const userProjects = useMemo(() => {
    if (!user) return [];
    if (user.role === "company") return projects;
    return projects.filter(p => p.assignedEmployeeIds && p.assignedEmployeeIds.includes(user.id));
  }, [projects, user]);

  // Load employee logs
  async function loadEmployees() {
    try {
      const data = await api.auth.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      console.error("Failed to load employees:", err.message);
    }
  }

  // Load quote history
  async function loadQuoteHistory() {
    try {
      const data = await api.quotes.get();
      setQuoteList(data || []);
    } catch (err: any) {
      console.error("Failed to load quote history:", err.message);
    }
  }

  async function loadAllDashboardData() {
    try {
      const p = await api.projects.get();
      setProjects(p || []);
    } catch (err) {
      console.warn("Failed to load projects:", err);
    }
    if (user?.role === "company") {
      void loadEmployees();
    }
    void loadQuoteHistory();
  }

  useEffect(() => {
    if (user) {
      void loadAllDashboardData();
    }
  }, [user]);

  // Custom presets template applicator
  function applyRoleTemplate(roleName: string) {
    setSelectedEmployeeRole(roleName);
    const preset = ROLE_PRESETS[roleName as keyof typeof ROLE_PRESETS];
    if (preset) {
      setCalcsAccess(preset.calculators);
      setPriceMode(preset.pricingMode);
      setQuotePerms(preset.quote);
      setProjPerms(preset.project);
    }
  }

  async function handleSaveEmployeePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      const permissionsPayload = {
        calculators: calcsAccess,
        pricingMode: priceMode,
        quote: quotePerms,
        project: projPerms
      };
      await api.auth.updateEmployeePermissions(selectedEmployee.id, permissionsPayload, selectedEmployeeRole);
      alert("Employee role and permissions updated successfully!");
      setSelectedEmployee(null);
      void loadAllDashboardData();
    } catch (err: any) {
      alert("Failed to update employee permissions: " + err.message);
    }
  }
  
  // Data lists loaded from NestJS
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [woodworkConfig, setWoodworkConfig] = useState<any[]>([]);
  const [doorData, setDoorData] = useState<any>(null);
  
  // State variables for calculations
  const [constructionResult, setConstructionResult] = useState<any>(null);
  const [woodworkArea, setWoodworkArea] = useState<number>(0);
  const [selectedWoodworkOptions, setSelectedWoodworkOptions] = useState<Record<string, string>>({});
  
  // Custom door rows list
  const [doorRows, setDoorRows] = useState<DoorConfigRow[]>([
    {
      id: "row_1",
      floor: "Ground Floor",
      area: "Bathroom",
      templateId: "",
      variantId: "",
      finishId: "",
      addons: [],
      doorQuantity: 1
    }
  ]);

  // Catalog cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);

  const constructionForm = useForm<any>({
    resolver: zodResolver(constructionInputSchema),
    defaultValues: {
      carpetArea: 1000,
      quality: "standard",
      timeline: "6-months",
      methods: ["costPerSqFt", "materialPercentage", "quantityEstimation", "timeline"]
    }
  });

  const quoteForm = useForm<any>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      projectType: "combined",
      city: "",
      budgetRange: "",
      notes: ""
    }
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Load configuration from API
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        const [prodList, woodworkList, doors] = await Promise.all([
          api.products.get(),
          api.woodwork.get(),
          api.doors.getAll()
        ]);
        setDbProducts(prodList);
        setWoodworkConfig(woodworkList);
        setDoorData(doors);
        
        // Preset first template for door rows if available
        if (doors?.templates?.length > 0) {
          setDoorRows([
            {
              id: "row_1",
              floor: doors.settings.floorOptions[0] || "Ground Floor",
              area: doors.settings.areaOptions[0] || "Bathroom",
              templateId: doors.templates[0].id,
              variantId: "",
              finishId: "",
              addons: [],
              doorQuantity: 1
            }
          ]);
        }
      } catch (err: any) {
        console.error("Failed to load dashboard data:", err.message);
      }
    }

    void loadData();
  }, [user]);

  // Run initial construction calculations
  useEffect(() => {
    const defaultVals = constructionForm.getValues();
    setConstructionResult(calculateConstruction(defaultVals));
  }, []);

  // Calculate cost per sq ft for woodwork
  const woodworkCostPerSqFt = useMemo(() => {
    let sum = 0;
    woodworkConfig.forEach((item) => {
      const selectedOptId = selectedWoodworkOptions[item.id];
      if (selectedOptId) {
        const option = item.options.find((o: any) => o.id === selectedOptId);
        if (option) {
          sum += option.price;
        }
      }
    });
    return sum;
  }, [woodworkConfig, selectedWoodworkOptions]);

  const woodworkTotalCost = useMemo(() => woodworkArea * woodworkCostPerSqFt, [woodworkArea, woodworkCostPerSqFt]);

  // Calculate door configuration totals
  const doorCalculatedRows = useMemo(() => {
    if (!doorData) return [];

    return doorRows.map((row) => {
      const template = doorData.templates.find((t: any) => t.id === row.templateId);
      const variant = doorData.variants.find((v: any) => v.id === row.variantId);
      const finish = doorData.finishes.find((f: any) => f.id === row.finishId);

      let addonsCost = 0;
      row.addons.forEach((addonSelection) => {
        const addon = doorData.addons.find((a: any) => a.id === addonSelection.addonId);
        if (addon) {
          addonsCost += addon.price * addonSelection.quantity;
        }
      });

      const basePrice = (variant?.basePrice || 0) + (finish?.priceValue || 0) + addonsCost;
      const totalAmount = basePrice * row.doorQuantity;

      return {
        ...row,
        templateName: template?.name || "None Selected",
        variantName: variant?.name || "None Selected",
        finishName: finish?.name || "None Selected",
        basePrice,
        totalAmount
      };
    });
  }, [doorRows, doorData]);

  const doorsSubtotal = useMemo(() => {
    return doorCalculatedRows.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [doorCalculatedRows]);

  const doorsTaxAmount = useMemo(() => {
    const taxRate = doorData?.settings?.taxPercent || 18;
    return (doorsSubtotal * taxRate) / 100;
  }, [doorsSubtotal, doorData]);

  const doorsInstallation = useMemo(() => {
    if (!doorData) return 0;
    const { installationCharges, installationType } = doorData.settings;
    if (installationType === "per_unit") {
      const qty = doorRows.reduce((sum, r) => sum + r.doorQuantity, 0);
      return installationCharges * qty;
    }
    return installationCharges; // flat charges
  }, [doorRows, doorData]);

  const doorsGrandTotal = useMemo(() => {
    return doorsSubtotal + doorsTaxAmount + doorsInstallation;
  }, [doorsSubtotal, doorsTaxAmount, doorsInstallation]);

  // Overall Cart totals
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.rate * item.quantity, 0), [cart]);

  // Group items by category for summary displays
  const groupedCartTotal = useMemo(() => {
    const kitchen = cart.filter((item) => item.calculator === "modular-kitchen").reduce((sum, item) => sum + item.rate * item.quantity, 0) + woodworkTotalCost;
    const wardrobe = cart.filter((item) => item.calculator === "wardrobe").reduce((sum, item) => sum + item.rate * item.quantity, 0);
    return {
      kitchen,
      wardrobe,
      doors: doorsGrandTotal,
      grandTotal: kitchen + wardrobe + doorsGrandTotal
    };
  }, [cart, woodworkTotalCost, doorsGrandTotal]);

  // Form toggles
  function toggleMethod(method: CalculatorMethod) {
    const methods = constructionForm.getValues("methods");
    const next = methods.includes(method) ? methods.filter((item: any) => item !== method) : [...methods, method];
    constructionForm.setValue("methods", next, { shouldValidate: true });
  }

  // Cart modifications
  function addToCart(product: any, quantity: number, rate: number, variantName?: string) {
    const itemKey = `${product.id}-${variantName ?? "base"}`;
    setCart((current) => {
      const existing = current.find((item) => item.id === itemKey);
      if (existing) {
        return current.map((item) =>
          item.id === itemKey ? { ...item, quantity: item.quantity + quantity, rate } : item
        );
      }
      return [
        ...current,
        {
          id: itemKey,
          productId: product.id,
          calculator: product.calculator,
          name: product.name,
          category: product.category,
          unit: product.unit,
          rate,
          quantity,
          variant: variantName
        }
      ];
    });
  }

  function updateCartQuantity(id: string, quantity: number) {
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  }

  function removeFromCart(id: string) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  // Doors Configuration methods
  function addDoorRow() {
    if (!doorData) return;
    const newRow: DoorConfigRow = {
      id: `row_${Date.now()}`,
      floor: doorData.settings.floorOptions[0] || "Ground Floor",
      area: doorData.settings.areaOptions[0] || "Bathroom",
      templateId: doorData.templates[0]?.id || "",
      variantId: "",
      finishId: "",
      addons: [],
      doorQuantity: 1
    };
    setDoorRows((prev) => [...prev, newRow]);
  }

  function removeDoorRow(id: string) {
    if (doorRows.length === 1) return;
    setDoorRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateDoorRow(id: string, updates: Partial<DoorConfigRow>) {
    setDoorRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        
        // Reset dependent fields if template changes
        const updated = { ...row, ...updates };
        if (updates.templateId !== undefined) {
          updated.variantId = "";
          updated.finishId = "";
          updated.addons = [];
        } else if (updates.variantId !== undefined) {
          updated.finishId = "";
        }
        return updated;
      })
    );
  }

  function toggleDoorAddon(rowId: string, addonId: string) {
    setDoorRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const exists = row.addons.some((a) => a.addonId === addonId);
        const updatedAddons = exists
          ? row.addons.filter((a) => a.addonId !== addonId)
          : [...row.addons, { addonId, quantity: 1 }];
        return { ...row, addons: updatedAddons };
      })
    );
  }

  function updateDoorAddonQty(rowId: string, addonId: string, qty: number) {
    setDoorRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updatedAddons = row.addons.map((a) =>
          a.addonId === addonId ? { ...a, quantity: Math.max(1, qty) } : a
        );
        return { ...row, addons: updatedAddons };
      })
    );
  }

  // Handle construction submit
  async function submitConstruction(values: ConstructionInput) {
    try {
      const res = await api.calculations.calculateConstruction(values);
      setConstructionResult(res);
    } catch {
      setConstructionResult(calculateConstruction(values));
    }
  }

  // Submit quote
  async function submitQuote(values: any) {
    if (user?.role === "employee" && userPermissions.quote?.create === false) {
      alert("You do not have permission to create quotations.");
      return;
    }

    setQuoteLoading(true);
    setQuoteMessage("");

    let calculatorUsed = "modular-kitchen";
    if (cart.some(item => item.calculator === "wardrobe")) {
      calculatorUsed = "wardrobe";
    } else if (doorsSubtotal > 0) {
      calculatorUsed = "interior";
    } else if (constructionResult) {
      calculatorUsed = "construction";
    }

    const selectedProj = projects.find(p => p.id === selectedProjectIdForQuote);

    const payload = {
      ...values,
      totalAmount: groupedCartTotal.grandTotal,
      products: cart,
      woodwork: {
        area: woodworkArea,
        selections: selectedWoodworkOptions,
        total: woodworkTotalCost
      },
      doors: {
        rows: doorCalculatedRows,
        subtotal: doorsSubtotal,
        tax: doorsTaxAmount,
        installation: doorsInstallation,
        total: doorsGrandTotal
      },
      projectId: selectedProjectIdForQuote || null,
      projectName: selectedProj ? selectedProj.name : null,
      calculatorUsed,
      createdByUserId: user?.id || "unknown"
    };

    try {
      const res = await api.quotes.create(payload);

      // Save to Firebase Database
      try {
        await addDoc(collection(db, "quotes"), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      } catch (fbErr: any) {
        console.error("Firebase Database write failed:", fbErr);
      }

      setQuoteMessage(res.message || "Quote request submitted successfully!");
      quoteForm.reset();
      setCart([]);
      setWoodworkArea(0);
      setSelectedWoodworkOptions({});
      setSelectedProjectIdForQuote("");
      void loadAllDashboardData();
    } catch (err: any) {
      setQuoteMessage(`Quote capturing issue: ${err.message}`);
    } finally {
      setQuoteLoading(false);
    }
  }

  // PDF generation
  function downloadPDF() {
    if (user?.role === "employee" && userPermissions.quote?.downloadPdf === false) {
      alert("You do not have permission to download quotation PDFs.");
      return;
    }
    const doc = new jsPDF();
    const customer = quoteForm.getValues("customerName") || user?.name || "Customer";
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Project Cost Estimate", 14, 20);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 27);
    doc.text(`Client: ${customer}`, 14, 33);
    doc.text(`Phone: ${quoteForm.getValues("phone") || "N/A"}`, 14, 39);
    
    let currentY = 48;

    // Woodwork section
    if (woodworkArea > 0) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("1. Modular Kitchen Woodwork Details", 14, currentY);
      currentY += 6;

      const woodworkRows = woodworkConfig.map((item) => {
        const optId = selectedWoodworkOptions[item.id];
        const opt = item.options.find((o: any) => o.id === optId);
        return [
          item.name,
          opt ? `${opt.name} (Rs. ${opt.price}/sqft)` : "Not selected",
          opt ? `Rs. ${(opt.price * woodworkArea).toLocaleString("en-IN")}` : "Rs. 0"
        ];
      });

      doc.autoTable({
        startY: currentY,
        head: [["Kitchen Woodwork Component", "Selected Material/Finish", "Cost Estimate"]],
        body: [
          ...woodworkRows,
          [{ content: "Kitchen Woodwork Subtotal", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } }, `Rs. ${woodworkTotalCost.toLocaleString("en-IN")}`]
        ],
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Door Configuration Section
    if (doorsSubtotal > 0) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("2. Interior Doors Details", 14, currentY);
      currentY += 6;

      const doorsRows = doorCalculatedRows.map((row) => {
        return [
          `${row.floor} - ${row.area}`,
          `${row.templateName} (${row.variantName}) + ${row.finishName}`,
          `${row.doorQuantity} unit(s)`,
          `Rs. ${row.totalAmount.toLocaleString("en-IN")}`
        ];
      });

      doc.autoTable({
        startY: currentY,
        head: [["Location", "Door Specification Details", "Qty", "Subtotal"]],
        body: [
          ...doorsRows,
          [{ content: "Doors Subtotal", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } }, `Rs. ${doorsSubtotal.toLocaleString("en-IN")}`],
          [{ content: `Tax (${doorData?.settings?.taxPercent || 18}%)`, colSpan: 3, styles: { halign: "right" } }, `Rs. ${doorsTaxAmount.toLocaleString("en-IN")}`],
          [{ content: "Installation Charges", colSpan: 3, styles: { halign: "right" } }, `Rs. ${doorsInstallation.toLocaleString("en-IN")}`],
          [{ content: "Doors Grand Total", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } }, `Rs. ${doorsGrandTotal.toLocaleString("en-IN")}`]
        ],
        theme: "striped",
        headStyles: { fillColor: [14, 165, 233] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Catalog items
    if (cart.length > 0) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("3. Catalog Items (Accessories & Fittings)", 14, currentY);
      currentY += 6;

      const cartRows = cart.map((item) => [
        item.name,
        item.variant || "Standard",
        `Rs. ${item.rate.toLocaleString("en-IN")}`,
        `${item.quantity} ${item.unit}`,
        `Rs. ${(item.rate * item.quantity).toLocaleString("en-IN")}`
      ]);

      doc.autoTable({
        startY: currentY,
        head: [["Product Item", "Specification", "Rate", "Quantity", "Amount"]],
        body: [
          ...cartRows,
          [{ content: "Catalog Subtotal", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } }, `Rs. ${cartTotal.toLocaleString("en-IN")}`]
        ],
        theme: "striped",
        headStyles: { fillColor: [5, 150, 105] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Final Summary page segment
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("4. Project Totals Summary", 14, currentY);
    currentY += 6;

    doc.autoTable({
      startY: currentY,
      body: [
        ["Modular Kitchen Total", `Rs. ${groupedCartTotal.kitchen.toLocaleString("en-IN")}`],
        ["Wardrobes Total", `Rs. ${groupedCartTotal.wardrobe.toLocaleString("en-IN")}`],
        ["Custom Doors Total", `Rs. ${groupedCartTotal.doors.toLocaleString("en-IN")}`],
        [{ content: "Grand Estimate Total", styles: { fontStyle: "bold", fontSize: 12 } }, { content: `Rs. ${groupedCartTotal.grandTotal.toLocaleString("en-IN")}`, styles: { fontStyle: "bold", fontSize: 12, textColor: [79, 70, 229] } }]
      ],
      theme: "plain",
      styles: { cellPadding: 4 }
    });

    doc.save(`Quotation_${customer.replace(/\s+/g, "_")}.pdf`);
  }

  // Direct WhatsApp share links
  function getWhatsAppUrl() {
    const customer = quoteForm.getValues("customerName") || user?.name || "Customer";
    const waPhone = doorData?.settings?.whatsappNumber || "919582581238";
    
    let text = `*New Quote Request from ${customer}*\n`;
    text += `*Date:* ${new Date().toLocaleDateString()}\n`;
    text += `*City:* ${quoteForm.getValues("city") || "N/A"}\n\n`;
    
    if (woodworkArea > 0) {
      text += `*1. Modular Kitchen woodwork area:* ${woodworkArea} sqft\n`;
      text += `*Estimate kitchen total:* Rs. ${groupedCartTotal.kitchen.toLocaleString("en-IN")}\n\n`;
    }
    
    if (doorsSubtotal > 0) {
      text += `*2. Custom Doors:* ${doorRows.length} configurations\n`;
      text += `*Estimate doors total:* Rs. ${doorsGrandTotal.toLocaleString("en-IN")}\n\n`;
    }
    
    if (cart.length > 0) {
      text += `*3. Addon/Wardrobe Items:* ${cart.length} items\n\n`;
    }

    text += `*Estimated Grand Total:* Rs. ${groupedCartTotal.grandTotal.toLocaleString("en-IN")}\n`;
    text += `_Generated via React/NestJS Calculator Portal_`;

    return `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">Validating workspace session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Cost Calculator</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Modern Cost Estimator monorepo workspace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-2 pr-3 text-sm text-slate-700">
              <User className="h-4 w-4 text-slate-500" />
              <span className="font-medium max-w-[120px] truncate">{user.name}</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                {user.role}
              </span>
            </div>
            
            {user.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin")}
                className="hidden border-indigo-200 text-indigo-600 hover:bg-indigo-50 sm:flex"
              >
                Admin Panel
              </Button>
            )}

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

      {/* Main Grid Workspace */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        
        {/* Navigation Sidebar */}
        <aside className="lg:sticky lg:top-[90px] lg:self-start space-y-4">
          <nav className="grid gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              const isLocked = false;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-11 items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition-all ${
                    selected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    <span>{tab.label}</span>
                  </div>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                </button>
              );
            })}
          </nav>

          {/* Configuration Estimate summary card */}
          {activeTab !== "construction" && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
                <h3 className="text-sm font-bold">Calculation Cart</h3>
              </div>
              <CardContent className="p-4 space-y-3.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Modular Kitchen</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(groupedCartTotal.kitchen)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Wardrobe Items</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(groupedCartTotal.wardrobe)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Interior Doors</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(groupedCartTotal.doors)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-600 uppercase">Grand Total</span>
                  <span className="text-base font-bold text-indigo-600">{formatCurrency(groupedCartTotal.grandTotal)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Tab Workspaces */}
        <section className="min-w-0">
          
          {isSubscriptionExpired ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-slate-200 shadow-md bg-white p-8 text-center max-w-xl mx-auto space-y-4 border-t-4 border-t-red-500 mt-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mx-auto">
                  <X className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Subscription Expired</h2>
                <p className="text-sm text-red-600 leading-relaxed font-bold">
                  Please Renew.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your parent company subscription plan is currently expired or suspended. All cost calculations and quote generators have been temporarily disabled.
                </p>
                <p className="text-xs text-slate-400">
                  Please ask your company administrator to complete payment to restore access.
                </p>
              </Card>
            </motion.div>
          ) : ((activeTab === "construction" && !hasConstructionAccess) || (activeTab === "modular-kitchen" && !hasKitchenAccess) || (activeTab === "interior" && !hasInteriorAccess) || (activeTab === "wardrobe" && !hasWardrobeAccess)) ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-slate-200 shadow-md bg-white p-8 text-center max-w-xl mx-auto space-y-4 border-t-4 border-t-amber-500 mt-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mx-auto">
                  <Lock className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Workspace Locked</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Access to the <span className="font-bold text-indigo-600 capitalize">{activeTab.replace("-", " ")}</span> calculator has been restricted by your administrator or parent company.
                </p>
                <p className="text-xs text-slate-400">
                  Please contact support or your account administrator to unlock this module.
                </p>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* TAB 1: CONSTRUCTION */}
              {activeTab === "construction" && constructionResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[45%_55%]">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg">Construction Parameters</CardTitle>
                  <CardDescription>Configure floor sizing, material quality grade, and timeline schedules.</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <form className="space-y-5" onSubmit={constructionForm.handleSubmit(submitConstruction)}>
                    <div className="grid gap-2">
                      <Label htmlFor="carpetArea" className="font-medium text-slate-700">Carpet Area (sq ft)</Label>
                      <Input id="carpetArea" type="number" className="border-slate-300 focus:ring-indigo-500" {...constructionForm.register("carpetArea")} />
                      {constructionForm.formState.errors.carpetArea && (
                        <p className="text-xs text-red-600 font-medium">{constructionForm.formState.errors.carpetArea.message as any}</p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label className="font-medium text-slate-700">Material Quality Preset</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {Object.entries(constructionConfig.qualityPresets).map(([key, preset]) => (
                          <label
                            key={key}
                            className="relative flex flex-col rounded-xl border border-slate-200 p-3.5 cursor-pointer hover:bg-slate-50/50 transition-all has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50/20"
                          >
                            <input className="sr-only" type="radio" value={key} {...constructionForm.register("quality")} />
                            <span className="font-bold text-slate-900 text-sm">{preset.name}</span>
                            <span className="mt-1 text-xs font-semibold text-emerald-600">{formatCurrency(preset.defaultPerSqFt)}/sqft</span>
                            <span className="mt-2 text-[10px] leading-relaxed text-slate-500">{preset.description}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Label className="font-medium text-slate-700">Calculated Deliverables</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(Object.keys(methodLabels) as CalculatorMethod[]).map((method) => (
                          <label
                            key={method}
                            className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-50/55 transition-all"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={constructionForm.watch("methods").includes(method)}
                              onChange={() => toggleMethod(method)}
                            />
                            {methodLabels[method]}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="timeline" className="font-medium text-slate-700">Project Duration (Timeline)</Label>
                      <select
                        id="timeline"
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        {...constructionForm.register("timeline")}
                      >
                        {Object.keys(constructionConfig.timelineDistributions).map((key) => (
                          <option key={key} value={key}>
                            {key.replace("-", " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
                      Recalculate Estimate <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Construction Results */}
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Metric cardColor="border-l-4 border-l-indigo-600" title="Estimated Budget" value={formatCurrency(constructionResult.totalCost)} />
                  <Metric cardColor="border-l-4 border-l-emerald-600" title="Built-up Area" value={`${constructionResult.areas.builtup} sqft`} />
                  <Metric cardColor="border-l-4 border-l-sky-600" title="Super Built-up" value={`${constructionResult.areas.superBuiltup} sqft`} />
                </div>

                {constructionForm.watch("methods").includes("materialPercentage") && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-bold">Material Percentage Allocation</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      {constructionResult.materialBreakdown.map((item: any) => (
                        <div key={item.key}>
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-600">{item.name} ({item.percentage}%)</span>
                            <span className="text-slate-900">{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${item.percentage * 3.5}%` }} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {constructionForm.watch("methods").includes("quantityEstimation") && (
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="py-4">
                        <CardTitle className="text-sm font-bold">Physical Material Quantities</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="grid gap-2">
                          {constructionResult.quantities.map((item: any) => (
                            <div key={item.key} className="flex justify-between items-center rounded-lg bg-slate-50 px-3 py-2 text-xs">
                              <span className="text-slate-600 font-medium">{item.name}</span>
                              <span className="font-bold text-slate-800">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {constructionForm.watch("methods").includes("timeline") && (
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="py-4">
                        <CardTitle className="text-sm font-bold">Cash-flow Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                          {constructionResult.cashflow.map((item: any) => (
                            <div key={item.month} className="grid grid-cols-[55px_1fr_80px] items-center gap-2 text-xs">
                              <span className="text-slate-500 font-medium">Month {item.month}</span>
                              <div className="h-1.5 rounded-full bg-slate-100">
                                <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${item.percentage * 3}%` }} />
                              </div>
                              <span className="text-right font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <p className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-[11px] leading-relaxed text-amber-800">
                  {constructionResult.disclaimer}
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MODULAR KITCHEN */}
          {activeTab === "modular-kitchen" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1fr_360px]">
              
              <div className="space-y-6">
                {/* Kitchen woodwork dimensions area */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 rounded-2xl text-white shadow-lg shadow-indigo-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📐</span>
                    <h3 className="font-bold text-base">Enter Kitchen Woodwork Size</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px] space-y-2">
                      <Label htmlFor="kitchenArea" className="text-xs text-indigo-100 font-semibold uppercase">Total Area (sq ft)</Label>
                      <Input
                        id="kitchenArea"
                        type="number"
                        min="0"
                        step="0.5"
                        value={woodworkArea || ""}
                        onChange={(e) => setWoodworkArea(parseFloat(e.target.value) || 0)}
                        placeholder="Enter kitchen floor/woodwork area"
                        className="bg-white/95 text-slate-800 placeholder-slate-400 font-bold h-11 border-none focus:ring-white"
                      />
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 min-w-[120px] text-center border border-white/10">
                      <div className="text-[10px] text-indigo-100 uppercase font-bold tracking-wider mb-0.5">Rate / sqft</div>
                      <div className="text-lg font-extrabold">{formatCurrency(woodworkCostPerSqFt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-indigo-100 border-t border-white/10 pt-3">
                    <span>Formula: Area × Rate/sqft</span>
                    <span className="font-bold text-sm text-white">Estimated cost: {formatCurrency(woodworkTotalCost)}</span>
                  </div>
                </div>

                {/* Collapsible Woodwork configuration cards */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm">Woodwork Structure & Shutter Materials</h3>
                  {woodworkConfig.map((item) => {
                    const selectedOptId = selectedWoodworkOptions[item.id];
                    return (
                      <Card key={item.id} className="border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-100">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{item.name}</span>
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                            {selectedOptId ? "Configured" : "Select Material"}
                          </span>
                        </div>
                        
                        <CardContent className="p-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            {item.options.map((opt: any) => {
                              const isSelected = selectedOptId === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelectedWoodworkOptions(prev => ({ ...prev, [item.id]: opt.id }))}
                                  className={`rounded-xl border p-3 cursor-pointer text-center flex flex-col justify-between transition-all ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
                                      : "border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 text-xs">{opt.name}</div>
                                    <p className="text-[10px] text-slate-500 mt-1">{opt.description}</p>
                                  </div>
                                  <div className="mt-3 font-extrabold text-xs text-emerald-600">
                                    {formatCurrency(opt.price)}/sqft
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Kitchen catalog accessories */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm">Standard Kitchen Hardware & Accessories</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {dbProducts
                      .filter((p) => p.calculator === "modular-kitchen")
                      .map((product) => (
                        <ProductCard key={product.id} product={product} onAdd={addToCart} />
                      ))}
                  </div>
                </div>
              </div>

              {/* Shopping Cart side panel */}
              <CartPanel
                cart={cart.filter((item) => item.calculator === "modular-kitchen")}
                woodworkTotal={woodworkTotalCost}
                total={groupedCartTotal.kitchen}
                onQuantity={updateCartQuantity}
                onRemove={removeFromCart}
                onQuote={() => setActiveTab("quote")}
              />
            </motion.div>
          )}

          {/* TAB 3: CUSTOM DOORS (INTERIOR) */}
          {activeTab === "interior" && doorData && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Doors Custom configuration grid */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">Interior Custom Doors Configuration</CardTitle>
                    <CardDescription>Setup floor placements, variants, finish models, and door addons.</CardDescription>
                  </div>
                  
                  <Button
                    onClick={addDoorRow}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Door Unit
                  </Button>
                </CardHeader>
                
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                        <th className="px-4 py-3 w-[15%]">Location (Floor)</th>
                        <th className="px-4 py-3 w-[15%]">Area</th>
                        <th className="px-4 py-3 w-[20%]">Variant</th>
                        <th className="px-4 py-3 w-[20%]">Finish</th>
                        <th className="px-4 py-3 w-[20%]">Accessories (Addons)</th>
                        <th className="px-4 py-3 w-[10%] text-center">Qty</th>
                        <th className="px-4 py-3 w-[15%] text-right">Subtotal</th>
                        <th className="px-3 py-3 w-[5%] text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {doorRows.map((row) => {
                        // Variants and finishes matching selected template/variant
                        const filteredVariants = doorData.variants.filter((v: any) => v.templateId === row.templateId);
                        const filteredFinishes = doorData.finishes.filter((f: any) => f.variantId === row.variantId);
                        const activeVariant = doorData.variants.find((v: any) => v.id === row.variantId);

                        // Row cost calculation details
                        const calculated = doorCalculatedRows.find((cr) => cr.id === row.id);

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/40">
                            {/* Floor Option */}
                            <td className="px-4 py-3.5">
                              <select
                                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={row.floor}
                                onChange={(e) => updateDoorRow(row.id, { floor: e.target.value })}
                              >
                                {doorData.settings.floorOptions.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>

                            {/* Area Option */}
                            <td className="px-4 py-3.5">
                              <select
                                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 focus:ring-indigo-500"
                                value={row.area}
                                onChange={(e) => updateDoorRow(row.id, { area: e.target.value })}
                              >
                                {doorData.settings.areaOptions.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>

                            {/* Variant Option */}
                            <td className="px-4 py-3.5">
                              <select
                                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 focus:ring-indigo-500"
                                value={row.variantId}
                                onChange={(e) => updateDoorRow(row.id, { variantId: e.target.value })}
                              >
                                <option value="">Select Variant</option>
                                {filteredVariants.map((v: any) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} (Rs. {v.basePrice})
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Finish Option */}
                            <td className="px-4 py-3.5">
                              <select
                                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 focus:ring-indigo-500"
                                value={row.finishId}
                                disabled={!row.variantId}
                                onChange={(e) => updateDoorRow(row.id, { finishId: e.target.value })}
                              >
                                <option value="">Select Finish</option>
                                {filteredFinishes.map((f: any) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name} (+ Rs. {f.priceValue})
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Accessories (Checkboxes + quantities) */}
                            <td className="px-4 py-3.5">
                              {!row.variantId ? (
                                <span className="text-slate-400 italic">Select variant first</span>
                              ) : (
                                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                  {doorData.addons.map((addon: any) => {
                                    const addonSelection = row.addons.find((a) => a.addonId === addon.id);
                                    const isSelected = !!addonSelection;

                                    return (
                                      <div key={addon.id} className="flex items-center justify-between gap-2 border border-slate-100 p-1 rounded bg-slate-50/50">
                                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[10px] text-slate-700">
                                          <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={isSelected}
                                            onChange={() => toggleDoorAddon(row.id, addon.id)}
                                          />
                                          {addon.name} (Rs. {addon.price})
                                        </label>
                                        
                                        {isSelected && (
                                          <input
                                            type="number"
                                            min="1"
                                            className="h-6 w-10 border border-slate-300 rounded text-center font-bold px-1"
                                            value={addonSelection.quantity}
                                            onChange={(e) => updateDoorAddonQty(row.id, addon.id, parseInt(e.target.value) || 1)}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>

                            {/* Quantity of doors */}
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="number"
                                min="1"
                                className="h-9 w-12 border border-slate-300 rounded text-center font-bold"
                                value={row.doorQuantity}
                                onChange={(e) => updateDoorRow(row.id, { doorQuantity: parseInt(e.target.value) || 1 })}
                              />
                            </td>

                            {/* Subtotal */}
                            <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 text-sm">
                              {formatCurrency(calculated?.totalAmount || 0)}
                            </td>

                            {/* Delete row */}
                            <td className="px-3 py-3.5 text-center">
                              <button
                                type="button"
                                disabled={doorRows.length === 1}
                                className="text-slate-400 hover:text-red-600 disabled:opacity-30 rounded p-1"
                                onClick={() => removeDoorRow(row.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Doors Cost Summary invoice panel */}
              <div className="grid gap-6 sm:grid-cols-2">
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-800">Doors Settings & Charges</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3.5 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between">
                      <span>Installation Base Mode</span>
                      <span className="text-slate-900 capitalize">
                        {doorData.settings.installationType.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate/Charge</span>
                      <span className="text-slate-900">{formatCurrency(doorData.settings.installationCharges)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax Bracket (GST)</span>
                      <span className="text-slate-900">{doorData.settings.taxPercent}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-indigo-50/10 border-l-4 border-l-indigo-600">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-800">Custom Doors Receipt Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs font-medium text-slate-700">
                    <div className="flex justify-between">
                      <span>Configured Doors Subtotal</span>
                      <span className="font-bold text-slate-800">{formatCurrency(doorsSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Tax Total ({doorData.settings.taxPercent}%)</span>
                      <span className="font-bold text-slate-800">{formatCurrency(doorsTaxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Installation Total</span>
                      <span className="font-bold text-slate-800">{formatCurrency(doorsInstallation)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 flex justify-between items-end">
                      <span className="font-bold text-slate-950 uppercase text-xs">Doors Grand Total</span>
                      <span className="text-lg font-black text-indigo-600">{formatCurrency(doorsGrandTotal)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setActiveTab("quote")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-1.5 shadow"
                >
                  Configure Quote Details <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* TAB 4: WARDROBE CALCULATOR */}
          {activeTab === "wardrobe" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1fr_360px]">
              
              <div className="grid gap-4 sm:grid-cols-2">
                {dbProducts
                  .filter((p) => p.calculator === "wardrobe")
                  .map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={addToCart} />
                  ))}
              </div>

              <CartPanel
                cart={cart.filter((item) => item.calculator === "wardrobe")}
                total={groupedCartTotal.wardrobe}
                onQuantity={updateCartQuantity}
                onRemove={removeFromCart}
                onQuote={() => setActiveTab("quote")}
              />
            </motion.div>
          )}

          {/* TAB 5: GET QUOTE & REPORTS */}
          {activeTab === "quote" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1fr_400px]">
              
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg">Submit Quote Request</CardTitle>
                  <CardDescription>Enter details to save estimate values to database or exports.</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <form className="grid gap-4" onSubmit={quoteForm.handleSubmit(submitQuote)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label className="text-xs font-semibold text-slate-700">Link to Customer Project</Label>
                        <select
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 mt-1"
                          value={selectedProjectIdForQuote}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedProjectIdForQuote(val);
                            const selectedProj = userProjects.find(p => p.id === val);
                            if (selectedProj) {
                              quoteForm.setValue("customerName", selectedProj.customerDetails?.name || "");
                              quoteForm.setValue("phone", selectedProj.customerDetails?.phone || "");
                              quoteForm.setValue("email", selectedProj.customerDetails?.email || "");
                              quoteForm.setValue("city", selectedProj.customerDetails?.address || "");
                            }
                          }}
                        >
                          <option value="">-- Optional: Select Customer Project to Auto-Populate Details --</option>
                          {userProjects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Client: {p.customerDetails?.name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <Field label="Customer Name" error={quoteForm.formState.errors.customerName?.message as any}>
                        <Input className="border-slate-300" {...quoteForm.register("customerName")} />
                      </Field>
                      <Field label="Phone Number" error={quoteForm.formState.errors.phone?.message as any}>
                        <Input className="border-slate-300" {...quoteForm.register("phone")} />
                      </Field>
                      <Field label="Email Address" error={quoteForm.formState.errors.email?.message as any}>
                        <Input type="email" className="border-slate-300" {...quoteForm.register("email")} />
                      </Field>
                      <Field label="City / Location" error={quoteForm.formState.errors.city?.message as any}>
                        <Input className="border-slate-300" {...quoteForm.register("city")} />
                      </Field>
                      <Field label="Estimated Budget Grade" error={quoteForm.formState.errors.budgetRange?.message as any}>
                        <Input placeholder="Example: 5L - 8L" className="border-slate-300" {...quoteForm.register("budgetRange")} />
                      </Field>
                      <Field label="Project Layout Scope" error={quoteForm.formState.errors.projectType?.message as any}>
                        <select
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500"
                          {...quoteForm.register("projectType")}
                        >
                          <option value="combined">Combined (Multi-Module)</option>
                          <option value="construction">Construction Scope</option>
                          <option value="modular-kitchen">Modular Kitchen Only</option>
                          <option value="interior">Interior Doors only</option>
                          <option value="wardrobe">Wardrobe Scope</option>
                        </select>
                      </Field>
                    </div>

                    <Field label="Special Requirements / Additional Notes" error={quoteForm.formState.errors.notes?.message as any}>
                      <textarea
                        className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="Structure style notes, hardware preference, execution timeline limits..."
                        {...quoteForm.register("notes")}
                      />
                    </Field>

                    <Button
                      type="submit"
                      disabled={quoteLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                    >
                      {quoteLoading ? "Saving Request..." : "Save Quotation to Database"} <Send className="h-4 w-4 ml-1" />
                    </Button>

                    {quoteMessage && (
                      <p className="rounded-lg bg-slate-100 p-3 text-xs font-semibold text-slate-700 border border-slate-200">
                        {quoteMessage}
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Exports options panel */}
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-emerald-600 bg-emerald-50/5">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-800">Generate Estimate Reports</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-xs leading-relaxed text-slate-600">
                      Download PDF invoices locally or trigger WhatsApp Business messaging with structured totals.
                    </p>
                    
                    <Button
                      onClick={downloadPDF}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow"
                    >
                      <FileText className="h-4.5 w-4.5" /> Download Invoice PDF
                    </Button>
                    
                    <a
                      href={getWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow"
                    >
                      <Phone className="h-4.5 w-4.5" /> Share Quote on WhatsApp
                    </a>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500">Estimate Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3.5 text-xs font-medium text-slate-700">
                    {woodworkArea > 0 && (
                      <div className="flex justify-between">
                        <span>Kitchen (Area: {woodworkArea} sqft)</span>
                        <span className="font-bold text-slate-900">{formatCurrency(groupedCartTotal.kitchen)}</span>
                      </div>
                    )}
                    {cart.some(item => item.calculator === "wardrobe") && (
                      <div className="flex justify-between">
                        <span>Wardrobes Accessories</span>
                        <span className="font-bold text-slate-900">{formatCurrency(groupedCartTotal.wardrobe)}</span>
                      </div>
                    )}
                    {doorsSubtotal > 0 && (
                      <div className="flex justify-between">
                        <span>Custom Doors Placements</span>
                        <span className="font-bold text-slate-900">{formatCurrency(groupedCartTotal.doors)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-3 flex justify-between items-end">
                      <span className="font-black text-slate-800 text-[10px] uppercase">Final Grand Total</span>
                      <span className="text-lg font-black text-indigo-600">{formatCurrency(groupedCartTotal.grandTotal)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </motion.div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Calculators grid at top */}
              <div>
                <h2 className="text-sm font-black uppercase text-slate-500 tracking-wider mb-4">Cost Estimator Calculators</h2>
                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    { id: "construction", label: "Construction Calculator", icon: Building2, active: hasConstructionAccess },
                    { id: "interior", label: "Interior Calculator", icon: DoorOpen, active: hasInteriorAccess },
                    { id: "modular-kitchen", label: "Kitchen Calculator", icon: ChefHat, active: hasKitchenAccess },
                    { id: "wardrobe", label: "Wardrobe Calculator", icon: Layers3, active: hasWardrobeAccess }
                  ].map((calc) => (
                    <Card
                      key={calc.id}
                      onClick={() => calc.active && setActiveTab(calc.id as WorkspaceTab)}
                      className={`cursor-pointer border-slate-200 hover:shadow-md transition bg-white relative overflow-hidden ${
                        !calc.active ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${!calc.active ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"}`}>
                          <calc.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{calc.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {calc.active ? "Open Calculator Workspace" : "Access Locked by Admin"}
                          </div>
                        </div>
                        {!calc.active && (
                          <Lock className="h-4 w-4 text-slate-400 absolute top-3 right-3" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Employee Management Section below */}
              {user?.role === "company" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-t border-slate-200 pt-6">
                    <div>
                      <h2 className="text-sm font-black uppercase text-slate-500 tracking-wider">Employee Workspace Directory</h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">Define employee settings, calculators permission matrix, and view login histories.</p>
                    </div>
                    
                    {/* Share Invitation Code */}
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-700">
                      <span>Invitation Code: {user.keyId}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user.keyId || "");
                          alert("Company Code copied to clipboard!");
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold uppercase ml-1.5"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {employees.length === 0 ? (
                    <Card className="border-slate-200 shadow-sm bg-white p-8 text-center text-slate-400 italic text-xs">
                      No linked employees registered yet. Invite them using your company key ID!
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                      {employees.map((emp) => {
                        let empPerms: any = {};
                        try {
                          empPerms = typeof emp.permissions === "string" ? JSON.parse(emp.permissions) : (emp.permissions || {});
                        } catch {
                          empPerms = {};
                        }
                        const activeCalcs: string[] = [];
                        if (empPerms.calculators?.construction !== false) activeCalcs.push("Construction");
                        if (empPerms.calculators?.doors !== false) activeCalcs.push("Interior");
                        if (empPerms.calculators?.kitchen !== false) activeCalcs.push("Kitchen");
                        if (empPerms.calculators?.wardrobe !== false) activeCalcs.push("Wardrobe");

                        const quotesCount = quoteList.filter(q => q.createdByUserId === emp.id).length;
                        const projCount = projects.filter(p => p.assignedEmployeeIds && p.assignedEmployeeIds.includes(emp.id)).length;

                        return (
                          <Card
                            key={emp.id}
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setSelectedEmployeeRole(emp.position || "Site Engineer");
                              setCalcsAccess(empPerms.calculators || { construction: true, interior: true, kitchen: true, wardrobe: true });
                              setPriceMode(empPerms.pricingMode || "show");
                              setQuotePerms(empPerms.quote || { create: true, edit: true, delete: true, duplicate: true, downloadPdf: true, print: true });
                              setProjPerms(empPerms.project || { access: true, create: true, edit: true, close: true, uploadImages: true, updateProgress: true });
                            }}
                            className="cursor-pointer border-slate-200 hover:shadow bg-white hover:border-slate-350 transition relative overflow-hidden"
                          >
                            <CardHeader className="pb-2 flex flex-row justify-between items-start">
                              <div>
                                <CardTitle className="text-sm font-extrabold text-slate-900">{emp.name}</CardTitle>
                                <CardDescription className="text-[10px] font-mono mt-0.5 uppercase tracking-wide">ID: EMP-{emp.id.slice(0, 8).toUpperCase()}</CardDescription>
                              </div>
                              <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                {emp.position || "Staff"}
                              </span>
                            </CardHeader>
                            <CardContent className="space-y-2.5 text-[11px] text-slate-600">
                              <div className="grid gap-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Email:</span>
                                  <span className="font-medium text-slate-800">{emp.email}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Phone:</span>
                                  <span className="font-medium text-slate-800">{emp.phone || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Status:</span>
                                  <span className="inline-block bg-emerald-50 text-emerald-800 text-[8px] font-black uppercase px-1 rounded">
                                    Active
                                  </span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span className="text-slate-400">Last Login:</span>
                                  <span className="text-slate-800">
                                    {emp.lastLogin ? new Date(emp.lastLogin).toLocaleString() : "Never logged in"}
                                  </span>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-2 grid gap-1.5 text-[10px]">
                                <div>
                                  <span className="text-slate-400 font-bold uppercase block tracking-wider mb-0.5">Calculator Access</span>
                                  <span className="font-semibold text-slate-800">
                                    {activeCalcs.length === 0 ? "None" : activeCalcs.join(", ")}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1 bg-slate-50 p-1.5 rounded">
                                  <div>
                                    <span className="text-slate-400 block uppercase">Quotations</span>
                                    <span className="text-xs font-black text-indigo-600">{quotesCount} Generated</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block uppercase">Projects</span>
                                    <span className="text-xs font-black text-indigo-600">{projCount} Assigned</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 8: PROJECTS HUB */}
          {activeTab === "projects" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black uppercase text-slate-500 tracking-wider">Customer Projects Hub</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage customer job sites, assigned personnel, progress updates, and timeline loggers.</p>
                </div>
                {(user?.role === "company" || userPermissions.project?.create !== false) && (
                  <Button
                    onClick={() => {
                      setProjName("");
                      setCustName("");
                      setCustPhone("");
                      setCustEmail("");
                      setCustAddress("");
                      setProjExpectedDate("");
                      setProjAssignedEmployees([]);
                      setProjNotes("");
                      setShowProjectModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Plus className="h-4 w-4" /> Create Project
                  </Button>
                )}
              </div>

              {/* List of projects */}
              {userProjects.length === 0 ? (
                <Card className="border-slate-200 shadow-sm bg-white p-8 text-center text-slate-400 italic text-xs">
                  No assigned projects found.
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {userProjects.map((p) => {
                    const assignedList = employees.filter(e => p.assignedEmployeeIds?.includes(e.id)).map(e => e.name);
                    const quoteCount = quoteList.filter(q => q.projectId === p.id).length;

                    return (
                      <Card
                        key={p.id}
                        onClick={() => {
                          setSelectedProject(p);
                          setProjProgressInput(p.progressPercentage || 0);
                          setProjImageInput("");
                          setTimelineTitleInput("");
                          setTimelineNotesInput("");
                        }}
                        className="cursor-pointer border-slate-200 hover:shadow bg-white hover:border-slate-300 transition"
                      >
                        <CardHeader className="pb-2 flex flex-row justify-between items-start">
                          <div>
                            <CardTitle className="text-sm font-extrabold text-slate-900">{p.name}</CardTitle>
                            <CardDescription className="text-[10px] mt-0.5 uppercase tracking-wide">ID: PROJ-{p.id.slice(0, 8).toUpperCase()}</CardDescription>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            p.status === 'active'
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-slate-100 text-slate-800"
                          }`}>
                            {p.status}
                          </span>
                        </CardHeader>
                        <CardContent className="space-y-3 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400">Customer:</span>
                            <span className="font-bold text-slate-800 block">{p.customerDetails?.name}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 font-bold uppercase">Progress</span>
                              <span className="font-extrabold text-slate-800">{p.progressPercentage || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${p.progressPercentage || 0}%` }} />
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-slate-400 block uppercase">Quotations</span>
                              <span className="text-xs font-black text-indigo-600">{quoteCount} linked</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block uppercase">Assigned Staff</span>
                              <span className="text-xs font-black text-slate-700">{assignedList.length} employees</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 7: QUOTE HISTORY */}
          {activeTab === "quote-history" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="py-4 border-b border-slate-100">
                  <CardTitle className="text-lg">Quotation Generation History</CardTitle>
                  <CardDescription>Review all calculations generated by your profile.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {quoteList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic text-xs">
                      No quotes generated yet.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Customer Name</th>
                          <th className="px-4 py-3">Project Scope</th>
                          <th className="px-4 py-3">Budget</th>
                          <th className="px-4 py-3 text-right">Grand Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {quoteList.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3 text-slate-500 font-medium">
                              {new Date(q.createdAt).toLocaleDateString()}
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
            </motion.div>
          )}

          </>
         )}
        </section>

      </div>

      {/* EMPLOYEE MANAGEMENT OVERLAY */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl bg-white overflow-hidden max-h-[90vh] flex flex-col justify-between">
            <CardHeader className="py-4 border-b border-slate-150 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900">Employee Workspace Controls</CardTitle>
                <CardDescription className="text-[10px]">Configure positions, calculator lock states, pricing modes, and actions rights.</CardDescription>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleSaveEmployeePermissions} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-extrabold text-slate-800 text-sm">{selectedEmployee.name}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">ID: EMP-{selectedEmployee.id.slice(0,8).toUpperCase()} | {selectedEmployee.email}</div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Employee Primary Role Name Template</Label>
                <select
                  className="h-10 w-full rounded border border-slate-300 bg-white px-3 font-semibold"
                  value={selectedEmployeeRole}
                  onChange={(e) => applyRoleTemplate(e.target.value)}
                >
                  <option value="Site Engineer">Site Engineer</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Interior Designer">Interior Designer</option>
                  <option value="Business Development Executive">Business Development Executive</option>
                </select>
                <span className="text-[9px] text-slate-400">Selecting a templates updates default permissions below. You can still check or uncheck individual permission options below independently.</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Calculators Modules Access</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                  {[
                    { key: "construction", label: "Construction Calculator" },
                    { key: "doors", label: "Interior Calculator" },
                    { key: "kitchen", label: "Kitchen Calculator" },
                    { key: "wardrobe", label: "Wardrobe Calculator" }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={calcsAccess[item.key] !== false}
                        onChange={(e) => setCalcsAccess({ ...calcsAccess, [item.key]: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Product Pricing Access Mode</Label>
                <select
                  className="h-10 w-full rounded border border-slate-300 bg-white px-3"
                  value={priceMode}
                  onChange={(e) => setPriceMode(e.target.value)}
                >
                  <option value="show">Mode 1: View all product prices & estimates</option>
                  <option value="hide">Mode 2: Hide product prices (Show Quote overall estimate totals only)</option>
                  <option value="no-prices">Mode 3: Completely hide prices (View quotes without seeing any prices)</option>
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quotation Actions Rights</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                  {[
                    { key: "create", label: "Create Quotations" },
                    { key: "edit", label: "Edit/Modify Quotations" },
                    { key: "delete", label: "Delete Quotations" },
                    { key: "duplicate", label: "Duplicate Quotations" },
                    { key: "downloadPdf", label: "Download Estimate PDF" },
                    { key: "print", label: "Print Estimate (Share)" }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={quotePerms[item.key] !== false}
                        onChange={(e) => setQuotePerms({ ...quotePerms, [item.key]: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Projects Actions Rights</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                  {[
                    { key: "access", label: "Access Assigned Projects" },
                    { key: "create", label: "Create New Projects" },
                    { key: "edit", label: "Edit Project Details" },
                    { key: "close", label: "Close Projects Status" },
                    { key: "uploadImages", label: "Upload Progress/Site Images" },
                    { key: "updateProgress", label: "Update Progress Log Percentage" }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={projPerms[item.key] !== false}
                        onChange={(e) => setProjPerms({ ...projPerms, [item.key]: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </form>

            <div className="border-t border-slate-150 p-4 bg-slate-50 flex gap-3">
              <Button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEmployeePermissions}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-sm"
              >
                Save Workspace Rules
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* PROJECT CREATOR DIALOG */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-md border-slate-200 shadow-2xl bg-white overflow-hidden max-h-[90vh] flex flex-col justify-between">
            <CardHeader className="py-4 border-b border-slate-150 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900">Create Customer Project</CardTitle>
                <CardDescription className="text-[10px]">Define customer profile, site address, and assigned workspace crew.</CardDescription>
              </div>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.projects.create({
                    name: projName,
                    customerDetails: {
                      name: custName,
                      phone: custPhone,
                      email: custEmail,
                      address: custAddress
                    },
                    expectedCompletionDate: projExpectedDate,
                    assignedEmployeeIds: projAssignedEmployees,
                    notes: projNotes
                  });
                  alert("Project created successfully!");
                  setShowProjectModal(false);
                  void loadAllDashboardData();
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="flex-1 overflow-y-auto p-5 space-y-4 text-xs"
            >
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Project Name</Label>
                  <Input required className="border-slate-300 h-9 font-bold" placeholder="e.g. Oakridge Villa Interior" value={projName} onChange={(e) => setProjName(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Customer Name</Label>
                  <Input required className="border-slate-300 h-9" placeholder="e.g. Ritesh Kumar" value={custName} onChange={(e) => setCustName(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Customer Phone</Label>
                  <Input className="border-slate-300 h-9" placeholder="e.g. +91 99999 88888" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Customer Email</Label>
                  <Input type="email" className="border-slate-300 h-9" placeholder="e.g. customer@example.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Site Site / Address</Label>
                  <Input className="border-slate-300 h-9" placeholder="e.g. Sector 5, HSR Layout, Bangalore" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Expected Completion Date</Label>
                  <Input type="date" className="border-slate-300 h-9" value={projExpectedDate} onChange={(e) => setProjExpectedDate(e.target.value)} />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 block font-semibold">Assign Employees Access</Label>
                  <div className="grid gap-1.5 max-h-28 overflow-y-auto border border-slate-200 p-2 rounded">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={projAssignedEmployees.includes(emp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProjAssignedEmployees([...projAssignedEmployees, emp.id]);
                            } else {
                              setProjAssignedEmployees(projAssignedEmployees.filter(id => id !== emp.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        {emp.name} ({emp.position || "Staff"})
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Project Notes / Overview</Label>
                  <textarea className="border border-slate-300 rounded p-2" rows={3} placeholder="Provide initial requirements..." value={projNotes} onChange={(e) => setProjNotes(e.target.value)} />
                </div>
              </div>

              <div className="border-t border-slate-150 pt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow"
                >
                  Create Project
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* PROJECT DETAILS SLIDE-OVER */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            <CardHeader className="py-4 border-b border-slate-150 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900">{selectedProject.name}</CardTitle>
                <CardDescription className="text-[10px] font-mono mt-0.5">ID: PROJ-{selectedProject.id.toUpperCase()}</CardDescription>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-6 w-6" />
              </button>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid gap-2">
                <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Client & Location Profile</h4>
                <div className="grid gap-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Customer Name:</span>
                    <span className="font-bold text-slate-955">{selectedProject.customerDetails?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Phone:</span>
                    <span className="font-medium text-slate-955">{selectedProject.customerDetails?.phone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Email:</span>
                    <span className="font-medium text-slate-955">{selectedProject.customerDetails?.email || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Site Address:</span>
                    <span className="font-medium text-slate-955">{selectedProject.customerDetails?.address || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Progress Percentage</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={user?.role === "employee" && userPermissions.project?.updateProgress === false}
                      value={projProgressInput}
                      onChange={(e) => setProjProgressInput(parseInt(e.target.value) || 0)}
                      className="flex-1 accent-indigo-600 disabled:opacity-50"
                    />
                    <span className="font-black text-slate-900 text-sm w-10 text-right">{projProgressInput}%</span>
                    {(user?.role === "company" || userPermissions.project?.updateProgress !== false) && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await api.projects.update(selectedProject.id, {
                              progressPercentage: projProgressInput,
                              timelineEvent: {
                                title: "Progress Update",
                                notes: `Work progress updated to ${projProgressInput}%.`
                              }
                            });
                            alert("Progress updated successfully!");
                            setSelectedProject(null);
                            void loadAllDashboardData();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="bg-indigo-600 text-white font-bold h-7 px-2.5 text-[10px]"
                      >
                        Save
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Project Workspace Status</Label>
                  <select
                    disabled={user?.role === "employee" && userPermissions.project?.close === false}
                    value={selectedProject.status}
                    onChange={async (e) => {
                      try {
                        await api.projects.update(selectedProject.id, {
                          status: e.target.value,
                          timelineEvent: {
                            title: `Status Set to ${e.target.value.toUpperCase()}`,
                            notes: `Workspace state transitioned to ${e.target.value}.`
                          }
                        });
                        alert("Status updated successfully!");
                        setSelectedProject(null);
                        void loadAllDashboardData();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="h-9 rounded border border-slate-300 bg-white px-2 font-bold disabled:opacity-50"
                  >
                    <option value="active">Active Execution</option>
                    <option value="closed">Closed / Finished</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Quotations List</h4>
                  {(user?.role === "company" || userPermissions.quote?.create !== false) && (
                    <Button
                      onClick={() => {
                        setSelectedProjectIdForQuote(selectedProject.id);
                        quoteForm.setValue("customerName", selectedProject.customerDetails?.name || "");
                        quoteForm.setValue("phone", selectedProject.customerDetails?.phone || "");
                        quoteForm.setValue("email", selectedProject.customerDetails?.email || "");
                        quoteForm.setValue("city", selectedProject.customerDetails?.address || "");
                        setActiveTab("quote");
                        setSelectedProject(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-6 px-2 rounded flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Quotation
                    </Button>
                  )}
                </div>
                {quoteList.filter(q => q.projectId === selectedProject.id).length === 0 ? (
                  <p className="text-slate-400 italic text-[11px] bg-slate-50/50 p-3 rounded-lg border border-dashed border-slate-200">
                    No quotations generated for this project yet.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                    {quoteList.filter(q => q.projectId === selectedProject.id).map(q => (
                      <div key={q.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-extrabold text-slate-900 capitalize">{q.calculatorUsed || q.projectType} Estimate</div>
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">Created: {new Date(q.createdAt).toLocaleDateString()} | Ver: {q.version || 1}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-indigo-600 text-sm">
                            {formatTotalAmount(q.totalAmount)}
                          </span>
                          
                          {(user?.role === "company" || userPermissions.quote?.delete !== false) && (
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this quotation?")) return;
                                try {
                                  await api.quotes.delete(q.id);
                                  alert("Quotation deleted!");
                                  void loadAllDashboardData();
                                } catch (err: any) {
                                  alert(err.message);
                                }
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                              title="Delete Quote"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-semibold">Site & Progress Images</h4>
                
                {(selectedProject.projectImages || []).length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">No images uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedProject.projectImages.map((img: string, idx: number) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200">
                        <img src={img} alt="progress" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {(user?.role === "company" || userPermissions.project?.uploadImages !== false) && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Paste Image URL..."
                      className="h-8 text-xs flex-1"
                      value={projImageInput}
                      onChange={(e) => setProjImageInput(e.target.value)}
                    />
                    <Button
                      onClick={async () => {
                        if (!projImageInput) return;
                        try {
                          const updatedImgs = [...(selectedProject.projectImages || []), projImageInput];
                          await api.projects.update(selectedProject.id, {
                            projectImages: updatedImgs,
                            timelineEvent: {
                              title: "Image Uploaded",
                              notes: "New work progress photo added to site gallery."
                            }
                          });
                          alert("Photo uploaded successfully!");
                          setProjImageInput("");
                          setSelectedProject(null);
                          void loadAllDashboardData();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="bg-slate-900 text-white font-bold h-8 text-[11px] px-3.5"
                    >
                      Add Photo
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Project Audit Trail Timeline</h4>
                <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                  {(selectedProject.timeline || []).map((t: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-indigo-600 border border-white" />
                      <div className="font-extrabold text-slate-900">{t.title}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{t.notes}</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">{new Date(t.date).toLocaleString()} | by {t.userName}</div>
                    </div>
                  ))}
                </div>

                {(user?.role === "company" || userPermissions.project?.updateProgress !== false) && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 mt-4">
                    <h5 className="font-bold text-[10px] uppercase text-slate-500">Log Site Event</h5>
                    <div className="grid gap-2">
                      <Input
                        placeholder="Event Title (e.g. Plumbing Started)"
                        className="h-8 text-xs border-slate-300"
                        value={timelineTitleInput}
                        onChange={(e) => setTimelineTitleInput(e.target.value)}
                      />
                      <textarea
                        placeholder="Log detailed notes..."
                        className="border border-slate-300 rounded p-1.5 text-xs bg-white"
                        rows={2}
                        value={timelineNotesInput}
                        onChange={(e) => setTimelineNotesInput(e.target.value)}
                      />
                      <Button
                        onClick={async () => {
                          if (!timelineTitleInput) return;
                          try {
                            await api.projects.update(selectedProject.id, {
                              timelineEvent: {
                                title: timelineTitleInput,
                                notes: timelineNotesInput
                              }
                            });
                            alert("Timeline event logged!");
                            setTimelineTitleInput("");
                            setTimelineNotesInput("");
                            setSelectedProject(null);
                            void loadAllDashboardData();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="bg-indigo-600 text-white font-bold h-8 text-[11px] w-full"
                      >
                        Submit Timeline Log
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-150 p-4 bg-slate-50 flex gap-3">
              <Button
                onClick={() => setSelectedProject(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg flex items-center justify-center shadow"
              >
                Close View panel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

// Subcomponents

function Metric({ title, value, cardColor = "" }: { title: string; value: string; cardColor?: string }) {
  return (
    <Card className={`border-slate-200 shadow-sm overflow-hidden ${cardColor}`}>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{title}</div>
        <div className="mt-1.5 text-base font-extrabold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: any; onAdd: (product: any, quantity: number, rate: number, variant?: string) => void }) {
  const { user } = useAuth();
  const formatCurrency = (amount: number) => {
    if (!user) return "N/A";
    let perms: any = {};
    try {
      perms = typeof user.permissions === "string" ? JSON.parse(user.permissions) : (user.permissions || {});
    } catch {
      perms = user.permissions || {};
    }
    const mode = perms.pricingMode;
    if (user?.role === "employee" && (mode === "hide" || mode === "no-prices")) {
      return "Hidden";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const showPriceOptions = (rate: number) => {
    if (!user) return "N/A";
    let perms: any = {};
    try {
      perms = typeof user.permissions === "string" ? JSON.parse(user.permissions) : (user.permissions || {});
    } catch {
      perms = user.permissions || {};
    }
    const mode = perms.pricingMode;
    if (user?.role === "employee" && (mode === "hide" || mode === "no-prices")) {
      return "Hidden";
    }
    return `Rs. ${rate.toLocaleString("en-IN")}`;
  };

  const [quantity, setQuantity] = useState(1);
  const [variantIndex, setVariantIndex] = useState(0);
  
  const variants = product.variants || [];
  const activeVariant = variants[variantIndex];
  const rate = activeVariant ? activeVariant.rate : product.rate;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" className="h-32 w-full object-cover" />
        )}
        <CardHeader className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">{product.name}</CardTitle>
              <CardDescription className="text-[10px] font-semibold text-slate-400">{product.subcategory || "Item"}</CardDescription>
            </div>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
              {product.unit}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 space-y-3 text-xs">
          <p className="text-[11px] text-slate-500 leading-normal line-clamp-2 min-h-[32px]">{product.description}</p>
          
          {variants.length > 0 && (
            <div className="grid gap-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Select Specification</Label>
              <select
                className="h-8 rounded border border-slate-300 bg-white px-2 text-xs focus:ring-indigo-500"
                value={variantIndex}
                onChange={(e) => setVariantIndex(Number(e.target.value))}
              >
                {variants.map((item: any, idx: number) => (
                  <option key={item.name} value={idx}>
                    {item.name} ({showPriceOptions(item.rate)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </div>

      <CardContent className="p-3 pt-0 space-y-3.5">
        <div className="flex items-end gap-2 text-xs border-t border-slate-100 pt-3">
          <div className="grid flex-1 gap-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase">Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="h-8 text-center font-bold border-slate-300 focus:ring-indigo-500"
            />
          </div>
          <div className="pb-1 text-right min-w-[70px]">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Total</div>
            <div className="text-sm font-black text-slate-900">{formatCurrency(rate * quantity)}</div>
          </div>
        </div>
        
        <Button
          onClick={() => onAdd(product, quantity, rate, activeVariant?.name)}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm"
        >
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}

function CartPanel({
  cart,
  woodworkTotal = 0,
  total,
  onQuantity,
  onRemove,
  onQuote
}: {
  cart: CartItem[];
  woodworkTotal?: number;
  total: number;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onQuote: () => void;
}) {
  const { user } = useAuth();
  const formatCurrency = (amount: number) => {
    if (!user) return "N/A";
    let perms: any = {};
    try {
      perms = typeof user.permissions === "string" ? JSON.parse(user.permissions) : (user.permissions || {});
    } catch {
      perms = user.permissions || {};
    }
    const mode = perms.pricingMode;
    if (user?.role === "employee" && (mode === "hide" || mode === "no-prices")) {
      return "Hidden";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTotalAmount = (amount: number) => {
    if (!user) return "N/A";
    let perms: any = {};
    try {
      perms = typeof user.permissions === "string" ? JSON.parse(user.permissions) : (user.permissions || {});
    } catch {
      perms = user.permissions || {};
    }
    const mode = perms.pricingMode;
    if (user?.role === "employee" && mode === "no-prices") {
      return "Hidden";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="self-start border-slate-200 shadow-sm">
      <CardHeader className="py-4 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-800">Shopping Cart</CardTitle>
        <CardDescription className="text-xs">Estimate summary of configured options.</CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4 text-xs">
        {woodworkTotal > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/10 p-3 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-800">Woodwork Base Configuration</div>
              <div className="text-[10px] text-slate-500">Area sizing calculation</div>
            </div>
            <span className="font-extrabold text-slate-900">{formatCurrency(woodworkTotal)}</span>
          </div>
        )}

        {cart.length === 0 ? (
          woodworkTotal === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-400 font-semibold leading-relaxed">
              No items configured in cart yet.
            </div>
          )
        ) : (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{item.variant || item.category}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    className="text-slate-400 hover:text-red-600 transition-colors rounded p-0.5"
                    onClick={() => onRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <Input
                    className="w-16 h-7 text-center font-bold border-slate-300"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => onQuantity(item.id, Number(e.target.value) || 1)}
                  />
                  <span className="font-extrabold text-slate-900">{formatCurrency(item.rate * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="border-t border-slate-200 pt-3.5 flex items-center justify-between">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Estimated Subtotal</span>
          <span className="text-lg font-black text-indigo-600">{formatTotalAmount(total)}</span>
        </div>
        
        <Button
          onClick={onQuote}
          disabled={total === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm"
        >
          Proceed to Quote <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
