import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";
import { CacheService } from "./cache.service.js";
import * as crypto from "crypto";
import {
  calculateConstruction,
  constructionConfig,
  constructionInputSchema,
  quoteSchema,
  type ConstructionInput,
  type QuoteInput
} from "@cost-calculator/shared";

@Injectable()
export class CalculatorService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly cache: CacheService
  ) {}

  private get db() {
    return this.firebase.db;
  }

  // ===================== CONFIG & HEALTH =====================

  getConfig() {
    return {
      construction: constructionConfig
    };
  }

  // ===================== BRANDS =====================

  async getBrands() {
    const cacheKey = "catalog:brands";
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const snap = await this.db.collection("brands").get();
    const brands = snap.docs.map((d: any) => d.data());
    brands.sort((a: any, b: any) => a.name.localeCompare(b.name));

    await this.cache.set(cacheKey, brands, 3600);
    return brands;
  }

  async createBrand(body: any) {
    const id = crypto.randomUUID();
    const brand = {
      id,
      name: body.name,
      logoUrl: body.logoUrl || ""
    };
    await this.db.collection("brands").doc(id).set(brand);

    await this.cache.del("catalog:brands");
    return { success: true, brand };
  }

  async deleteBrand(id: string) {
    await this.db.collection("brands").doc(id).delete();
    await this.cache.del("catalog:brands");
    return { success: true };
  }

  // ===================== CATEGORIES =====================

  async getCategories() {
    const cacheKey = "catalog:categories";
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const snap = await this.db.collection("categories").get();
    const categories = snap.docs.map((d: any) => {
      const c = d.data();
      return {
        id: c.id,
        name: c.name,
        description: c.description || "",
        subcategories: Array.isArray(c.subcategories) ? c.subcategories : JSON.parse(c.subcategories || "[]")
      };
    });

    await this.cache.set(cacheKey, categories, 3600);
    return categories;
  }

  async createCategory(body: any) {
    const id = crypto.randomUUID();
    const subcats = Array.isArray(body.subcategories) ? body.subcategories : [];
    const category = {
      id,
      name: body.name,
      description: body.description || "",
      subcategories: subcats
    };
    await this.db.collection("categories").doc(id).set(category);

    await this.cache.del("catalog:categories");
    return { success: true, category };
  }

  async deleteCategory(id: string) {
    await this.db.collection("categories").doc(id).delete();
    await this.cache.del("catalog:categories");
    return { success: true };
  }

  // ===================== CATALOG PRODUCTS =====================

  async getCatalog() {
    const cacheKey = "catalog:products";
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const snap = await this.db.collection("products").get();
    const products = snap.docs.map((d: any) => {
      const p = d.data();
      return {
        id: p.id,
        calculator: p.calculator,
        category: p.categoryId,
        categoryId: p.categoryId,
        subcategory: p.subcategory || "No Subcategory",
        name: p.name,
        description: p.description || "",
        unit: p.unit,
        rate: p.rate,
        image: p.imageUrl || "",
        imageUrl: p.imageUrl || "",
        variants: Array.isArray(p.variants) ? p.variants : JSON.parse(p.variants || "[]")
      };
    });
    products.sort((a: any, b: any) => a.name.localeCompare(b.name));

    await this.cache.set(cacheKey, products, 1800);
    return products;
  }

  async createProduct(body: any) {
    const id = body.id || `prod_${Date.now()}`;
    const variants = Array.isArray(body.variants) ? body.variants : [];
    const product = {
      id,
      calculator: body.calculator,
      categoryId: body.categoryId,
      subcategory: body.subcategory || "No Subcategory",
      name: body.name,
      description: body.description || "",
      imageUrl: body.imageUrl || "",
      unit: body.unit,
      rate: parseFloat(body.rate) || 0,
      variants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.collection("products").doc(id).set(product);

    await this.cache.del("catalog:products");
    return { success: true, product };
  }

  async updateProduct(id: string, body: any) {
    const docRef = this.db.collection("products").doc(id);
    const current = (await docRef.get()).data();
    if (!current) {
      throw new NotFoundException("Product not found");
    }

    const updated = {
      ...current,
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.subcategory !== undefined && { subcategory: body.subcategory }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.rate !== undefined && { rate: parseFloat(body.rate) || 0 }),
      ...(body.variants !== undefined && { variants: Array.isArray(body.variants) ? body.variants : [] }),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updated);
    await this.cache.del("catalog:products");

    return {
      success: true,
      product: updated
    };
  }

  async deleteProduct(id: string) {
    await this.db.collection("products").doc(id).delete();
    await this.cache.del("catalog:products");
    return { success: true };
  }

  // ===================== CUSTOM WOODWORK CONFIG =====================

  async getWoodwork() {
    const cacheKey = "woodwork:items";
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const snap = await this.db.collection("woodwork_items").get();
    const items = snap.docs.map((d: any) => {
      const i = d.data();
      return {
        id: i.id,
        name: i.name,
        description: i.description || "",
        sortOrder: i.sortOrder || 0,
        options: Array.isArray(i.options) ? i.options : JSON.parse(i.options || "[]")
      };
    });
    items.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    await this.cache.set(cacheKey, items, 1800);
    return items;
  }

  async saveWoodworkItem(body: any) {
    const id = body.id || `item_${Date.now()}`;
    const options = Array.isArray(body.options) ? body.options : [];

    const item = {
      id,
      name: body.name,
      description: body.description || "",
      sortOrder: parseInt(body.sortOrder) || 0,
      options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.collection("woodwork_items").doc(id).set(item);

    await this.cache.del("woodwork:items");
    return { success: true, item };
  }

  async deleteWoodworkItem(id: string) {
    await this.db.collection("woodwork_items").doc(id).delete();
    await this.cache.del("woodwork:items");
    return { success: true };
  }

  // ===================== CUSTOM DOORS (INTERIOR) CONFIG =====================

  async getDoorsAll() {
    const cacheKey = "doors:all";
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const [tSnap, vSnap, fSnap, gSnap, aSnap, sDoc] = await Promise.all([
      this.db.collection("door_templates").get(),
      this.db.collection("door_variants").get(),
      this.db.collection("door_finishes").get(),
      this.db.collection("door_addon_groups").get(),
      this.db.collection("door_addons").get(),
      this.db.collection("door_settings").doc("global").get()
    ]);

    const templates = tSnap.docs.map((d: any) => d.data());
    templates.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const variants = vSnap.docs.map((d: any) => d.data());
    variants.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const finishes = fSnap.docs.map((d: any) => d.data());
    finishes.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const addonGroups = gSnap.docs.map((d: any) => {
      const g = d.data();
      return {
        ...g,
        appliesToTemplates: Array.isArray(g.appliesToTemplates) ? g.appliesToTemplates : JSON.parse(g.appliesToTemplates || "[]")
      };
    });
    addonGroups.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const addons = aSnap.docs.map((d: any) => d.data());
    addons.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const settings = sDoc.exists
      ? sDoc.data()
      : {
          taxPercent: 18,
          installationCharges: 0,
          installationType: "fixed",
          minQuantity: 1,
          maxQuantity: 100,
          whatsappNumber: "919582581238",
          floorOptions: ["Ground Floor", "First Floor", "Second Floor", "Underground Floor"],
          areaOptions: ["Bathroom", "Kitchen", "Hall"]
        };

    const data = {
      templates,
      variants,
      finishes,
      addonGroups,
      addons,
      settings
    };

    await this.cache.set(cacheKey, data, 1800);
    return data;
  }

  // Admin Door Template CRUD
  async saveDoorTemplate(body: any) {
    const id = body.id || `template_${Date.now()}`;
    const t = {
      id,
      name: body.name,
      description: body.description || "",
      imageUrl: body.imageUrl || "",
      icon: body.icon || "🚪",
      isPublished: body.isPublished !== false,
      sortOrder: parseInt(body.sortOrder) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.collection("door_templates").doc(id).set(t);

    await this.cache.del("doors:all");
    return { success: true, template: t };
  }

  async deleteDoorTemplate(id: string) {
    await this.db.collection("door_templates").doc(id).delete();
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Variant CRUD
  async saveDoorVariant(body: any) {
    const id = body.id || `variant_${Date.now()}`;
    const v = {
      id,
      templateId: body.templateId,
      name: body.name,
      description: body.description || "",
      basePrice: parseFloat(body.basePrice) || 0,
      sku: body.sku || "",
      imageUrl: body.imageUrl || "",
      isActive: body.isActive !== false,
      sortOrder: parseInt(body.sortOrder) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.collection("door_variants").doc(id).set(v);

    await this.cache.del("doors:all");
    return { success: true, variant: v };
  }

  async deleteDoorVariant(id: string) {
    await this.db.collection("door_variants").doc(id).delete();
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Finish CRUD
  async saveDoorFinish(body: any) {
    const id = body.id || `finish_${Date.now()}`;
    const f = {
      id,
      variantId: body.variantId,
      name: body.name,
      description: body.description || "",
      priceType: body.priceType || "absolute",
      priceValue: parseFloat(body.priceValue) || 0,
      imageUrl: body.imageUrl || "",
      isActive: body.isActive !== false,
      sortOrder: parseInt(body.sortOrder) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.collection("door_finishes").doc(id).set(f);

    await this.cache.del("doors:all");
    return { success: true, finish: f };
  }

  async deleteDoorFinish(id: string) {
    await this.db.collection("door_finishes").doc(id).delete();
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Addon Group CRUD
  async saveDoorAddonGroup(body: any) {
    const id = body.id || `addongroup_${Date.now()}`;
    const applies = Array.isArray(body.appliesToTemplates) ? body.appliesToTemplates : [];
    const g = {
      id,
      name: body.name,
      description: body.description || "",
      selectionType: body.selectionType || "multiple",
      isRequired: body.isRequired === true,
      appliesToTemplates: applies,
      sortOrder: parseInt(body.sortOrder) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.collection("door_addon_groups").doc(id).set(g);

    await this.cache.del("doors:all");
    return { success: true, addonGroup: g };
  }

  async deleteDoorAddonGroup(id: string) {
    await this.db.collection("door_addon_groups").doc(id).delete();
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Addon CRUD
  async saveDoorAddon(body: any) {
    const id = body.id || `addon_${Date.now()}`;
    const a = {
      id,
      groupId: body.groupId,
      name: body.name,
      description: body.description || "",
      price: parseFloat(body.price) || 0,
      icon: body.icon || "🔧",
      imageUrl: body.imageUrl || "",
      isActive: body.isActive !== false,
      sortOrder: parseInt(body.sortOrder) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.collection("door_addons").doc(id).set(a);

    await this.cache.del("doors:all");
    return { success: true, addon: a };
  }

  async deleteDoorAddon(id: string) {
    await this.db.collection("door_addons").doc(id).delete();
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Settings Save
  async saveDoorSettings(body: any) {
    const floors = Array.isArray(body.floorOptions) ? body.floorOptions : [];
    const areas = Array.isArray(body.areaOptions) ? body.areaOptions : [];

    const s = {
      id: "global",
      taxPercent: parseFloat(body.taxPercent) || 18,
      installationCharges: parseFloat(body.installationCharges) || 0,
      installationType: body.installationType || "fixed",
      minQuantity: parseInt(body.minQuantity) || 1,
      maxQuantity: parseInt(body.maxQuantity) || 100,
      whatsappNumber: body.whatsappNumber || "",
      floorOptions: floors,
      areaOptions: areas,
      updatedAt: new Date().toISOString()
    };
    await this.db.collection("door_settings").doc("global").set(s);

    await this.cache.del("doors:all");
    return { success: true, settings: s };
  }

  // ===================== CALCULATIONS (CONSTRUCTION) =====================

  calculateConstruction(input: ConstructionInput) {
    const parsed = constructionInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return calculateConstruction(parsed.data);
  }

  // ===================== QUOTES =====================

  async getQuotes(user: any) {
    const { userId, role } = user;

    if (role === "admin") {
      const snap = await this.db.collection("quotes").get();
      const quotes = snap.docs.map((d: any) => d.data());
      quotes.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      return quotes;
    }

    if (role === "company") {
      const empSnap = await this.db.collection("users").where("companyId", "==", userId).get();
      const ids = [userId, ...empSnap.docs.map((e: any) => e.id)];

      const snap = await this.db.collection("quotes").get();
      const allQuotes = snap.docs.map((d: any) => d.data());
      const filtered = allQuotes.filter((q: any) => ids.includes(q.customerId));
      filtered.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      return filtered;
    }

    const snap = await this.db.collection("quotes").where("customerId", "==", userId).get();
    const quotes = snap.docs.map((d: any) => d.data());
    quotes.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    return quotes;
  }

  async createQuote(input: QuoteInput & {
    products?: any;
    woodwork?: any;
    doors?: any;
    totalAmount?: number;
    customerId?: string;
    roomSize?: any;
    startDate?: string;
    additionalNotes?: string;
    city?: string;
    notes?: string;
  }, customerId?: string) {
    const parsed = quoteSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const id = crypto.randomUUID();
    const quote = {
      id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.phone,
      customerEmail: parsed.data.email,
      customerLocation: input.city || "",
      projectType: parsed.data.projectType,
      roomSize: input.roomSize ? parseFloat(input.roomSize as any) : null,
      budgetRange: parsed.data.budgetRange,
      startDate: input.startDate || "",
      specialRequirements: input.notes || "",
      additionalNotes: input.additionalNotes || "",
      totalAmount: input.totalAmount || 0,
      productsJson: JSON.stringify(input.products || []),
      woodworkJson: JSON.stringify(input.woodwork || []),
      doorJson: JSON.stringify(input.doors || []),
      customerId: customerId || input.customerId || null,
      createdAt: new Date().toISOString()
    };

    await this.db.collection("quotes").doc(id).set(quote);

    this.syncToGoogleSheets(quote).catch(err => {
      console.warn("⚠️ Google Sheets background sync failed:", err.message);
    });

    return {
      success: true,
      quote,
      message: "Quote request successfully saved through NestJS."
    };
  }

  private async syncToGoogleSheets(quote: any) {
    const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyEbQV76e5cy6NQIgSAaU0Ok21i_B6EQnkrPz_mQqmOOeUANFSlBpT_6HKnxqRAlDtSBw/exec";

    const payload = {
      timestamp: quote.createdAt,
      actionType: "Backend",
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      customerLocation: quote.customerLocation || "",
      projectType: quote.projectType,
      roomSize: quote.roomSize || "",
      budgetRange: quote.budgetRange,
      startDate: quote.startDate || "",
      specialRequirements: quote.specialRequirements || "",
      additionalNotes: quote.additionalNotes || "",
      estimatedTotal: quote.totalAmount
    };

    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      // silent swallow
    }
  }
}
