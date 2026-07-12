import React from 'react';
import Link from 'next/link';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <nav className="mt-5">
          <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
            Overview
          </Link>
          <Link href="/admin/companies" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
            Companies
          </Link>
          <Link href="/admin/projects" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
            Projects
          </Link>
          <Link href="/admin/quotations" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
            Quotations
          </Link>
          <Link href="/admin/customers" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
            Customers
          </Link>
          <Link href="/admin/employees" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
            Employees
          </Link>
        </nav>
      </div>
      <div className="flex-1 p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
