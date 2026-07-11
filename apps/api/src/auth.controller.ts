import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
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
    @Body("permissions") permissions: any
  ) {
    return this.authService.updateEmployeePermissions(req.user.userId, employeeId, permissions);
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

  @Post("recover-password")
  recoverPassword(@Body() body: any) {
    return this.authService.recoverPassword(body);
  }
}
