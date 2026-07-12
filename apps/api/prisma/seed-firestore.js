import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for local mock DB writes
class LocalDbWriter {
  constructor() {
    this.dbDir = path.resolve(__dirname, "../prisma/local_db");
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }
  }

  writeDoc(collection, id, data) {
    const file = path.join(this.dbDir, `${collection}.json`);
    let current = {};
    if (fs.existsSync(file)) {
      try {
        current = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        current = {};
      }
    }
    current[id] = { ...data, id };
    fs.writeFileSync(file, JSON.stringify(current, null, 2), "utf8");
  }
}

// Database client resolver
let db = null;
let localWriter = null;

let serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let credentialJson = null;

if (serviceAccountEnv) {
  try {
    credentialJson = JSON.parse(serviceAccountEnv);
  } catch (err) {
    console.warn("⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", err.message);
  }
}

if (!credentialJson) {
  const possiblePaths = [
    path.resolve(__dirname, "../firebase-service-account.json"),
    path.resolve(__dirname, "../../firebase-service-account.json"),
    path.resolve(__dirname, "../service-account.json"),
    path.resolve(__dirname, "../../service-account.json"),
    path.resolve(process.cwd(), "firebase-service-account.json"),
    path.resolve(process.cwd(), "service-account.json")
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        credentialJson = JSON.parse(fs.readFileSync(p, "utf8"));
        console.log(`📄 Seeder loaded Firebase credentials from: ${p}`);
        break;
      } catch (err) {
        console.warn(`⚠️ Failed to parse credentials at ${p}:`, err.message);
      }
    }
  }
}

if (credentialJson) {
  try {
    const apps = getApps();
    let app;
    if (apps.length === 0) {
      app = initializeApp({
        credential: cert(credentialJson)
      });
    } else {
      app = apps[0];
    }
    db = getFirestore(app);
    console.log("🔥 Connected to Firebase Firestore for seeding...");
  } catch (err) {
    console.warn("⚠️ Failed to connect to Firebase Firestore. Seeding locally instead. Error:", err.message);
  }
}

if (!db) {
  localWriter = new LocalDbWriter();
  console.log("💾 Seeding local JSON database file structures...");
}

