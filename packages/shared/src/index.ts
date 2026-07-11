import { z } from "zod";

export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export const constructionInputSchema = z.object({
  carpetArea: z.coerce.number().min(100, "Enter at least 100 sq ft").max(100000),
  quality: z.enum(["basic", "standard", "premium"]),
  timeline: z.enum(["3-months", "6-months", "9-months", "12-months"]),
  methods: z.array(z.enum(["costPerSqFt", "materialPercentage", "quantityEstimation", "timeline"])).min(1)
});

export const quoteSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Phone is required"),
  email: z.string().email("Enter a valid email"),
  projectType: z.enum(["construction", "modular-kitchen", "interior", "wardrobe", "combined"]),
  city: z.string().min(2, "City is required"),
  budgetRange: z.string().min(1, "Budget range is required"),
  notes: z.string().max(800).optional().default("")
});

export type ConstructionInput = z.infer<typeof constructionInputSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;

export type QualityKey = ConstructionInput["quality"];
export type TimelineKey = ConstructionInput["timeline"];
export type CalculatorMethod = ConstructionInput["methods"][number];

export type Product = {
  id: string;
  calculator: "modular-kitchen" | "interior" | "wardrobe";
  category: string;
  name: string;
  description: string;
  unit: string;
  rate: number;
  image: string;
  variants?: Array<{ name: string; rate: number }>;
};

export const constructionConfig = {
  areaConversions: {
    carpetToBuiltup: 1.25,
    builtupToSuper: 1.39
  },
  qualityPresets: {
    basic: {
      name: "Basic",
      minPerSqFt: 800,
      maxPerSqFt: 1200,
      defaultPerSqFt: 1000,
      description: "Standard shell, practical finishes, value-first selections."
    },
    standard: {
      name: "Standard",
      minPerSqFt: 1200,
      maxPerSqFt: 1800,
      defaultPerSqFt: 1500,
      description: "Balanced materials, modern finishes, strong everyday durability."
    },
    premium: {
      name: "Premium",
      minPerSqFt: 1800,
      maxPerSqFt: 3000,
      defaultPerSqFt: 2500,
      description: "Premium finish stack, richer fixtures, and upgraded specifications."
    }
  },
  materialPercentages: [
    { key: "cement", name: "Cement & Mortar", percentage: 16.4 },
    { key: "sand", name: "Sand", percentage: 12.3 },
    { key: "aggregate", name: "Aggregate", percentage: 7.4 },
    { key: "steel", name: "Steel & Reinforcement", percentage: 24.6 },
    { key: "fittings", name: "Fittings & Others", percentage: 22.8 },
    { key: "labor", name: "Labor & Supervision", percentage: 10.0 },
    { key: "others", name: "Others", percentage: 6.5 }
  ],
  quantityFactors: [
    { key: "cementBags", name: "Cement Bags", perSqFt: 0.38, unit: "bags", wastagePercentage: 2 },
    { key: "steel", name: "Steel Reinforcement", perSqFt: 4.5, unit: "kg", wastagePercentage: 3 },
    { key: "fineSand", name: "Fine Sand", perSqFt: 0.45, unit: "cubic ft", wastagePercentage: 5 },
    { key: "coarseSand", name: "Coarse Sand", perSqFt: 0.45, unit: "cubic ft", wastagePercentage: 5 },
    { key: "aggregate", name: "Stone Aggregate", perSqFt: 0.75, unit: "cubic ft", wastagePercentage: 3 },
    { key: "bricks", name: "Bricks", perSqFt: 9, unit: "nos", wastagePercentage: 5 },
    { key: "paint", name: "Paint", perSqFt: 0.04, unit: "liters", wastagePercentage: 10 }
  ],
  timelineDistributions: {
    "3-months": [33.3, 33.3, 33.4],
    "6-months": [21.9, 18.4, 18, 17.8, 17.8, 6.1],
    "9-months": [20, 18, 16, 15, 14, 8, 5, 2, 2],
    "12-months": [15, 12, 11, 11, 10, 9, 8, 8, 7, 5, 2, 2]
  } satisfies Record<TimelineKey, number[]>,
  disclaimer:
    "All calculations are planning estimates based on thumb rules. Final pricing depends on site conditions, structural design, market rates, selected brands, and execution scope."
};

