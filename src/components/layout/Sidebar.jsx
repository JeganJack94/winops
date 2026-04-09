import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, Truck, IndianRupee, 
  FileBarChart, PieChart, Calculator, Settings, 
  Menu, ChevronLeft, X, ShieldCheck, Users, ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const productionNav = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Expenses', to: '/expenses', icon: Receipt },
  { name: 'Delivery', to: '/delivery', icon: Truck },
  { name: 'Calculator', to: '/calculator', icon: Calculator },
  { name: 'Reports', to: '/reports', icon: FileBarChart },
  { name: 'Analytics', to: '/analytics', icon: PieChart },
  { name: 'CheckList', to: '/checklist', icon: ClipboardCheck },
];

const managementNav = [
  { name: 'Management', to: '/management', icon: ShieldCheck },
  { name: 'Earnings', to: '/earnings', icon: IndianRupee },
  { name: 'Profiles', to: '/profiles', icon: Users },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, toggleSidebar, isMobileOpen, closeMobileMenu }) {
  const sidebarContent = (
    <div className={`flex flex-col h-full transition-all duration-300 ease-in-out bg-secondary dark:bg-[#0f172a] border-r border-blue-800/10 dark:border-gray-800 shadow-xl ${isOpen ? 'w-64' : 'w-20'}`}>
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
          
          {/* Close button for mobile, toggle for desktop */}
          <button 
            onClick={isMobileOpen ? closeMobileMenu : toggleSidebar} 
            className={`p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-blue-800/50 transition-colors ${!isOpen ? 'mx-auto' : ''}`}
          >
            {isMobileOpen ? (
              <X className="h-6 w-6" />
            ) : isOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto mt-4">
          <nav className="flex-1 px-3 space-y-1">
            {productionNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={closeMobileMenu}
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

            {/* Separator */}
            <div className="my-4 px-3">
              <div className="h-px bg-white/10 dark:bg-gray-800 w-full" />
              {isOpen && (
                <p className="mt-2 text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
                  Management
                </p>
              )}
            </div>

            {managementNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={closeMobileMenu}
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

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden"
            />
            
            {/* Sidebar drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 z-[9999] md:hidden shadow-2xl"
            >
              {/* Force isOpen true for mobile drawer to see names */}
              {React.cloneElement(sidebarContent, { 
                className: sidebarContent.props.className.replace('w-20', 'w-64').replace('w-64', 'w-64') 
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
