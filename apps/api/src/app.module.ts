import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CalculatorController } from "./calculator.controller.js";
import { CalculatorService } from "./calculator.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { FirebaseService } from "./firebase.service.js";
import { CacheService } from "./cache.service.js";
import { RolesGuard } from "./roles.guard.js";
import { SubscriptionGuard } from "./subscription.guard.js";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100  // Limit each IP to 100 requests per minute
      }
    ])
  ],
  controllers: [CalculatorController, AuthController],
  providers: [
    CalculatorService,
    AuthService,
    FirebaseService,
    CacheService,
    SubscriptionGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard // Enable rate limiting globally
    },
    RolesGuard // Reflector injected Roles check
  ]
})
export class AppModule {}
