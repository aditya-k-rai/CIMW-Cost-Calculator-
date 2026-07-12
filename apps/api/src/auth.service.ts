import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";
import { signJwt } from "./jwt.util.js";
import * as crypto from "crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-calculator-key";


function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verify;
}

@Injectable()
export class AuthService {
  constructor(private readonly firebase: FirebaseService) {}

  private get db() {
    return this.firebase.db;
  }

  private mapUserResponse(user: any) {
    let parsedPerms = {};
    try {
      parsedPerms = typeof user.permissions === "string" ? JSON.parse(user.permissions) : (user.permissions || {});
    } catch {
      parsedPerms = {};
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || null,
      role: user.role,
      pincode: user.pincode || null,
      district: user.district || null,
      state: user.state || null,
      budgetRange: user.budgetRange || null,
      purpose: user.purpose || null,
      gstNumber: user.gstNumber || null,
      businessMail: user.businessMail || null,
      keyId: user.keyId || null,
      position: user.position || null,
      companyCode: user.companyCode || null,
      companyId: user.companyId || null,
      permissions: parsedPerms
    };
  }

  private async findUserByEmail(email: string): Promise<any | null> {
    const snapshot = await this.db.collection("users").where("email", "==", email).get();
    if (snapshot.docs.length === 0) return null;
    return snapshot.docs[0].data();
  }

  private async findUserById(id: string): Promise<any | null> {
    const doc = await this.db.collection("users").doc(id).get();
    return doc.exists ? doc.data() : null;
  }

  private async checkEmployeeLimitAndGetCompanyId(companyCode: string): Promise<string> {
    const snapshot = await this.db.collection("users").where("keyId", "==", companyCode).get();
    const parentCompany = snapshot.docs.map((d: any) => d.data()).find((u: any) => u.role === "company");

    if (!parentCompany) {
      throw new BadRequestException(`No active Company found with company code: ${companyCode}`);
    }

    const companyDoc = await this.db.collection("companies").doc(parentCompany.id).get();
    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      const maxEmployees = companyData.limits?.maxEmployees ?? 20;

      const employeeList = await this.db.collection("users").where("companyId", "==", parentCompany.id).get();
      const employeeCount = employeeList.docs.filter((d: any) => d.data().role === "employee").length;

      if (employeeCount >= maxEmployees) {
        throw new BadRequestException(`This company has reached its maximum employee registration limit of ${maxEmployees}.`);
      }
    }

