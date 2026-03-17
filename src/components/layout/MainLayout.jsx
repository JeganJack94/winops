import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Sidebar for desktop */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center">
             <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                <span className="text-primary">Win</span> <span className="text-gray-400">Express</span>
             </h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Nav for mobile */}
      <BottomNav />
    </div>
  );
}
