import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { CalculatorService } from "./calculator.service.js";
import { AuthGuard } from "./auth.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { Roles } from "./roles.decorator.js";
import { SubscriptionGuard } from "./subscription.guard.js";

@Controller()
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Get("health")
  health() {
    return { status: "OK", timestamp: new Date() };
  }

  @Get("calculators/config")
  getConfig() {
    return this.calculatorService.getConfig();
  }

  // ===================== BRANDS =====================

  @Get("brands")
  getBrands() {
    return this.calculatorService.getBrands();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("brands")
  createBrand(@Body() body: any) {
    return this.calculatorService.createBrand(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("brands/:id")
  deleteBrand(@Param("id") id: string) {
    return this.calculatorService.deleteBrand(id);
  }

  // ===================== CATEGORIES =====================

  @Get("categories")
  getCategories() {
    return this.calculatorService.getCategories();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("categories")
  createCategory(@Body() body: any) {
    return this.calculatorService.createCategory(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("categories/:id")
  deleteCategory(@Param("id") id: string) {
    return this.calculatorService.deleteCategory(id);
  }

  // ===================== CATALOG =====================

  @Get("catalog")
  getCatalog() {
    return this.calculatorService.getCatalog();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("products")
  createProduct(@Body() body: any) {
    return this.calculatorService.createProduct(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("products/:id/update")
  updateProduct(@Param("id") id: string, @Body() body: any) {
    return this.calculatorService.updateProduct(id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("products/:id")
  deleteProduct(@Param("id") id: string) {
    return this.calculatorService.deleteProduct(id);
  }

  // ===================== WOODWORK =====================

  @Get("woodwork")
  getWoodwork() {
    return this.calculatorService.getWoodwork();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("woodwork")
  saveWoodwork(@Body() body: any) {
    return this.calculatorService.saveWoodworkItem(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("woodwork/:id/update")
  updateWoodwork(@Param("id") id: string, @Body() body: any) {
    return this.calculatorService.saveWoodworkItem({ ...body, id });
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("woodwork/:id")
  deleteWoodwork(@Param("id") id: string) {
    return this.calculatorService.deleteWoodworkItem(id);
  }

  // ===================== DOORS CONFIG =====================

  @Get("doors/all")
  getDoorsAll() {
    return this.calculatorService.getDoorsAll();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("doors/templates")
  saveDoorTemplate(@Body() body: any) {
    return this.calculatorService.saveDoorTemplate(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("doors/templates/:id")
  deleteDoorTemplate(@Param("id") id: string) {
    return this.calculatorService.deleteDoorTemplate(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("doors/variants")
  saveDoorVariant(@Body() body: any) {
    return this.calculatorService.saveDoorVariant(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("doors/variants/:id")
  deleteDoorVariant(@Param("id") id: string) {
    return this.calculatorService.deleteDoorVariant(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("doors/finishes")
  saveDoorFinish(@Body() body: any) {
    return this.calculatorService.saveDoorFinish(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("doors/finishes/:id")
  deleteDoorFinish(@Param("id") id: string) {
    return this.calculatorService.deleteDoorFinish(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("doors/addons/groups")
  saveDoorAddonGroup(@Body() body: any) {
    return this.calculatorService.saveDoorAddonGroup(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("doors/addons/groups/:id")
  deleteDoorAddonGroup(@Param("id") id: string) {
    return this.calculatorService.deleteDoorAddonGroup(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("doors/addons")
  saveDoorAddon(@Body() body: any) {
    return this.calculatorService.saveDoorAddon(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("doors/addons/:id")
  deleteDoorAddon(@Param("id") id: string) {
    return this.calculatorService.deleteDoorAddon(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("doors/settings")
  saveDoorSettings(@Body() body: any) {
    return this.calculatorService.saveDoorSettings(body);
  }

  // ===================== ESTIMATIONS =====================

  @UseGuards(AuthGuard, SubscriptionGuard)
  @Post("calculations/construction")
  calculateConstruction(@Body() body: any) {
    return this.calculatorService.calculateConstruction(body);
  }

  // ===================== QUOTES =====================

  @UseGuards(AuthGuard, SubscriptionGuard)
  @Post("quotes")
  createQuote(@Req() req: any, @Body() body: any) {
    return this.calculatorService.createQuote(body, req.user.userId);
  }

  @UseGuards(AuthGuard, SubscriptionGuard)
  @Get("quotes")
  getQuotes(@Req() req: any) {
    return this.calculatorService.getQuotes(req.user);
  }

  @UseGuards(AuthGuard, SubscriptionGuard)
  @Delete("quotes/:id")
  deleteQuote(@Req() req: any, @Param("id") id: string) {
    return this.calculatorService.deleteQuote(id, req.user);
  }
}
