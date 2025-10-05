'use client';

import DashboardClient from "../../../components/DashboardClient.jsx";

export default function DashboardPage() {
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">
        Dashboard
      </h1>
      <DashboardClient/>
    </main>
  );
}


