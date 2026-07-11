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
  FileText
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

// Extend jsPDF types for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: any;
  }
}

type WorkspaceTab = "construction" | "modular-kitchen" | "interior" | "wardrobe" | "quote";

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

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("construction");
  
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
    setQuoteLoading(true);
    setQuoteMessage("");

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
      }
    };

    try {
      const res = await api.quotes.create(payload);
      setQuoteMessage(res.message || "Quote request submitted successfully!");
      quoteForm.reset();
      setCart([]);
      setWoodworkArea(0);
      setSelectedWoodworkOptions({});
    } catch (err: any) {
      setQuoteMessage(`Quote capturing issue: ${err.message}. Please verify the NestJS API server connection.`);
    } finally {
      setQuoteLoading(false);
    }
  }

  // PDF generation
  function downloadPDF() {
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
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-all ${
                    selected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {tab.label}
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

        </section>

      </div>
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
                    {item.name} (Rs. {item.rate.toLocaleString("en-IN")})
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
          <span className="text-lg font-black text-indigo-600">{formatCurrency(total)}</span>
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
