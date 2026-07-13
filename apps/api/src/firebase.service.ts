import { Injectable, OnModuleInit } from "@nestjs/common";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockDocSnapshot {
  constructor(public readonly id: string, private readonly _data: any) {}
  get exists() { return !!this._data; }
  data() { return this._data; }
}

class MockQuerySnapshot {
  constructor(public readonly docs: MockDocSnapshot[]) {}
}

class MockDocRef {
  constructor(
    private readonly collectionPath: string,
    public readonly id: string,
    private readonly service: any
  ) {}

  async get() {
    const data = this.service.readDoc(this.collectionPath, this.id);
    return new MockDocSnapshot(this.id, data);
  }

  async set(data: any) {
    this.service.writeDoc(this.collectionPath, this.id, data);
  }

  async update(data: any) {
    const current = this.service.readDoc(this.collectionPath, this.id) || {};
    this.service.writeDoc(this.collectionPath, this.id, { ...current, ...data });
  }

  async delete() {
    this.service.deleteDoc(this.collectionPath, this.id);
  }
}

class MockQuery {
  constructor(
    private readonly collectionPath: string,
    private readonly filters: Array<{ field: string; op: string; val: any }>,
    private readonly service: any
  ) {}

  where(field: string, op: string, val: any) {
    return new MockQuery(this.collectionPath, [...this.filters, { field, op, val }], this.service);
  }

  async get() {
    let all = this.service.readCollection(this.collectionPath);
    for (const filter of this.filters) {
      all = all.filter((item: any) => {
        if (filter.op === "==") return item[filter.field] === filter.val;
        if (filter.op === "array-contains") {
          return Array.isArray(item[filter.field]) && item[filter.field].includes(filter.val);
        }
        return true;
      });
    }
    const docs = all.map((item: any) => new MockDocSnapshot(item.id, item));
    return new MockQuerySnapshot(docs);
  }
}

class MockCollection {
  constructor(private readonly pathName: string, private readonly service: any) {}

  doc(id: string) {
    return new MockDocRef(this.pathName, id, this.service);
  }

  where(field: string, op: string, val: any) {
    return new MockQuery(this.pathName, [{ field, op, val }], this.service);
  }

  async get() {
    const all = this.service.readCollection(this.pathName);
    const docs = all.map((item: any) => new MockDocSnapshot(item.id, item));
    return new MockQuerySnapshot(docs);
  }

  async add(data: any) {
    const id = Math.random().toString(36).substring(2, 15);
    const docData = { ...data, id };
    this.service.writeDoc(this.pathName, id, docData);
    return new MockDocRef(this.pathName, id, this.service);
  }
}

class MockFirestore {
  private readonly dbDir = path.resolve(__dirname, "../prisma/local_db");

  constructor() {
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }
  }

  collection(name: string) {
    return new MockCollection(name, this);
  }

  private getFilePath(collection: string) {
    return path.join(this.dbDir, `${collection}.json`);
  }

  readCollection(collection: string): any[] {
    const file = this.getFilePath(collection);
    if (!fs.existsSync(file)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return Object.values(data);
    } catch {
      return [];
    }
  }

  readDoc(collection: string, id: string): any | null {
    const file = this.getFilePath(collection);
    if (!fs.existsSync(file)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return data[id] || null;
    } catch {
      return null;
    }
  }

  writeDoc(collection: string, id: string, data: any) {
    const file = this.getFilePath(collection);
    let current: Record<string, any> = {};
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

  deleteDoc(collection: string, id: string) {
    const file = this.getFilePath(collection);
    if (!fs.existsSync(file)) return;
    let current: Record<string, any> = {};
    try {
      current = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return;
    }
    delete current[id];
    fs.writeFileSync(file, JSON.stringify(current, null, 2), "utf8");
  }
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  public db: any;
  public app: any = null;
  private isFallback = false;

  onModuleInit() {
    let serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    let credentialJson: any = null;

    if (serviceAccountEnv) {
      try {
        credentialJson = JSON.parse(serviceAccountEnv);
      } catch (err: any) {
        console.warn("⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", err.message);
      }
    }

    if (!credentialJson) {
      // Look for physical JSON credential files in root or api subfolders
      const possiblePaths = [
        path.resolve(process.cwd(), "service-account.json"),
        path.resolve(process.cwd(), "../service-account.json"),
        path.resolve(process.cwd(), "../../service-account.json"),
        path.resolve(process.cwd(), "firebase-service-account.json"),
        path.resolve(process.cwd(), "../firebase-service-account.json"),
        path.resolve(process.cwd(), "../../firebase-service-account.json"),
        path.resolve(process.cwd(), "apps/api/service-account.json"),
        path.resolve(process.cwd(), "apps/api/firebase-service-account.json")
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          try {
            credentialJson = JSON.parse(fs.readFileSync(p, "utf8"));
            console.log(`📄 Loaded Firebase credentials file from: ${p}`);
            break;
          } catch (err: any) {
            console.warn(`⚠️ Failed to parse credentials file at ${p}:`, err.message);
          }
        }
      }
    }

    if (credentialJson) {
      try {
        const apps = getApps();
        if (apps.length === 0) {
          this.app = initializeApp({
            credential: cert(credentialJson)
          });
        } else {
          this.app = apps[0];
        }
        this.db = getFirestore(this.app);
        console.log("🔥 Firebase Admin SDK initialized successfully with service account.");
        return;
      } catch (err: any) {
        console.warn(
          "⚠️ Failed to initialize Firebase Admin with service account JSON. Falling back to local JSON database. Error:",
          err.message
        );
      }
    }

    // Fallback to local DB files
    this.isFallback = true;
    this.db = new MockFirestore();
    console.log("💾 Using Local JSON Database fallback.");
  }
}
