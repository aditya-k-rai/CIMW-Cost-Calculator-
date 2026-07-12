import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly firebase: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Injected by AuthGuard

    // Super Admin has unlimited override
    if (!user || user.role === "admin") {
      return true;
    }

    // Customers not linked to a builder company are not restricted by company billing
    if (user.role === "customer" && !user.companyId) {
      return true;
    }

    const companyId = user.role === "company" ? user.userId : user.companyId;
    if (!companyId) {
      return true;
    }

    const doc = await this.firebase.db.collection("companies").doc(companyId).get();
    if (doc.exists) {
      const company = doc.data();
      const sub = company.subscription || {};

      // Flag as expired if:
      // 1. Status is suspended or expired
      // 2. Expiry date has passed
      const isExpired = 
        sub.status !== "active" ||
        sub.plan === "expired" ||
        (sub.expiryDate && new Date(sub.expiryDate).getTime() < Date.now());

      if (isExpired) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: "Subscription Expired. Please contact your company administrator to renew access.",
            error: "Payment Required"
          },
          HttpStatus.PAYMENT_REQUIRED
        );
      }
    }

    return true;
  }
}