export const catalog: Product[] = [
  {
    id: "mk-base-cabinet",
    calculator: "modular-kitchen",
    category: "Woodwork",
    name: "Base Cabinets",
    description: "BWP plywood cabinet with laminate finish and soft-close hardware.",
    unit: "running ft",
    rate: 7800,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
    variants: [
      { name: "Laminate", rate: 7800 },
      { name: "Acrylic", rate: 10800 },
      { name: "PU Finish", rate: 13200 }
    ]
  },
  {
    id: "mk-wall-cabinet",
    calculator: "modular-kitchen",
    category: "Woodwork",
    name: "Wall Cabinets",
    description: "Overhead modular storage with adjustable shelves.",
    unit: "running ft",
    rate: 6200,
    image: "https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "mk-tandem",
    calculator: "modular-kitchen",
    category: "Accessories",
    name: "Tandem Drawer Set",
    description: "Premium pull-out drawer system for pots and pantry storage.",
    unit: "set",
    rate: 18500,
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "int-flush-door",
    calculator: "interior",
    category: "Doors",
    name: "Flush Door With Laminate",
    description: "Ready-to-install interior door with laminate finish and frame.",
    unit: "door",
    rate: 14500,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    variants: [
      { name: "Wooden Ply", rate: 14500 },
      { name: "HDHMR", rate: 18200 }
    ]
  },
  {
    id: "int-tv-unit",
    calculator: "interior",
    category: "Living",
    name: "TV Unit",
    description: "Wall-mounted media unit with storage and cable management.",
    unit: "sq ft",
    rate: 1850,
    image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "int-wall-panel",
    calculator: "interior",
    category: "Wall Treatment",
    name: "Decorative Wall Panel",
    description: "Feature wall paneling with laminate or veneer option.",
    unit: "sq ft",
    rate: 950,
    image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "wd-sliding",
    calculator: "wardrobe",
    category: "Wardrobe",
    name: "Sliding Wardrobe",
    description: "Space-saving sliding wardrobe with shelves and hanging storage.",
    unit: "sq ft",
    rate: 1750,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "wd-hinged",
    calculator: "wardrobe",
    category: "Wardrobe",
    name: "Hinged Wardrobe",
    description: "Classic hinged shutter wardrobe with modular internals.",
    unit: "sq ft",
    rate: 1450,
    image: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80",
    variants: [
      { name: "Laminate", rate: 1450 },
      { name: "Membrane", rate: 1650 },
      { name: "Acrylic", rate: 2200 }
    ]
  }
];

export function calculateConstruction(input: ConstructionInput) {
  const parsed = constructionInputSchema.parse(input);
  const builtupArea = Math.round(parsed.carpetArea * constructionConfig.areaConversions.carpetToBuiltup);
  const superBuiltupArea = Math.round(builtupArea * constructionConfig.areaConversions.builtupToSuper);
  const preset = constructionConfig.qualityPresets[parsed.quality];
  const totalCost = builtupArea * preset.defaultPerSqFt;

  const materialBreakdown = constructionConfig.materialPercentages.map((item) => ({
    ...item,
    amount: Math.round((totalCost * item.percentage) / 100)
  }));

  const quantities = constructionConfig.quantityFactors.map((item) => {
    const baseQuantity = builtupArea * item.perSqFt;
    const withWastage = baseQuantity * (1 + item.wastagePercentage / 100);
    return {
      ...item,
      quantity: Math.ceil(withWastage)
    };
  });

  const cashflow = constructionConfig.timelineDistributions[parsed.timeline].map((percentage, index) => ({
    month: index + 1,
    percentage,
    amount: Math.round((totalCost * percentage) / 100)
  }));

  return {
    input: parsed,
    areas: {
      carpet: parsed.carpetArea,
      builtup: builtupArea,
      superBuiltup: superBuiltupArea
    },
    preset,
    totalCost,
    perSqFt: preset.defaultPerSqFt,
    materialBreakdown,
    quantities,
    cashflow,
    disclaimer: constructionConfig.disclaimer
  };
}

export function calculateLineItemTotal(rate: number, quantity: number) {
  return Math.max(0, Math.round(rate * quantity));
}
