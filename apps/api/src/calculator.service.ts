import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { CacheService } from "./cache.service.js";
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
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

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

    const brands = await this.prisma.brand.findMany({
      orderBy: { name: "asc" }
    });

    await this.cache.set(cacheKey, brands, 3600); // cache for 1 hour
    return brands;
  }

  async createBrand(body: any) {
    const brand = await this.prisma.brand.create({
      data: {
        name: body.name,
        logoUrl: body.logoUrl || ""
      }
    });

    await this.cache.del("catalog:brands");
    return { success: true, brand };
  }

  async deleteBrand(id: string) {
    try {
      await this.prisma.brand.delete({ where: { id } });
    } catch {
      throw new NotFoundException("Brand not found");
    }
    await this.cache.del("catalog:brands");
    return { success: true };
  }

  // ===================== CATEGORIES =====================

  async getCategories() {
    const cacheKey = "catalog:categories";
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany();
    const formatted = categories.map(c => ({
      ...c,
      subcategories: JSON.parse(c.subcategories)
    }));

    await this.cache.set(cacheKey, formatted, 3600);
    return formatted;
  }

  async createCategory(body: any) {
    const subcats = Array.isArray(body.subcategories) ? body.subcategories : [];
    const category = await this.prisma.category.create({
      data: {
        name: body.name,
        description: body.description || "",
        subcategories: JSON.stringify(subcats)
      }
    });

    await this.cache.del("catalog:categories");
    return { success: true, category: { ...category, subcategories: subcats } };
  }

  async deleteCategory(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch {
      throw new NotFoundException("Category not found");
    }
    await this.cache.del("catalog:categories");
    return { success: true };
  }

  // ===================== CATALOG PRODUCTS =====================

  async getCatalog() {
    const cacheKey = "catalog:products";
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const dbProducts = await this.prisma.product.findMany({
      orderBy: { name: "asc" }
    });

    const products = dbProducts.map(p => ({
      id: p.id,
      calculator: p.calculator,
      category: p.categoryId, // Keep compatible format
      categoryId: p.categoryId,
      subcategory: p.subcategory,
      name: p.name,
      description: p.description || "",
      unit: p.unit,
      rate: p.rate,
      image: p.imageUrl || "",
      imageUrl: p.imageUrl || "",
      variants: JSON.parse(p.variants)
    }));

    await this.cache.set(cacheKey, products, 1800); // cache for 30 minutes
    return products;
  }

  async createProduct(body: any) {
    const variants = Array.isArray(body.variants) ? body.variants : [];
    const product = await this.prisma.product.create({
      data: {
        id: body.id || `prod_${Date.now()}`,
        calculator: body.calculator,
        categoryId: body.categoryId,
        subcategory: body.subcategory || "No Subcategory",
        name: body.name,
        description: body.description || "",
        imageUrl: body.imageUrl || "",
        unit: body.unit,
        rate: parseFloat(body.rate) || 0,
        variants: JSON.stringify(variants)
      }
    });

    await this.cache.del("catalog:products");
    return { success: true, product: { ...product, variants } };
  }

  async updateProduct(id: string, body: any) {
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.subcategory !== undefined) updates.subcategory = body.subcategory;
    if (body.unit !== undefined) updates.unit = body.unit;
    if (body.rate !== undefined) updates.rate = parseFloat(body.rate) || 0;
    if (body.variants !== undefined) {
      const vArray = Array.isArray(body.variants) ? body.variants : [];
      updates.variants = JSON.stringify(vArray);
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: updates
      });
      await this.cache.del("catalog:products");
      return { success: true, product: { ...product, variants: JSON.parse(product.variants) } };
    } catch {
      throw new NotFoundException("Product not found");
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch {
      throw new NotFoundException("Product not found");
    }
    await this.cache.del("catalog:products");
    return { success: true };
  }

  // ===================== CUSTOM WOODWORK CONFIG =====================

  async getWoodwork() {
    const cacheKey = "woodwork:items";
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const items = await this.prisma.woodworkItem.findMany({
      orderBy: { sortOrder: "asc" }
    });

    const formatted = items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description || "",
      sortOrder: i.sortOrder,
      options: JSON.parse(i.options)
    }));

    await this.cache.set(cacheKey, formatted, 1800);
    return formatted;
  }

  async saveWoodworkItem(body: any) {
    const id = body.id || `item_${Date.now()}`;
    const options = Array.isArray(body.options) ? body.options : [];

    const item = await this.prisma.woodworkItem.upsert({
      where: { id },
      update: {
        name: body.name,
        description: body.description || "",
        sortOrder: parseInt(body.sortOrder) || 0,
        options: JSON.stringify(options)
      },
      create: {
        id,
        name: body.name,
        description: body.description || "",
        sortOrder: parseInt(body.sortOrder) || 0,
        options: JSON.stringify(options)
      }
    });

    await this.cache.del("woodwork:items");
    return { success: true, item: { ...item, options } };
  }

  async deleteWoodworkItem(id: string) {
    try {
      await this.prisma.woodworkItem.delete({ where: { id } });
    } catch {
      throw new NotFoundException("Woodwork item not found");
    }
    await this.cache.del("woodwork:items");
    return { success: true };
  }

  // ===================== CUSTOM DOORS (INTERIOR) CONFIG =====================

  async getDoorsAll() {
    const cacheKey = "doors:all";
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const [templates, dbVariants, dbFinishes, addonGroups, dbAddons, settingsDoc] = await Promise.all([
      this.prisma.doorTemplate.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.doorVariant.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.doorFinish.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.doorAddonGroup.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.doorAddon.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.doorSetting.findUnique({ where: { id: "global" } })
    ]);

    const variants = dbVariants.map(v => ({
      ...v,
      basePrice: v.basePrice,
      isActive: v.isActive
    }));

    const finishes = dbFinishes.map(f => ({
      ...f,
      priceValue: f.priceValue,
      isActive: f.isActive
    }));

    const addons = dbAddons.map(a => ({
      ...a,
      price: a.price,
      isActive: a.isActive
    }));

    const settings = settingsDoc
      ? {
          taxPercent: settingsDoc.taxPercent,
          installationCharges: settingsDoc.installationCharges,
          installationType: settingsDoc.installationType,
          minQuantity: settingsDoc.minQuantity,
          maxQuantity: settingsDoc.maxQuantity,
          whatsappNumber: settingsDoc.whatsappNumber,
          floorOptions: JSON.parse(settingsDoc.floorOptions),
          areaOptions: JSON.parse(settingsDoc.areaOptions)
        }
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
      addonGroups: addonGroups.map(g => ({
        ...g,
        appliesToTemplates: JSON.parse(g.appliesToTemplates)
      })),
      addons,
      settings
    };

    await this.cache.set(cacheKey, data, 1800);
    return data;
  }

  // Admin Door Template CRUD
  async saveDoorTemplate(body: any) {
    const id = body.id || `template_${Date.now()}`;
    const t = await this.prisma.doorTemplate.upsert({
      where: { id },
      update: {
        name: body.name,
        description: body.description || "",
        imageUrl: body.imageUrl || "",
        icon: body.icon || "🚪",
        isPublished: body.isPublished !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      },
      create: {
        id,
        name: body.name,
        description: body.description || "",
        imageUrl: body.imageUrl || "",
        icon: body.icon || "🚪",
        isPublished: body.isPublished !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      }
    });
    await this.cache.del("doors:all");
    return { success: true, template: t };
  }

  async deleteDoorTemplate(id: string) {
    await this.prisma.doorTemplate.delete({ where: { id } });
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Variant CRUD
  async saveDoorVariant(body: any) {
    const id = body.id || `variant_${Date.now()}`;
    const v = await this.prisma.doorVariant.upsert({
      where: { id },
      update: {
        templateId: body.templateId,
        name: body.name,
        description: body.description || "",
        basePrice: parseFloat(body.basePrice) || 0,
        sku: body.sku || "",
        imageUrl: body.imageUrl || "",
        isActive: body.isActive !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      },
      create: {
        id,
        templateId: body.templateId,
        name: body.name,
        description: body.description || "",
        basePrice: parseFloat(body.basePrice) || 0,
        sku: body.sku || "",
        imageUrl: body.imageUrl || "",
        isActive: body.isActive !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      }
    });
    await this.cache.del("doors:all");
    return { success: true, variant: v };
  }

  async deleteDoorVariant(id: string) {
    await this.prisma.doorVariant.delete({ where: { id } });
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Finish CRUD
  async saveDoorFinish(body: any) {
    const id = body.id || `finish_${Date.now()}`;
    const f = await this.prisma.doorFinish.upsert({
      where: { id },
      update: {
        variantId: body.variantId,
        name: body.name,
        description: body.description || "",
        priceType: body.priceType || "absolute",
        priceValue: parseFloat(body.priceValue) || 0,
        imageUrl: body.imageUrl || "",
        isActive: body.isActive !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      },
      create: {
        id,
        variantId: body.variantId,
        name: body.name,
        description: body.description || "",
        priceType: body.priceType || "absolute",
        priceValue: parseFloat(body.priceValue) || 0,
        imageUrl: body.imageUrl || "",
        isActive: body.isActive !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      }
    });
    await this.cache.del("doors:all");
    return { success: true, finish: f };
  }

  async deleteDoorFinish(id: string) {
    await this.prisma.doorFinish.delete({ where: { id } });
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Addon Group CRUD
  async saveDoorAddonGroup(body: any) {
    const id = body.id || `addongroup_${Date.now()}`;
    const applies = Array.isArray(body.appliesToTemplates) ? body.appliesToTemplates : [];
    const g = await this.prisma.doorAddonGroup.upsert({
      where: { id },
      update: {
        name: body.name,
        description: body.description || "",
        selectionType: body.selectionType || "multiple",
        isRequired: body.isRequired === true,
        appliesToTemplates: JSON.stringify(applies),
        sortOrder: parseInt(body.sortOrder) || 0
      },
      create: {
        id,
        name: body.name,
        description: body.description || "",
        selectionType: body.selectionType || "multiple",
        isRequired: body.isRequired === true,
        appliesToTemplates: JSON.stringify(applies),
        sortOrder: parseInt(body.sortOrder) || 0
      }
    });
    await this.cache.del("doors:all");
    return { success: true, addonGroup: { ...g, appliesToTemplates: applies } };
  }

  async deleteDoorAddonGroup(id: string) {
    await this.prisma.doorAddonGroup.delete({ where: { id } });
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Addon CRUD
  async saveDoorAddon(body: any) {
    const id = body.id || `addon_${Date.now()}`;
    const a = await this.prisma.doorAddon.upsert({
      where: { id },
      update: {
        groupId: body.groupId,
        name: body.name,
        description: body.description || "",
        price: parseFloat(body.price) || 0,
        icon: body.icon || "🔧",
        imageUrl: body.imageUrl || "",
        isActive: body.isActive !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      },
      create: {
        id,
        groupId: body.groupId,
        name: body.name,
        description: body.description || "",
        price: parseFloat(body.price) || 0,
        icon: body.icon || "🔧",
        imageUrl: body.imageUrl || "",
        isActive: body.isActive !== false,
        sortOrder: parseInt(body.sortOrder) || 0
      }
    });
    await this.cache.del("doors:all");
    return { success: true, addon: a };
  }

  async deleteDoorAddon(id: string) {
    await this.prisma.doorAddon.delete({ where: { id } });
    await this.cache.del("doors:all");
    return { success: true };
  }

  // Admin Door Settings Save
  async saveDoorSettings(body: any) {
    const floors = Array.isArray(body.floorOptions) ? body.floorOptions : [];
    const areas = Array.isArray(body.areaOptions) ? body.areaOptions : [];

    const s = await this.prisma.doorSetting.upsert({
      where: { id: "global" },
      update: {
        taxPercent: parseFloat(body.taxPercent) || 18,
        installationCharges: parseFloat(body.installationCharges) || 0,
        installationType: body.installationType || "fixed",
        minQuantity: parseInt(body.minQuantity) || 1,
        maxQuantity: parseInt(body.maxQuantity) || 100,
        whatsappNumber: body.whatsappNumber || "",
        floorOptions: JSON.stringify(floors),
        areaOptions: JSON.stringify(areas)
      },
      create: {
        id: "global",
        taxPercent: parseFloat(body.taxPercent) || 18,
        installationCharges: parseFloat(body.installationCharges) || 0,
        installationType: body.installationType || "fixed",
        minQuantity: parseInt(body.minQuantity) || 1,
        maxQuantity: parseInt(body.maxQuantity) || 100,
        whatsappNumber: body.whatsappNumber || "",
        floorOptions: JSON.stringify(floors),
        areaOptions: JSON.stringify(areas)
      }
    });
    await this.cache.del("doors:all");
    return { success: true, settings: { ...s, floorOptions: floors, areaOptions: areas } };
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

  async getQuotes() {
    return this.prisma.quote.findMany({
      orderBy: { createdAt: "desc" }
    });
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
  }) {
    const parsed = quoteSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const quote = await this.prisma.quote.create({
      data: {
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
        customerId: input.customerId || null
      }
    });

    // proxy Google Sheets Sync in background (failsafe)
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
    
    // Format quote details for Sheets macro
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
