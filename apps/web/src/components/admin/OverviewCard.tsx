import React from 'react';

interface OverviewCardProps {
  title: string;
  value: string | number;
}

export const OverviewCard: React.FC<OverviewCardProps> = ({ title, value }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};
