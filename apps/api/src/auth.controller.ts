import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { Roles } from "./roles.decorator.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post("login")
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post("profile/update")
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.authService.updateProfile(req.user.userId, body);
  }

  @Post("firebase-sync")
  firebaseSync(@Body() body: any) {
    return this.authService.firebaseSync(body);
  }

  @UseGuards(AuthGuard)
  @Get("employees")
  getEmployees(@Req() req: any) {
    return this.authService.getEmployeesForCompany(req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post("employees/:id/permissions")
  updateEmployeePermissions(
    @Req() req: any,
    @Param("id") employeeId: string,
    @Body("permissions") permissions: any,
    @Body("position") position?: string
  ) {
    return this.authService.updateEmployeePermissions(req.user.userId, employeeId, permissions, position);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/users")
  getAllUsers() {
    return this.authService.getAllUsersForAdmin();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/users/:id/permissions")
  adminUpdateUserPermissions(
    @Param("id") userId: string,
    @Body("permissions") permissions: any
  ) {
    return this.authService.adminUpdateUserPermissions(userId, permissions);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/companies")
  getAllCompanies() {
    return this.authService.getAllCompaniesForAdmin();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/companies")
  createCompany(@Body() body: any) {
    return this.authService.createCompanyForAdmin(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/companies/:id")
  updateCompany(
    @Param("id") companyId: string,
    @Body() body: any
  ) {
    return this.authService.updateCompanyForAdmin(companyId, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("admin/companies/:id")
  deleteCompany(@Param("id") companyId: string) {
    return this.authService.deleteCompanyForAdmin(companyId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/subscription-keys")
  getAllSubscriptionKeys() {
    return this.authService.getAllSubscriptionKeysForAdmin();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/subscription-keys")
  createSubscriptionKey(@Body() body: any) {
    return this.authService.createSubscriptionKeyForAdmin(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("admin/subscription-keys/:id")
  updateSubscriptionKey(
    @Param("id") keyId: string,
    @Body() body: any
  ) {
    return this.authService.updateSubscriptionKeyForAdmin(keyId, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("admin/subscription-keys/:id")
  deleteSubscriptionKey(@Param("id") keyId: string) {
    return this.authService.deleteSubscriptionKeyForAdmin(keyId);
  }

  @UseGuards(AuthGuard)
  @Get("projects")
  getProjects(@Req() req: any) {
    return this.authService.getProjectsForUser(req.user);
  }

  @UseGuards(AuthGuard)
  @Post("projects")
  createProject(@Req() req: any, @Body() body: any) {
    return this.authService.createProject(req.user, body);
  }

  @UseGuards(AuthGuard)
  @Post("projects/:id")
  updateProject(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.authService.updateProject(req.user, id, body);
  }

  @UseGuards(AuthGuard)
  @Delete("projects/:id")
  deleteProject(@Req() req: any, @Param("id") id: string) {
    return this.authService.deleteProject(req.user, id);
  }

  @Post("recover-password")
  recoverPassword(@Body() body: any) {
    return this.authService.recoverPassword(body);
  }
}
