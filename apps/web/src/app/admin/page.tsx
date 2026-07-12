import React from 'react';
import { OverviewCard } from '@/components/admin/OverviewCard';

const AdminPage = () => {
  const overviewData = {
    totalCompanies: 12,
    totalEmployees: 145,
    totalCustomers: 543,
    totalProjects: 234,
    totalQuotations: 1232,
    lastQuotationGenerated: '2024-07-12',
    lastProjectCreated: '2024-07-11',
    recentlyActiveCompanies: 5,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <OverviewCard title="Total Companies" value={overviewData.totalCompanies} />
        <OverviewCard title="Total Employees" value={overviewData.totalEmployees} />
        <OverviewCard title="Total Customers" value={overviewData.totalCustomers} />
        <OverviewCard title="Total Projects" value={overviewData.totalProjects} />
        <OverviewCard title="Total Quotations" value={overviewData.totalQuotations} />
        <OverviewCard title="Last Quotation Generated" value={overviewData.lastQuotationGenerated} />
        <OverviewCard title="Last Project Created" value={overviewData.lastProjectCreated} />
        <OverviewCard title="Recently Active Companies" value={overviewData.recentlyActiveCompanies} />
      </div>
    </div>
  );
};

export default AdminPage;
