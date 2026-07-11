import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { signJwt } from "./jwt.util.js";
import * as crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-calculator-key";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verify;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(body: any) {
    const { email, password, name, phone, location, role } = body;

    if (!email || !password || !name || !phone) {
      throw new BadRequestException("All required fields must be supplied");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw new BadRequestException("This email is already registered");
    }

    const hashedPassword = hashPassword(password);
    const userRole = role === "admin" ? "admin" : "customer";

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        location,
        role: userRole
      }
    });

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        role: user.role
      }
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

    if (!user || !verifyPassword(password, user.password)) {
      throw new UnauthorizedException("Incorrect email or password");
    }

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        role: user.role
      }
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new BadRequestException("User profile not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      location: user.location,
      role: user.role
    };
  }

  async updateProfile(userId: string, body: any) {
    const { name, phone, location } = body;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(location !== undefined && { location })
      }
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        role: user.role
      }
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
}
