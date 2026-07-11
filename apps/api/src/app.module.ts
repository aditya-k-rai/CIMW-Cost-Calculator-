import { Module } from "@nestjs/common";
import { CalculatorController } from "./calculator.controller.js";
import { CalculatorService } from "./calculator.service.js";

@Module({
  controllers: [CalculatorController],
  providers: [CalculatorService]
})
export class AppModule {}
