import React from 'react';
import { CustomerTable } from '@/components/admin/CustomerTable';

const CustomersPage = () => {
  const customers = [
    {
      id: 'CUST-001',
      name: 'Alice Johnson',
      phone: '111-222-3333',
      email: 'alice@example.com',
      company: 'Innovate Inc.',
      joinedProject: 'Modern Kitchen Remodel',
      totalQuotations: 3,
      lastActivity: '2024-07-12',
    },
    {
      id: 'CUST-002',
      name: 'Bob Williams',
      phone: '444-555-6666',
      email: 'bob@example.com',
      company: 'Builders Co.',
      joinedProject: 'New Office Fit-out',
      totalQuotations: 1,
      lastActivity: '2024-06-28',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Customer Management</h1>
      <CustomerTable customers={customers} />
    </div>
  );
};

export default CustomersPage;
