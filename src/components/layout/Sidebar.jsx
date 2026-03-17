import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Truck, FileBarChart, PieChart, Settings, Menu, ChevronLeft } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Expenses', to: '/expenses', icon: Receipt },
  { name: 'Delivery', to: '/delivery', icon: Truck },
  { name: 'Reports', to: '/reports', icon: FileBarChart },
  { name: 'Analytics', to: '/analytics', icon: PieChart },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, toggleSidebar }) {
  return (
    <div className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out bg-secondary dark:bg-gray-900 border-r border-blue-800/50 dark:border-gray-800 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-blue-900 dark:bg-gray-950 justify-between">
          {isOpen && (
            <div className="flex-1 flex items-center justify-center overflow-hidden">
               <img src="/logo.png" alt="Win Express" className="h-10 object-contain w-auto max-w-full mix-blend-multiply dark:mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
               <span style={{ display: 'none' }} className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
                  <span className="text-primary">Win</span>Ops
               </span>
            </div>
          )}
          <button 
            onClick={toggleSidebar} 
            className={`p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-blue-800/50 transition-colors ${!isOpen ? 'mx-auto' : ''}`}
          >
            {isOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto mt-4">
          <nav className="flex-1 px-3 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  title={!isOpen ? item.name : undefined}
                  className={({ isActive }) =>
                    `group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-800/80 dark:bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-blue-800/40 dark:hover:bg-gray-800/50 hover:text-white'
                    } ${!isOpen && 'justify-center px-0 py-3'}`
                  }
                >
                  <Icon className={`${isOpen ? 'mr-3' : ''} flex-shrink-0 h-5 w-5`} aria-hidden="true" />
                  {isOpen && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
