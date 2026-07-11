import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { verifyJwt } from "./jwt.util.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-calculator-key";

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization token");
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyJwt<UserPayload>(token, JWT_SECRET);

    if (!payload) {
      throw new UnauthorizedException("Token has expired or is invalid");
    }

    request.user = payload;
    return true;
  }
}
