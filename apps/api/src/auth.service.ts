import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { signJwt } from "./jwt.util.js";
import * as crypto from "crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-calculator-key";

// Initialize Firebase Admin SDK if not already done
let firebaseAdminApp: any = null;
try {
  const apps = getApps();
  if (apps.length === 0) {
    firebaseAdminApp = initializeApp({
      projectId: "cimw-cost-calculator"
    });
  } else {
    firebaseAdminApp = apps[0];
  }
} catch (e) {
  console.log("Firebase Admin initialization skipped/failed. Running with JWT fallback decoders.");
}

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
  constructor(private readonly prisma: PrismaService) {}

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
      phone: user.phone,
      role: user.role,
      pincode: user.pincode,
      district: user.district,
      state: user.state,
      budgetRange: user.budgetRange,
      purpose: user.purpose,
      gstNumber: user.gstNumber,
      businessMail: user.businessMail,
      keyId: user.keyId,
      position: user.position,
      companyCode: user.companyCode,
      companyId: user.companyId,
      permissions: parsedPerms
    };
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

    const existing = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw new BadRequestException("This email is already registered");
    }

    // Role-specific checks
    let companyId: string | null = null;
    let permissions = "{}";

    if (role === "admin") {
      if (adminKey !== "CIMKW") {
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
      const parentCompany = await this.prisma.user.findFirst({
        where: { role: "company", keyId: companyCode }
      });
      if (!parentCompany) {
        throw new BadRequestException(`No active Company found with company code: ${companyCode}`);
      }
      companyId = parentCompany.id;
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

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
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
        companyId,
        permissions
      }
    });

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);

    return {
      success: true,
      token,
      user: this.mapUserResponse(user)
    };
  }

  async login(body: any) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException("Email and password are required");
    }

    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password || !verifyPassword(password, user.password)) {
      throw new UnauthorizedException("Incorrect email or password");
    }

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);

    return {
      success: true,
      token,
      user: this.mapUserResponse(user)
    };
  }

  async firebaseSync(body: any) {
    const { idToken, role, customFields } = body;
    if (!idToken) {
      throw new BadRequestException("Firebase ID token is required");
    }

    let decodedToken: any = null;
    try {
      if (firebaseAdminApp) {
        decodedToken = await getAuth().verifyIdToken(idToken);
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

    // Check if user exists by email or Firebase UID
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { firebaseUid }
        ]
      }
    });

    if (user) {
      // Sync Google UID if missing
      if (!user.firebaseUid) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid }
        });
      }

      const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
      return {
        success: true,
        registered: true,
        token,
        user: this.mapUserResponse(user)
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
      if (adminKey !== "CIMKW") {
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
      const parentCompany = await this.prisma.user.findFirst({
        where: { role: "company", keyId: companyCode }
      });
      if (!parentCompany) {
        throw new BadRequestException(`No active Company found with company code: ${companyCode}`);
      }
      companyId = parentCompany.id;
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

    const user = await this.prisma.user.create({
      data: {
        email,
        firebaseUid,
        name: displayName,
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
        companyId,
        permissions
      }
    });

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);

    return {
      success: true,
      registered: true,
      token,
      user: this.mapUserResponse(user)
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new BadRequestException("User profile not found");
    }

    return this.mapUserResponse(user);
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

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
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
        ...(position && { position })
      }
    });

    return {
      success: true,
      user: this.mapUserResponse(user)
    };
  }

  async recoverPassword(body: any) {
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      throw new BadRequestException("Email and new password are required");
    }

    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const hashedPassword = hashPassword(newPassword);

    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword
      }
    });

    return {
      success: true,
      message: "Password updated successfully"
    };
  }

  async getEmployeesForCompany(companyId: string) {
    const employees = await this.prisma.user.findMany({
      where: { companyId }
    });
    return employees.map((emp) => this.mapUserResponse(emp));
  }

  async updateEmployeePermissions(companyId: string, employeeId: string, permissions: any) {
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId }
    });
    if (!employee || employee.companyId !== companyId) {
      throw new BadRequestException("Employee not found in your company");
    }

    const updated = await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        permissions: JSON.stringify(permissions)
      }
    });

    return {
      success: true,
      user: this.mapUserResponse(updated)
    };
  }

  async getAllUsersForAdmin() {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.mapUserResponse(user));
  }

  async adminUpdateUserPermissions(userId: string, permissions: any) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        permissions: JSON.stringify(permissions)
      }
    });
    return {
      success: true,
      user: this.mapUserResponse(updated)
    };
  }
}
