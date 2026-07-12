import React from 'react';
import { CompanyTable } from '@/components/admin/CompanyTable';

const CompaniesPage = () => {
  const companies = [
    {
      name: 'Innovate Inc.',
      id: 'COMP-001',
      owner: 'John Doe',
      email: 'contact@innovate.com',
      phone: '123-456-7890',
      address: '123 Tech Street, Silicon Valley, CA',
      status: 'Active',
      subscriptionStatus: 'Active',
      subscriptionExpiry: '2025-12-31',
      employees: 25,
      customers: 150,
      projects: 42,
      quotations: 200,
      lastLogin: '2024-07-12',
      lastActivity: '2024-07-13',
    },
    {
      name: 'Builders Co.',
      id: 'COMP-002',
      owner: 'Jane Smith',
      email: 'support@builders.com',
      phone: '098-765-4321',
      address: '456 Builder Ave, New York, NY',
      status: 'Inactive',
      subscriptionStatus: 'Expired',
      subscriptionExpiry: '2024-06-30',
      employees: 10,
      customers: 50,
      projects: 15,
      quotations: 80,
      lastLogin: '2024-06-20',
      lastActivity: '2024-06-21',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Company Management</h1>
      <CompanyTable companies={companies} />
    </div>
  );
};

export default CompaniesPage;
