import React from 'react';
import { EmployeeTable } from '@/components/admin/EmployeeTable';

const EmployeesPage = () => {
  const employees = [
    {
      id: 'EMP-001',
      name: 'John Doe',
      company: 'Innovate Inc.',
      role: 'Project Manager',
      email: 'john.doe@innovate.com',
      phone: '123-456-7891',
      status: 'Active',
      lastLogin: '2024-07-12',
      lastActivity: '2024-07-13',
    },
    {
      id: 'EMP-002',
      name: 'Jane Smith',
      company: 'Builders Co.',
      role: 'Lead Engineer',
      email: 'jane.smith@builders.com',
      phone: '098-765-4322',
      status: 'Active',
      lastLogin: '2024-07-11',
      lastActivity: '2024-07-12',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Employee Management</h1>
      <EmployeeTable employees={employees} />
    </div>
  );
};

export default EmployeesPage;
