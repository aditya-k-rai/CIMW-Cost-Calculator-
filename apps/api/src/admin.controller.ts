import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('Admin')
export class AdminController {
  @Get('overview')
  getOverview() {
    return {
      totalCompanies: 0,
      totalEmployees: 0,
      totalCustomers: 0,
      totalProjects: 0,
      totalQuotations: 0,
      lastQuotation: null,
      lastProject: null,
      recentlyActiveCompanies: [],
    };
  }
}
