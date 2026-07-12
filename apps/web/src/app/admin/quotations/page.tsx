import React from 'react';
import { QuotationTable } from '@/components/admin/QuotationTable';

const QuotationsPage = () => {
  const quotations = [
    {
      number: 'QUO-00123',
      company: 'Innovate Inc.',
      project: 'Modern Kitchen Remodel',
      customer: 'Alice Johnson',
      employee: 'John Doe',
      calculator: 'Modular Kitchen',
      amount: 25000,
      status: 'Sent',
      date: '2024-07-10',
      time: '03:45 PM',
    },
    {
      number: 'QUO-00124',
      company: 'Builders Co.',
      project: 'New Office Fit-out',
      customer: 'Bob Williams',
      employee: 'Jane Smith',
      calculator: 'Interior',
      amount: 85000,
      status: 'Accepted',
      date: '2024-06-25',
      time: '11:00 AM',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Quotation Management</h1>
      <QuotationTable quotations={quotations} />
    </div>
  );
};

export default QuotationsPage;