async function writeRecord(collection, id, data) {
  if (db) {
    await db.collection(collection).doc(id).set(data);
  } else {
    localWriter.writeDoc(collection, id, data);
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Start seeding Firestore data...");

  // 1. Users
  console.log("👤 Seeding mock user accounts...");
  const adminPassword = hashPassword("admin123");
  const customerPassword = hashPassword("customer123");
  const companyPassword = hashPassword("company123");
  const employeePassword = hashPassword("employee123");

  const adminUser = {
    id: "admin-user-id",
    email: "admin@demo.com",
    password: adminPassword,
    name: "Admin User",
    phone: "9123456789",
    role: "admin",
    pincode: "110001",
    district: "New Delhi",
    state: "Delhi",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeRecord("users", adminUser.id, adminUser);

  const customerUser = {
    id: "customer-user-id",
    email: "customer@demo.com",
    password: customerPassword,
    name: "John Doe",
    phone: "9876543210",
    role: "customer",
    pincode: "110001",
    district: "New Delhi",
    state: "Delhi",
    budgetRange: "5L - 10L",
    purpose: "Self Use",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeRecord("users", customerUser.id, customerUser);

  const companyUser = {
    id: "company-user-id",
    email: "company@demo.com",
    password: companyPassword,
    name: "CIMW Build Corp",
    phone: "9555123456",
    role: "company",
    pincode: "110001",
    district: "New Delhi",
    state: "Delhi",
    gstNumber: "07AAAAA1111A1Z1",
    businessMail: "billing@cimwbuild.com",
    keyId: "0000",
    permissions: JSON.stringify({
      kitchen: true,
      doors: true,
      wardrobe: true,
      construction: true
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeRecord("users", companyUser.id, companyUser);

  const mockCompany = {
    id: "company-user-id",
    name: "CIMW Build Corp",
    gstNumber: "07AAAAA1111A1Z1",
    ownerId: "company-user-id",
    email: "company@demo.com",
    phone: "9555123456",
    address: "123 Business Boulevard",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    logoUrl: "",
    subscription: {
      plan: "trial",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active"
    },
    limits: {
      maxEmployees: 20,
      maxStorage: 5000,
      maxProjects: 100,
      maxQuotes: 500,
      maxCustomers: 200,
      maxProducts: 1000
    },
    calculatorsEnabled: {
      kitchen: true,
      doors: true,
      wardrobe: true,
      construction: true,
      painting: true,
      electrical: true,
      plumbing: true,
      tiles: true,
      furniture: true,
      custom: true
    },
    storageUsed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeRecord("companies", mockCompany.id, mockCompany);

  const employeeUser = {
    id: "employee-user-id",
    email: "employee@demo.com",
    password: employeePassword,
    name: "Jane Designer",
    phone: "9666123456",
    role: "employee",
    pincode: "110001",
    district: "New Delhi",
    state: "Delhi",
    position: "Designer",
    companyCode: "0000",
    companyId: companyUser.id,
    permissions: JSON.stringify({
      kitchen: true,
      doors: true,
      wardrobe: true,
      construction: false
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeRecord("users", employeeUser.id, employeeUser);

  // 2. Brands
  console.log("🏷️ Seeding brands...");
  const brandsData = [
    { id: "brand-hafele", name: "Hafele", logoUrl: "" },
    { id: "brand-hettich", name: "Hettich", logoUrl: "" },
    { id: "brand-blum", name: "Blum", logoUrl: "" },
    { id: "brand-sleek", name: "Sleek", logoUrl: "" }
  ];
  for (const b of brandsData) {
    await writeRecord("brands", b.id, b);
  }

  // 3. Categories
  console.log("🗂️ Seeding categories...");
  const categoriesData = [
    { id: "cat-woodwork", name: "Woodwork", description: "Bespoke woodwork parts", subcategories: ["Cabinets", "Shutters", "Shelves"] },
    { id: "cat-accessories", name: "Accessories", description: "Kitchen and wardrobe pull-outs", subcategories: ["Drawers", "Organizers", "Trays"] },
    { id: "cat-doors", name: "Doors", description: "Custom entrance & room doors", subcategories: ["Flush Doors", "Panel Doors"] },
    { id: "cat-living", name: "Living", description: "Media units and panels", subcategories: ["TV Units", "Bookshelves"] },
    { id: "cat-wall-treatment", name: "Wall Treatment", description: "Feature panels and coatings", subcategories: ["Panels", "Wallpaper"] },
    { id: "cat-wardrobe", name: "Wardrobe", description: "Complete wardrobe structures", subcategories: ["Hinged", "Sliding"] }
  ];
  for (const c of categoriesData) {
    await writeRecord("categories", c.id, c);
  }

  // 4. Products
  console.log("📦 Seeding catalog products...");
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
      variants: [
        { name: "Laminate", rate: 7800 },
        { name: "Acrylic", rate: 10800 },
        { name: "PU Finish", rate: 13200 }
      ]
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
      variants: []
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
      variants: []
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
      variants: [
        { name: "Wooden Ply", rate: 14500 },
        { name: "HDHMR", rate: 18200 }
      ]
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
      variants: []
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
      variants: []
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
      variants: []
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
      variants: [
        { name: "Laminate", rate: 1450 },
        { name: "Membrane", rate: 1650 },
        { name: "Acrylic", rate: 2200 }
      ]
    }
  ];
  for (const p of productsData) {
    await writeRecord("products", p.id, p);
  }

  // 5. Woodwork Config
  console.log("🪵 Seeding woodwork config...");
  const woodworkItemsData = [
    {
      id: "woodwork_base_cabinets",
      name: "Base Cabinets (Material)",
      description: "Select core structure material for kitchen base units.",
      options: [
        { id: "opt_base_bwr", name: "BWR Plywood", description: "Boiling Water Resistant ply", price: 1400 },
        { id: "opt_base_bwp", name: "BWP Plywood", description: "Boiling Water Proof ply", price: 1600 },
        { id: "opt_base_hdhmr", name: "HDHMR Board", description: "High Density moisture resistant", price: 1100 }
      ],
      sortOrder: 1
    },
    {
      id: "woodwork_shutters",
      name: "Shutters (Finish)",
      description: "Select finish type for modular shutter doors.",
      options: [
        { id: "opt_shutter_laminate", name: "Laminate Finish", description: "Matte/Glossy durable laminate", price: 1200 },
        { id: "opt_shutter_acrylic", name: "Acrylic Finish", description: "Ultra high gloss reflective", price: 1800 },
        { id: "opt_shutter_pu", name: "PU paint", description: "Seamless premium paint finish", price: 2400 }
      ],
      sortOrder: 2
    }
  ];
  for (const w of woodworkItemsData) {
    await writeRecord("woodwork_items", w.id, w);
  }

  // 6. Doors Seeding
  console.log("🚪 Seeding doors configurations...");
  const doorTemplateData = {
    id: "door_panel",
    name: "Panel Door",
    description: "Classic panel door with various material options",
    icon: "🚪",
    sortOrder: 1
  };
  await writeRecord("door_templates", doorTemplateData.id, doorTemplateData);

  const v1 = {
    id: "variant_wooden_ply",
    templateId: "door_panel",
    name: "Wooden Ply",
    description: "Premium wooden plywood material",
    basePrice: 8500,
    sku: "WP-001",
    sortOrder: 1,
    isActive: true
  };
  await writeRecord("door_variants", v1.id, v1);

  const v2 = {
    id: "variant_hdhmr",
    templateId: "door_panel",
    name: "HDHMR",
    description: "High Density High Moisture Resistance board",
    basePrice: 12000,
    sku: "HDHMR-001",
    sortOrder: 2,
    isActive: true
  };
  await writeRecord("door_variants", v2.id, v2);

  const f1 = {
    id: "finish_laminated",
    variantId: "variant_wooden_ply",
    name: "Laminated",
    description: "Durable laminated finish with scratch resistance",
    priceType: "absolute",
    priceValue: 1500,
    sortOrder: 1,
    isActive: true
  };
  await writeRecord("door_finishes", f1.id, f1);

  const f2 = {
    id: "finish_glossy",
    variantId: "variant_wooden_ply",
    name: "Glossy",
    description: "High gloss finish for premium look",
    priceType: "absolute",
    priceValue: 2500,
    sortOrder: 2,
    isActive: true
  };
  await writeRecord("door_finishes", f2.id, f2);

  const f3 = {
    id: "finish_hdhmr_laminated",
    variantId: "variant_hdhmr",
    name: "Laminated",
    description: "Premium laminated finish on HDHMR",
    priceType: "absolute",
    priceValue: 2000,
    sortOrder: 1,
    isActive: true
  };
  await writeRecord("door_finishes", f3.id, f3);

  const f4 = {
    id: "finish_hdhmr_membrane",
    variantId: "variant_hdhmr",
    name: "Membrane",
    description: "PVC membrane finish for seamless look",
    priceType: "absolute",
    priceValue: 3500,
    sortOrder: 2,
    isActive: true
  };
  await writeRecord("door_finishes", f4.id, f4);

  // Addon Groups
  const group = {
    id: "group_door_hardware",
    name: "Door Hardware",
    description: "Essential door hardware accessories",
    selectionType: "multiple",
    sortOrder: 1,
    appliesToTemplates: ["door_panel"]
  };
  await writeRecord("door_addon_groups", group.id, group);

  const addonsData = [
    { id: "addon_lock", groupId: "group_door_hardware", name: "Premium Lock", description: "High security mortise lock", icon: "🔐", price: 2500, sortOrder: 1, isActive: true },
    { id: "addon_stopper", groupId: "group_door_hardware", name: "Door Stopper", description: "Wall-mounted door stopper", icon: "🛑", price: 350, sortOrder: 2, isActive: true },
    { id: "addon_hinges", groupId: "group_door_hardware", name: "Premium Hinges", description: "Set of 4 ball bearing hinges", icon: "🔩", price: 800, sortOrder: 3, isActive: true },
    { id: "addon_handle", groupId: "group_door_hardware", name: "Designer Handle", description: "Stainless steel designer handle", icon: "🚪", price: 1200, sortOrder: 4, isActive: true }
  ];
  for (const a of addonsData) {
    await writeRecord("door_addons", a.id, a);
  }

  // Settings
  const settings = {
    id: "global",
    taxPercent: 18,
    installationCharges: 1500,
    installationType: "per_unit",
    minQuantity: 1,
    maxQuantity: 50,
    whatsappNumber: "919582581238",
    floorOptions: ["Ground Floor", "First Floor", "Second Floor", "Underground Floor"],
    areaOptions: ["Bathroom", "Kitchen", "Hall"]
  };
  await writeRecord("door_settings", "global", settings);

  console.log("🏁 Seeding complete!");
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e.message);
  process.exit(1);
});
