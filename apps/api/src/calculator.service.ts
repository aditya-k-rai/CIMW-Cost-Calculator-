import { BadRequestException, Injectable } from "@nestjs/common";
import {
  calculateConstruction,
  catalog,
  constructionConfig,
  constructionInputSchema,
  quoteSchema,
  type ConstructionInput,
  type QuoteInput
} from "@cost-calculator/shared";

@Injectable()
export class CalculatorService {
  private readonly quoteRequests: Array<QuoteInput & { id: string; createdAt: string }> = [];

  getConfig() {
    return {
      construction: constructionConfig
    };
  }

  getCatalog() {
    return catalog;
  }

  calculateConstruction(input: ConstructionInput) {
    const parsed = constructionInputSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return calculateConstruction(parsed.data);
  }

  createQuote(input: QuoteInput) {
    const parsed = quoteSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const quote = {
      ...parsed.data,
      id: `quote_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    this.quoteRequests.unshift(quote);

    return {
      ok: true,
      quote,
      message: "Quote request saved locally. Connect a database or CRM for production storage."
    };
  }
}
