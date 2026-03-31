import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Truck, IndianRupee, FileBarChart, PieChart, Calculator, Settings, Menu, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Expenses', to: '/expenses', icon: Receipt },
  { name: 'Delivery', to: '/delivery', icon: Truck },
  { name: 'Earnings', to: '/earnings', icon: IndianRupee },
  { name: 'Reports', to: '/reports', icon: FileBarChart },
  { name: 'Analytics', to: '/analytics', icon: PieChart },
  { name: 'Calculator', to: '/calculator', icon: Calculator },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, toggleSidebar }) {
  return (
    <div className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out bg-secondary dark:bg-[#0f172a] border-r border-blue-800/10 dark:border-gray-800 shadow-xl ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-blue-900 dark:bg-gray-950 justify-between">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div 
                key="logo-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex items-center overflow-hidden"
              >
                <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
                  <span className="text-primary">Win</span> Express
                </span>
              </motion.div>
            )}
          </AnimatePresence>
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
                    `group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-800/80 dark:bg-primary/20 text-white dark:text-primary'
                        : 'text-gray-300 dark:text-gray-400 hover:bg-blue-800/40 dark:hover:bg-gray-800/50 hover:text-white dark:hover:text-white'
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
