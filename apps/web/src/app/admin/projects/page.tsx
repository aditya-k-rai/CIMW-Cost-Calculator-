import React from 'react';
import { ProjectTable } from '@/components/admin/ProjectTable';

const ProjectsPage = () => {
  const projects = [
    {
      id: 'PROJ-001',
      name: 'Modern Kitchen Remodel',
      company: 'Innovate Inc.',
      customer: 'Alice Johnson',
      assignedEmployees: ['John Doe', 'Peter Pan'],
      status: 'Ongoing',
      budget: 50000,
      createdDate: '2024-07-01',
      createdTime: '10:00 AM',
      lastUpdated: '2024-07-12',
    },
    {
      id: 'PROJ-002',
      name: 'New Office Fit-out',
      company: 'Builders Co.',
      customer: 'Bob Williams',
      assignedEmployees: ['Jane Smith'],
      status: 'Completed',
      budget: 150000,
      createdDate: '2024-05-15',
      createdTime: '02:30 PM',
      lastUpdated: '2024-06-28',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Project Management</h1>
      <ProjectTable projects={projects} />
    </div>
  );
};

export default ProjectsPage;
