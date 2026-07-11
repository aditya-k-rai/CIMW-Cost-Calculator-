import { Body, Controller, Get, Post } from "@nestjs/common";
import type { ConstructionInput, QuoteInput } from "@cost-calculator/shared";
import { CalculatorService } from "./calculator.service.js";

@Controller()
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Get("health")
  health() {
    return {
      status: "ok",
      service: "cost-calculator-api",
      time: new Date().toISOString()
    };
  }

  @Get("calculators/config")
  config() {
    return this.calculatorService.getConfig();
  }

  @Get("catalog")
  catalog() {
    return this.calculatorService.getCatalog();
  }

  @Post("calculations/construction")
  construction(@Body() body: ConstructionInput) {
    return this.calculatorService.calculateConstruction(body);
  }

  @Post("quotes")
  createQuote(@Body() body: QuoteInput) {
    return this.calculatorService.createQuote(body);
  }
}
