import pkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import crypto from "crypto";

const { PrismaClient } = pkg;
const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db"
});
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Start seeding...");

  // 1. Create Users
  console.log("👤 Creating users...");
  const adminPassword = hashPassword("admin123");
  const customerPassword = hashPassword("customer123");

  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      password: adminPassword,
      name: "Admin User",
      phone: "9123456789",
      role: "admin"
    }
  });

  await prisma.user.upsert({
    where: { email: "customer@demo.com" },
    update: {},
    create: {
      email: "customer@demo.com",
      password: customerPassword,
      name: "John Doe",
      phone: "9876543210",
      location: "New Delhi",
      role: "customer"
    }
  });

  // 2. Create Brands
  console.log("🏷️ Creating brands...");
  const brandsData = [
    { id: "brand-hafele", name: "Hafele", logoUrl: "" },
    { id: "brand-hettich", name: "Hettich", logoUrl: "" },
    { id: "brand-blum", name: "Blum", logoUrl: "" },
    { id: "brand-sleek", name: "Sleek", logoUrl: "" }
  ];

  for (const b of brandsData) {
    await prisma.brand.upsert({
      where: { id: b.id },
      update: b,
      create: b
    });
  }

  // 3. Create Categories
  console.log("🗂️ Creating categories...");
  const categoriesData = [
    { id: "cat-woodwork", name: "Woodwork", description: "Bespoke woodwork parts", subcategories: JSON.stringify(["Cabinets", "Shutters", "Shelves"]) },
    { id: "cat-accessories", name: "Accessories", description: "Kitchen and wardrobe pull-outs", subcategories: JSON.stringify(["Drawers", "Organizers", "Trays"]) },
    { id: "cat-doors", name: "Doors", description: "Custom entrance & room doors", subcategories: JSON.stringify(["Flush Doors", "Panel Doors"]) },
    { id: "cat-living", name: "Living", description: "Media units and panels", subcategories: JSON.stringify(["TV Units", "Bookshelves"]) },
    { id: "cat-wall-treatment", name: "Wall Treatment", description: "Feature panels and coatings", subcategories: JSON.stringify(["Panels", "Wallpaper"]) },
    { id: "cat-wardrobe", name: "Wardrobe", description: "Complete wardrobe structures", subcategories: JSON.stringify(["Hinged", "Sliding"]) }
  ];

  for (const c of categoriesData) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: c,
      create: c
    });
  }

  // 4. Create Products (Catalog)
  console.log("📦 Creating products...");
  const productsData = [
    {
      id: "mk-base-cabinet",
      calculator: "modular-kitchen",
      categoryId: "cat-woodwork",
      subcategory: "Cabinets",
      name: "Base Cabinets",
      description: "BWP plywood cabinet with laminate finish and soft-close hardware.",
      unit: "running ft",
      rate: 7800,
      imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([
        { name: "Laminate", rate: 7800 },
        { name: "Acrylic", rate: 10800 },
        { name: "PU Finish", rate: 13200 }
      ])
    },
    {
      id: "mk-wall-cabinet",
      calculator: "modular-kitchen",
      categoryId: "cat-woodwork",
      subcategory: "Cabinets",
      name: "Wall Cabinets",
      description: "Overhead modular storage with adjustable shelves.",
      unit: "running ft",
      rate: 6200,
      imageUrl: "https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([])
    },
    {
      id: "mk-tandem",
      calculator: "modular-kitchen",
      categoryId: "cat-accessories",
      subcategory: "Drawers",
      name: "Tandem Drawer Set",
      description: "Premium pull-out drawer system for pots and pantry storage.",
      unit: "set",
      rate: 18500,
      imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([])
    },
    {
      id: "int-flush-door",
      calculator: "interior",
      categoryId: "cat-doors",
      subcategory: "Flush Doors",
      name: "Flush Door With Laminate",
      description: "Ready-to-install interior door with laminate finish and frame.",
      unit: "door",
      rate: 14500,
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([
        { name: "Wooden Ply", rate: 14500 },
        { name: "HDHMR", rate: 18200 }
      ])
    },
    {
      id: "int-tv-unit",
      calculator: "interior",
      categoryId: "cat-living",
      subcategory: "TV Units",
      name: "TV Unit",
      description: "Wall-mounted media unit with storage and cable management.",
      unit: "sq ft",
      rate: 1850,
      imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([])
    },
    {
      id: "int-wall-panel",
      calculator: "interior",
      categoryId: "cat-wall-treatment",
      subcategory: "Panels",
      name: "Decorative Wall Panel",
      description: "Feature wall paneling with laminate or veneer option.",
      unit: "sq ft",
      rate: 950,
      imageUrl: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([])
    },
    {
      id: "wd-sliding",
      calculator: "wardrobe",
      categoryId: "cat-wardrobe",
      subcategory: "Sliding",
      name: "Sliding Wardrobe",
      description: "Space-saving sliding wardrobe with shelves and hanging storage.",
      unit: "sq ft",
      rate: 1750,
      imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([])
    },
    {
      id: "wd-hinged",
      calculator: "wardrobe",
      categoryId: "cat-wardrobe",
      subcategory: "Hinged",
      name: "Hinged Wardrobe",
      description: "Classic hinged shutter wardrobe with modular internals.",
      unit: "sq ft",
      rate: 1450,
      imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80",
      variants: JSON.stringify([
        { name: "Laminate", rate: 1450 },
        { name: "Membrane", rate: 1650 },
        { name: "Acrylic", rate: 2200 }
      ])
    }
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p
    });
  }

  // 5. Create Woodwork items and options
  console.log("🪵 Creating woodwork config...");
  const woodworkItemsData = [
    {
      id: "woodwork_base_cabinets",
      name: "Base Cabinets (Material)",
      description: "Select core structure material for kitchen base units.",
      options: JSON.stringify([
        { id: "opt_base_bwr", name: "BWR Plywood", description: "Boiling Water Resistant ply", price: 1400 },
        { id: "opt_base_bwp", name: "BWP Plywood", description: "Boiling Water Proof ply", price: 1600 },
        { id: "opt_base_hdhmr", name: "HDHMR Board", description: "High Density moisture resistant", price: 1100 }
      ]),
      sortOrder: 1
    },
    {
      id: "woodwork_shutters",
      name: "Shutters (Finish)",
      description: "Select finish type for modular shutter doors.",
      options: JSON.stringify([
        { id: "opt_shutter_laminate", name: "Laminate Finish", description: "Matte/Glossy durable laminate", price: 1200 },
        { id: "opt_shutter_acrylic", name: "Acrylic Finish", description: "Ultra high gloss reflective", price: 1800 },
        { id: "opt_shutter_pu", name: "PU paint", description: "Seamless premium paint finish", price: 2400 }
      ]),
      sortOrder: 2
    }
  ];

  for (const w of woodworkItemsData) {
    await prisma.woodworkItem.upsert({
      where: { id: w.id },
      update: w,
      create: w
    });
  }

  // 6. Create Doors configuration
  console.log("🚪 Seeding doors configurations...");
  const template = await prisma.doorTemplate.upsert({
    where: { id: "door_panel" },
    update: {},
    create: {
      id: "door_panel",
      name: "Panel Door",
      description: "Classic panel door with various material options",
      icon: "🚪",
      sortOrder: 1
    }
  });

  const v1 = await prisma.doorVariant.upsert({
    where: { id: "variant_wooden_ply" },
    update: {},
    create: {
      id: "variant_wooden_ply",
      templateId: template.id,
      name: "Wooden Ply",
      description: "Premium wooden plywood material",
      basePrice: 8500,
      sku: "WP-001",
      sortOrder: 1
    }
  });

  const v2 = await prisma.doorVariant.upsert({
    where: { id: "variant_hdhmr" },
    update: {},
    create: {
      id: "variant_hdhmr",
      templateId: template.id,
      name: "HDHMR",
      description: "High Density High Moisture Resistance board",
      basePrice: 12000,
      sku: "HDHMR-001",
      sortOrder: 2
    }
  });

  // Finishes for Wooden Ply
  await prisma.doorFinish.upsert({
    where: { id: "finish_laminated" },
    update: {},
    create: {
      id: "finish_laminated",
      variantId: v1.id,
      name: "Laminated",
      description: "Durable laminated finish with scratch resistance",
      priceType: "absolute",
      priceValue: 1500,
      sortOrder: 1
    }
  });

  await prisma.doorFinish.upsert({
    where: { id: "finish_glossy" },
    update: {},
    create: {
      id: "finish_glossy",
      variantId: v1.id,
      name: "Glossy",
      description: "High gloss finish for premium look",
      priceType: "absolute",
      priceValue: 2500,
      sortOrder: 2
    }
  });

  // Finishes for HDHMR
  await prisma.doorFinish.upsert({
    where: { id: "finish_hdhmr_laminated" },
    update: {},
    create: {
      id: "finish_hdhmr_laminated",
      variantId: v2.id,
      name: "Laminated",
      description: "Premium laminated finish on HDHMR",
      priceType: "absolute",
      priceValue: 2000,
      sortOrder: 1
    }
  });

  await prisma.doorFinish.upsert({
    where: { id: "finish_hdhmr_membrane" },
    update: {},
    create: {
      id: "finish_hdhmr_membrane",
      variantId: v2.id,
      name: "Membrane",
      description: "PVC membrane finish for seamless look",
      priceType: "absolute",
      priceValue: 3500,
      sortOrder: 2
    }
  });

  // Addon Groups
  const group = await prisma.doorAddonGroup.upsert({
    where: { id: "group_door_hardware" },
    update: {},
    create: {
      id: "group_door_hardware",
      name: "Door Hardware",
      description: "Essential door hardware accessories",
      selectionType: "multiple",
      sortOrder: 1
    }
  });

  // Addons
  const addonsData = [
    { id: "addon_lock", groupId: group.id, name: "Premium Lock", description: "High security mortise lock", icon: "🔐", price: 2500, sortOrder: 1 },
    { id: "addon_stopper", groupId: group.id, name: "Door Stopper", description: "Wall-mounted door stopper", icon: "🛑", price: 350, sortOrder: 2 },
    { id: "addon_hinges", groupId: group.id, name: "Premium Hinges", description: "Set of 4 ball bearing hinges", icon: "🔩", price: 800, sortOrder: 3 },
    { id: "addon_handle", groupId: group.id, name: "Designer Handle", description: "Stainless steel designer handle", icon: "🚪", price: 1200, sortOrder: 4 }
  ];

  for (const a of addonsData) {
    await prisma.doorAddon.upsert({
      where: { id: a.id },
      update: {},
      create: a
    });
  }

  // Global settings
  await prisma.doorSetting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      taxPercent: 18,
      installationCharges: 1500,
      installationType: "per_unit",
      minQuantity: 1,
      maxQuantity: 50,
      whatsappNumber: "919582581238",
      floorOptions: JSON.stringify(["Ground Floor", "First Floor", "Second Floor", "Underground Floor"]),
      areaOptions: JSON.stringify(["Bathroom", "Kitchen", "Hall"])
    }
  });

  console.log("🏁 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
