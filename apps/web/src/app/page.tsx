"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
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
  Trash2
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  calculateConstruction,
  catalog as fallbackCatalog,
  constructionConfig,
  constructionInputSchema,
  quoteSchema,
  type CalculatorMethod,
  type ConstructionInput,
  type Product,
  type QuoteInput
} from "@cost-calculator/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type WorkspaceTab = "construction" | "modular-kitchen" | "interior" | "wardrobe" | "quote";

type CartItem = {
  id: string;
  productId: string;
  calculator: Product["calculator"];
  name: string;
  category: string;
  unit: string;
  rate: number;
  quantity: number;
  variant?: string;
};

type ConstructionFormInput = z.input<typeof constructionInputSchema>;
type QuoteFormInput = z.input<typeof quoteSchema>;

const tabs: Array<{ id: WorkspaceTab; label: string; icon: ComponentType<{ className?: string }> }> = [
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

const defaultConstructionValues: ConstructionInput = {
  carpetArea: 1000,
  quality: "standard",
  timeline: "6-months",
  methods: ["costPerSqFt", "materialPercentage", "quantityEstimation", "timeline"]
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("construction");
  const [products, setProducts] = useState<Product[]>(fallbackCatalog);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [constructionResult, setConstructionResult] = useState(() => calculateConstruction(defaultConstructionValues));
  const [apiState, setApiState] = useState<"checking" | "online" | "local">("checking");
  const [quoteMessage, setQuoteMessage] = useState("");

  const constructionForm = useForm<ConstructionFormInput, unknown, ConstructionInput>({
    resolver: zodResolver(constructionInputSchema),
    defaultValues: defaultConstructionValues
  });

  const quoteForm = useForm<QuoteFormInput, unknown, QuoteInput>({
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

  useEffect(() => {
    let ignore = false;

    async function loadCatalog() {
      try {
        const response = await fetch(`${apiUrl}/catalog`, { cache: "no-store" });
        if (!response.ok) throw new Error("Catalog request failed");
        const data = (await response.json()) as Product[];
        if (!ignore) {
          setProducts(data);
          setApiState("online");
        }
      } catch {
        if (!ignore) setApiState("local");
      }
    }

    void loadCatalog();

    return () => {
      ignore = true;
    };
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.rate * item.quantity, 0), [cart]);

  const groupedCart = useMemo(() => {
    return tabs.slice(1, 4).map((tab) => ({
      ...tab,
      total: cart
        .filter((item) => item.calculator === tab.id)
        .reduce((sum, item) => sum + item.rate * item.quantity, 0)
    }));
  }, [cart]);

  async function submitConstruction(values: ConstructionInput) {
    try {
      const response = await fetch(`${apiUrl}/calculations/construction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) throw new Error("Calculation API failed");
      setConstructionResult(await response.json());
      setApiState("online");
    } catch {
      setConstructionResult(calculateConstruction(values));
      setApiState("local");
    }
  }

  function toggleMethod(method: CalculatorMethod) {
    const methods = constructionForm.getValues("methods");
    const next = methods.includes(method) ? methods.filter((item) => item !== method) : [...methods, method];
    constructionForm.setValue("methods", next, { shouldValidate: true, shouldDirty: true });
  }

  function addToCart(product: Product, quantity: number, rate: number, variant?: string) {
    const itemKey = `${product.id}-${variant ?? "base"}`;

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
          variant
        }
      ];
    });
  }

  function updateCartQuantity(id: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id: string) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  async function submitQuote(values: QuoteInput) {
    const payload = {
      ...values,
      notes: `${values.notes ?? ""}\n\nCart total: ${formatCurrency(cartTotal)}\nItems: ${cart
        .map((item) => `${item.name} x ${item.quantity}`)
        .join(", ")}`
    };

    try {
      const response = await fetch(`${apiUrl}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Quote API failed");
      const result = await response.json();
      setQuoteMessage(result.message ?? "Quote request submitted.");
      setApiState("online");
      quoteForm.reset();
    } catch {
      setQuoteMessage("Quote captured locally in the browser session. Start the Nest API to save it through the backend.");
      setApiState("local");
    }
  }

  const visibleProducts = products.filter((product) => product.calculator === activeTab);

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Cost Calculator</h1>
              <p className="text-sm text-slate-600">Construction, kitchen, interior, and wardrobe estimation workspace.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              API: {apiState === "online" ? "NestJS online" : apiState === "checking" ? "checking" : "local fallback"}
            </span>
            <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              Cart {formatCurrency(cartTotal)}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-11 items-center gap-2 rounded-md px-3 text-left text-sm font-medium transition ${
                    selected ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Selection Summary</CardTitle>
              <CardDescription>Live totals from product calculators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedCart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="min-w-0">
          {activeTab === "construction" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Construction Estimate</CardTitle>
                  <CardDescription>Matches the CC flow: carpet area, built-up conversion, methods, quality, and timeline.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-5" onSubmit={constructionForm.handleSubmit(submitConstruction)}>
                    <div className="grid gap-2">
                      <Label htmlFor="carpetArea">Carpet Area</Label>
                      <Input id="carpetArea" type="number" min={100} {...constructionForm.register("carpetArea")} />
                      {constructionForm.formState.errors.carpetArea && (
                        <p className="text-sm text-red-600">{constructionForm.formState.errors.carpetArea.message}</p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label>Quality</Label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {Object.entries(constructionConfig.qualityPresets).map(([key, preset]) => (
                          <label
                            key={key}
                            className="rounded-lg border border-slate-200 p-3 text-sm transition has-[:checked]:border-slate-950 has-[:checked]:bg-slate-50"
                          >
                            <input className="sr-only" type="radio" value={key} {...constructionForm.register("quality")} />
                            <span className="block font-semibold text-slate-950">{preset.name}</span>
                            <span className="mt-1 block text-slate-600">{formatCurrency(preset.defaultPerSqFt)} / sq ft</span>
                            <span className="mt-2 block text-xs leading-5 text-slate-500">{preset.description}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Label>Estimate Methods</Label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {(Object.keys(methodLabels) as CalculatorMethod[]).map((method) => (
                          <label key={method} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={constructionForm.watch("methods").includes(method)}
                              onChange={() => toggleMethod(method)}
                            />
                            {methodLabels[method]}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="timeline">Timeline</Label>
                      <select
                        id="timeline"
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                        {...constructionForm.register("timeline")}
                      >
                        {Object.keys(constructionConfig.timelineDistributions).map((key) => (
                          <option key={key} value={key}>
                            {key.replace("-", " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button type="submit" className="w-full">
                      Calculate Estimate <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <ConstructionResults result={constructionResult} />
            </motion.div>
          )}

          {["modular-kitchen", "interior", "wardrobe"].includes(activeTab) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <div className="grid gap-4 md:grid-cols-2">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={addToCart} />
                ))}
              </div>
              <CartPanel cart={cart} total={cartTotal} onQuantity={updateCartQuantity} onRemove={removeFromCart} onQuote={() => setActiveTab("quote")} />
            </motion.div>
          )}

          {activeTab === "quote" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <Card>
                <CardHeader>
                  <CardTitle>Get Quote</CardTitle>
                  <CardDescription>Validated with React Hook Form and Zod, then submitted to the NestJS backend.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={quoteForm.handleSubmit(submitQuote)}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Customer Name" error={quoteForm.formState.errors.customerName?.message}>
                        <Input {...quoteForm.register("customerName")} />
                      </Field>
                      <Field label="Phone" error={quoteForm.formState.errors.phone?.message}>
                        <Input {...quoteForm.register("phone")} />
                      </Field>
                      <Field label="Email" error={quoteForm.formState.errors.email?.message}>
                        <Input type="email" {...quoteForm.register("email")} />
                      </Field>
                      <Field label="City" error={quoteForm.formState.errors.city?.message}>
                        <Input {...quoteForm.register("city")} />
                      </Field>
                      <Field label="Project Type" error={quoteForm.formState.errors.projectType?.message}>
                        <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...quoteForm.register("projectType")}>
                          <option value="combined">Combined</option>
                          <option value="construction">Construction</option>
                          <option value="modular-kitchen">Modular Kitchen</option>
                          <option value="interior">Interior</option>
                          <option value="wardrobe">Wardrobe</option>
                        </select>
                      </Field>
                      <Field label="Budget Range" error={quoteForm.formState.errors.budgetRange?.message}>
                        <Input placeholder="Example: 10L - 20L" {...quoteForm.register("budgetRange")} />
                      </Field>
                    </div>
                    <Field label="Notes" error={quoteForm.formState.errors.notes?.message}>
                      <textarea
                        className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                        placeholder="Site details, preferred materials, timeline, or special requirements"
                        {...quoteForm.register("notes")}
                      />
                    </Field>
                    <Button type="submit" variant="success">
                      Submit Quote <Send className="h-4 w-4" />
                    </Button>
                    {quoteMessage && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{quoteMessage}</p>}
                  </form>
                </CardContent>
              </Card>
              <CartPanel cart={cart} total={cartTotal} onQuantity={updateCartQuantity} onRemove={removeFromCart} onQuote={() => null} />
            </motion.div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product, quantity: number, rate: number, variant?: string) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [variantIndex, setVariantIndex] = useState(0);
  const variant = product.variants?.[variantIndex];
  const rate = variant?.rate ?? product.rate;

  return (
    <Card className="overflow-hidden">
      <img src={product.image} alt="" className="h-44 w-full object-cover" />
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{product.name}</CardTitle>
            <CardDescription>{product.category}</CardDescription>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{product.unit}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="min-h-10 text-sm leading-5 text-slate-600">{product.description}</p>
        {product.variants && (
          <div className="grid gap-2">
            <Label>Variant</Label>
            <select
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={variantIndex}
              onChange={(event) => setVariantIndex(Number(event.target.value))}
            >
              {product.variants.map((item, index) => (
                <option key={item.name} value={index}>
                  {item.name} - {formatCurrency(item.rate)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="grid flex-1 gap-2">
            <Label>Quantity</Label>
            <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} />
          </div>
          <div className="pb-2 text-right">
            <div className="text-xs text-slate-500">Rate</div>
            <div className="text-lg font-semibold text-slate-950">{formatCurrency(rate)}</div>
          </div>
        </div>
        <Button className="w-full" onClick={() => onAdd(product, quantity, rate, variant?.name)}>
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}

function CartPanel({
  cart,
  total,
  onQuantity,
  onRemove,
  onQuote
}: {
  cart: CartItem[];
  total: number;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onQuote: () => void;
}) {
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Shopping Cart</CardTitle>
        <CardDescription>Selected products from kitchen, interior, and wardrobe calculators.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cart.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Select products to build an estimate.
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.variant ?? item.category}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    className="rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Input
                    className="w-24"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => onQuantity(item.id, Number(event.target.value) || 1)}
                  />
                  <span className="font-semibold text-slate-950">{formatCurrency(item.rate * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm text-slate-600">Cart Total</span>
          <span className="text-xl font-semibold text-slate-950">{formatCurrency(total)}</span>
        </div>
        <Button className="w-full" variant="success" onClick={onQuote}>
          Proceed to Quote <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ConstructionResults({ result }: { result: ReturnType<typeof calculateConstruction> }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Total Cost" value={formatCurrency(result.totalCost)} />
        <Metric title="Built-up Area" value={`${result.areas.builtup} sq ft`} />
        <Metric title="Super Built-up" value={`${result.areas.superBuiltup} sq ft`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Breakdown</CardTitle>
          <CardDescription>Percentage allocation based on the selected quality preset.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.materialBreakdown.map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="text-slate-950">{formatCurrency(item.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(item.percentage * 2.8, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quantity Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {result.quantities.map((item) => (
                <div key={item.key} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash-flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {result.cashflow.map((item) => (
                <div key={item.month} className="grid grid-cols-[72px_1fr_100px] items-center gap-3 text-sm">
                  <span className="text-slate-600">Month {item.month}</span>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.min(item.percentage * 3, 100)}%` }} />
                  </div>
                  <span className="text-right font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{result.disclaimer}</p>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  );
}