    return parentCompany.id;
  }

  private async createCompanyRecord(userId: string, name: string, email: string, phone: string | null, gstNumber: string | null, district: string | null, state: string | null) {
    const companyRecord = {
      id: userId,
      name,
      gstNumber: gstNumber || "",
      ownerId: userId,
      email,
      phone: phone || "",
      address: "",
      city: district || "",
      state: state || "",
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
    await this.db.collection("companies").doc(userId).set(companyRecord);
  }

  private async getCompanySubscriptionStatus(user: any): Promise<string> {
    if (user.role === "admin" || user.role === "customer") return "active";
    const companyId = user.role === "company" ? user.id : user.companyId;
    if (!companyId) return "active";

    const doc = await this.db.collection("companies").doc(companyId).get();
    if (doc.exists) {
      const company = doc.data();
      const sub = company.subscription || {};
      const isExpired = 
        sub.status !== "active" ||
        sub.plan === "expired" ||
        (sub.expiryDate && new Date(sub.expiryDate).getTime() < Date.now());
      return isExpired ? "expired" : "active";
    }
    return "active";
  }

  async register(body: any) {
    const {
      email,
      password,
      name,
      phone,
      role,
      pincode,
      district,
      state,
      budgetRange,
      purpose,
      gstNumber,
      businessMail,
      keyId,
      position,
      companyCode,
      adminKey
    } = body;

    if (!email || !password || !name || !role) {
      throw new BadRequestException("Required fields: email, password, name, and role are missing");
    }

    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException("This email is already registered");
    }

    // Role-specific checks
    let companyId: string | null = null;
    let permissions = "{}";

    if (role === "admin") {
      if (adminKey !== "CIMKW" && adminKey !== "0000") {
        throw new BadRequestException("Invalid Administrator Verification Key");
      }
    } else if (role === "company") {
      if (!gstNumber || !keyId) {
        throw new BadRequestException("GST Number and Subscription Key-ID are required for Company signup");
      }
      permissions = JSON.stringify({
        kitchen: true,
        doors: true,
        wardrobe: true,
        construction: true
      });
    } else if (role === "employee") {
      if (!companyCode || !position) {
        throw new BadRequestException("Company Code and Position are required for Employee signup");
      }
      companyId = await this.checkEmployeeLimitAndGetCompanyId(companyCode);
      // Inherit company permissions initially, except construction by default
      permissions = JSON.stringify({
        kitchen: true,
        doors: true,
        wardrobe: true,
        construction: false
      });
    } else {
      // customer
      permissions = JSON.stringify({
        kitchen: true,
        doors: true,
        wardrobe: true,
        construction: true
      });
    }

    const hashedPassword = hashPassword(password);
    const userId = crypto.randomUUID();

    const userRecord = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      role,
      pincode: pincode || null,
      district: district || null,
      state: state || null,
      budgetRange: budgetRange || null,
      purpose: purpose || null,
      gstNumber: gstNumber || null,
      businessMail: businessMail || null,
      keyId: keyId || null,
      position: position || null,
      companyCode: companyCode || null,
      companyId: companyId || null,
      permissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.collection("users").doc(userId).set(userRecord);

    if (role === "company") {
      await this.createCompanyRecord(userId, name, email, phone, gstNumber, district, state);
    }

    const token = signJwt({ userId: userRecord.id, email: userRecord.email, role: userRecord.role }, JWT_SECRET);

    const mappedUser = this.mapUserResponse(userRecord);
    const subStatus = await this.getCompanySubscriptionStatus(userRecord);

    return {
      success: true,
      token,
      user: { ...mappedUser, companySubscriptionStatus: subStatus }
    };
  }

  async login(body: any) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException("Email and password are required");
    }

    const user = await this.findUserByEmail(email);
    if (!user || !user.password || !verifyPassword(password, user.password)) {
      throw new UnauthorizedException("Incorrect email or password");
    }

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);

    const mappedUser = this.mapUserResponse(user);
    const subStatus = await this.getCompanySubscriptionStatus(user);

    return {
      success: true,
      token,
      user: { ...mappedUser, companySubscriptionStatus: subStatus }
    };
  }

  async firebaseSync(body: any) {
    const { idToken, role, customFields } = body;
    if (!idToken) {
      throw new BadRequestException("Firebase ID token is required");
    }

    let decodedToken: any = null;
    try {
      if (this.firebase.app) {
        decodedToken = await getAuth(this.firebase.app).verifyIdToken(idToken);
      } else {
        // Safe JWT fallback parser
        const parts = idToken.split(".");
        if (parts.length === 3) {
          decodedToken = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        }
      }
    } catch (err: any) {
      throw new UnauthorizedException("Firebase ID token validation failed: " + err.message);
    }

    if (!decodedToken || !decodedToken.email) {
      throw new UnauthorizedException("Unable to decode email context from token");
    }

    const { email, sub: firebaseUid, name } = decodedToken;

    // Check if user exists by email first, then by firebaseUid
    let user = await this.findUserByEmail(email);
    if (!user) {
      const snapshot = await this.db.collection("users").where("firebaseUid", "==", firebaseUid).get();
      if (snapshot.docs.length > 0) {
        user = snapshot.docs[0].data();
      }
    }

    if (user) {
      // Sync Google UID if missing
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUid;
        await this.db.collection("users").doc(user.id).update({ firebaseUid });
      }

      const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
      const mappedUser = this.mapUserResponse(user);
      const subStatus = await this.getCompanySubscriptionStatus(user);

      return {
        success: true,
        registered: true,
        token,
        user: { ...mappedUser, companySubscriptionStatus: subStatus }
      };
    }

    // Google authenticated but not in database yet. If they haven't sent custom fields, return to register completion form.
    if (!role) {
      return {
        success: true,
        registered: false,
        email,
        name: name || "",
        firebaseUid
      };
    }

    // Save profile record completion details
    return this.completeFirebaseRegistration(email, firebaseUid, name || "", role, customFields);
  }

  private async completeFirebaseRegistration(
    email: string,
    firebaseUid: string,
    fallbackName: string,
    role: string,
    fields: any
  ) {
    const {
      name,
      phone,
      pincode,
      district,
      state,
      budgetRange,
      purpose,
      gstNumber,
      businessMail,
      keyId,
      position,
      companyCode,
      adminKey
    } = fields;

    const displayName = name || fallbackName;
    if (!displayName) {
      throw new BadRequestException("Name is required to complete profile creation");
    }

    let companyId: string | null = null;
    let permissions = "{}";

    if (role === "admin") {
      if (adminKey !== "CIMKW" && adminKey !== "0000") {
        throw new BadRequestException("Invalid Administrator Verification Key");
      }
    } else if (role === "company") {
      if (!gstNumber || !keyId) {
        throw new BadRequestException("GST Number and Subscription Key-ID are required for Company signup");
      }
      permissions = JSON.stringify({
        kitchen: true,
        doors: true,
        wardrobe: true,
        construction: true
      });
    } else if (role === "employee") {
      if (!companyCode || !position) {
        throw new BadRequestException("Company Code and Position are required for Employee signup");
      }
      companyId = await this.checkEmployeeLimitAndGetCompanyId(companyCode);
      permissions = JSON.stringify({
        kitchen: true,
        doors: true,
        wardrobe: true,
        construction: false
      });
    } else {
      // customer
      permissions = JSON.stringify({
        kitchen: true,
        doors: true,
        wardrobe: true,
        construction: true
      });
    }

    const userId = crypto.randomUUID();
    const userRecord = {
      id: userId,
      email,
      firebaseUid,
      name: displayName,
      phone: phone || null,
      role,
      pincode: pincode || null,
      district: district || null,
      state: state || null,
      budgetRange: budgetRange || null,
      purpose: purpose || null,
      gstNumber: gstNumber || null,
      businessMail: businessMail || null,
      keyId: keyId || null,
      position: position || null,
      companyCode: companyCode || null,
      companyId: companyId || null,
      permissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.collection("users").doc(userId).set(userRecord);

    if (role === "company") {
      await this.createCompanyRecord(userId, displayName, email, phone, gstNumber, district, state);
    }

    const token = signJwt({ userId: userRecord.id, email: userRecord.email, role: userRecord.role }, JWT_SECRET);

    const mappedUser = this.mapUserResponse(userRecord);
    const subStatus = await this.getCompanySubscriptionStatus(userRecord);

    return {
      success: true,
      registered: true,
      token,
      user: { ...mappedUser, companySubscriptionStatus: subStatus }
    };
  }

  async getProfile(userId: string) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException("User profile not found");
    }
    const mappedUser = this.mapUserResponse(user);
    const subStatus = await this.getCompanySubscriptionStatus(user);
    return { ...mappedUser, companySubscriptionStatus: subStatus };
  }

  async updateProfile(userId: string, body: any) {
    const {
      name,
      phone,
      pincode,
      district,
      state,
      budgetRange,
      purpose,
      gstNumber,
      businessMail,
      keyId,
      position
    } = body;

    const docRef = this.db.collection("users").doc(userId);
    const current = (await docRef.get()).data();
    if (!current) {
      throw new BadRequestException("User profile not found");
    }

    const updated = {
      ...current,
      ...(name && { name }),
      ...(phone && { phone }),
      ...(pincode && { pincode }),
      ...(district && { district }),
      ...(state && { state }),
      ...(budgetRange && { budgetRange }),
      ...(purpose && { purpose }),
      ...(gstNumber && { gstNumber }),
      ...(businessMail && { businessMail }),
      ...(keyId && { keyId }),
      ...(position && { position }),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updated);

    const mappedUser = this.mapUserResponse(updated);
    const subStatus = await this.getCompanySubscriptionStatus(updated);

    return {
      success: true,
      user: { ...mappedUser, companySubscriptionStatus: subStatus }
    };
  }

  async recoverPassword(body: any) {
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      throw new BadRequestException("Email and new password are required");
    }

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const hashedPassword = hashPassword(newPassword);
    await this.db.collection("users").doc(user.id).update({
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: "Password updated successfully"
    };
  }

  async getEmployeesForCompany(companyId: string) {
    const snapshot = await this.db.collection("users").where("companyId", "==", companyId).get();
    const employees = snapshot.docs.map((d: any) => d.data());
    return employees.map((emp: any) => this.mapUserResponse(emp));
  }

  async updateEmployeePermissions(companyId: string, employeeId: string, permissions: any) {
    const employee = await this.findUserById(employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new BadRequestException("Employee not found in your company");
    }

    const updatedPermissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions);

    await this.db.collection("users").doc(employeeId).update({
      permissions: updatedPermissions,
      updatedAt: new Date().toISOString()
    });

    employee.permissions = updatedPermissions;

    return {
      success: true,
      user: this.mapUserResponse(employee)
    };
  }

  async getAllUsersForAdmin() {
    const snapshot = await this.db.collection("users").get();
    const users = snapshot.docs.map((d: any) => d.data());
    return users.map((user: any) => this.mapUserResponse(user));
  }

  async adminUpdateUserPermissions(userId: string, permissions: any) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const updatedPermissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions);

    await this.db.collection("users").doc(userId).update({
      permissions: updatedPermissions,
      updatedAt: new Date().toISOString()
    });

    user.permissions = updatedPermissions;

    return {
      success: true,
      user: this.mapUserResponse(user)
    };
  }

  async getAllCompaniesForAdmin() {
    const snapshot = await this.db.collection("companies").get();
    return snapshot.docs.map((d: any) => d.data());
  }

  async createCompanyForAdmin(body: any) {
    const { name, email, phone, gstNumber, district, state, limits, calculatorsEnabled, plan, expiryDate } = body;

    if (!name || !email) {
      throw new BadRequestException("Company Name and Email are required");
    }

    const companyId = crypto.randomUUID();
    const companyRecord = {
      id: companyId,
      name,
      gstNumber: gstNumber || "",
      ownerId: "",
      email,
      phone: phone || "",
      address: "",
      city: district || "",
      state: state || "",
      country: "India",
      logoUrl: "",
      subscription: {
        plan: plan || "trial",
        expiryDate: expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active"
      },
      limits: {
        maxEmployees: limits?.maxEmployees ?? 20,
        maxStorage: limits?.maxStorage ?? 5000,
        maxProjects: limits?.maxProjects ?? 100,
        maxQuotes: limits?.maxQuotes ?? 500,
        maxCustomers: limits?.maxCustomers ?? 200,
        maxProducts: limits?.maxProducts ?? 1000
      },
      calculatorsEnabled: {
        kitchen: calculatorsEnabled?.kitchen !== false,
        doors: calculatorsEnabled?.doors !== false,
        wardrobe: calculatorsEnabled?.wardrobe !== false,
        construction: calculatorsEnabled?.construction !== false,
        painting: calculatorsEnabled?.painting !== false,
        electrical: calculatorsEnabled?.electrical !== false,
        plumbing: calculatorsEnabled?.plumbing !== false,
        tiles: calculatorsEnabled?.tiles !== false,
        furniture: calculatorsEnabled?.furniture !== false,
        custom: calculatorsEnabled?.custom !== false
      },
      storageUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.collection("companies").doc(companyId).set(companyRecord);
    return { success: true, company: companyRecord };
  }

  async updateCompanyForAdmin(companyId: string, body: any) {
    const docRef = this.db.collection("companies").doc(companyId);
    const current = (await docRef.get()).data();
    if (!current) {
      throw new BadRequestException("Company not found");
    }

    const updated = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updated);
    return { success: true, company: updated };
  }

  async deleteCompanyForAdmin(companyId: string) {
    await this.db.collection("companies").doc(companyId).delete();
    return { success: true };
  }
}
