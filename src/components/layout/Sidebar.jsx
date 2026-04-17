import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, Truck, IndianRupee, 
  FileBarChart, PieChart, Calculator, Settings, 
  Menu, ChevronLeft, X, ShieldCheck, Users, 
  ClipboardCheck, MapPin, LogOut, ChevronDown, 
  Layers, PackageSearch, UserCog, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const productionNav = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Delivery', to: '/delivery', icon: Truck },
  { name: 'Expenses', to: '/expenses', icon: Receipt },
  { name: 'CheckList', to: '/checklist', icon: ClipboardCheck },
];

const serviceNav = [
  { name: 'Customers', to: '/customers', icon: Users },
  { name: 'Maps', to: '/maps', icon: Globe },
  { name: 'Calculator', to: '/calculator', icon: Calculator },
  { name: 'Reports', to: '/reports', icon: FileBarChart },
  { name: 'Analytics', to: '/analytics', icon: PieChart },
];

const managementNav = [
  { name: 'Management', to: '/management', icon: ShieldCheck },
  { name: 'Earnings', to: '/earnings', icon: IndianRupee },
  { name: 'Profiles', to: '/profiles', icon: UserCog },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, toggleSidebar, isMobileOpen, closeMobileMenu }) {
  const { logout } = useAuth();
  const [expanded, setExpanded] = useState({
    service: true,
    management: false
  });

  const toggleGroup = (group) => {
    if (!isOpen) {
      toggleSidebar();
      setExpanded(prev => ({ ...prev, [group]: true }));
      return;
    }
    setExpanded(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    return (
      <NavLink
        to={item.to}
        onClick={closeMobileMenu}
        title={!isOpen ? item.name : undefined}
        className={({ isActive }) =>
          `group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
            isActive
              ? 'bg-blue-800/80 dark:bg-primary/20 text-white dark:text-primary shadow-lg shadow-blue-900/20'
              : 'text-gray-300 dark:text-gray-400 hover:bg-blue-800/40 dark:hover:bg-gray-800/50 hover:text-white dark:hover:text-white'
          } ${!isOpen && 'justify-center px-0'}`
        }
      >
        <Icon className={`${isOpen ? 'mr-3' : ''} flex-shrink-0 h-5 w-5 transition-transform group-hover:scale-110`} aria-hidden="true" />
        {isOpen && <span className="truncate">{item.name}</span>}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full transition-all duration-300 ease-in-out bg-secondary dark:bg-[#0f172a] border-r border-blue-800/10 dark:border-gray-800 shadow-xl ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-blue-900 dark:bg-gray-950/50 justify-between">
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
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-2 shadow-lg shadow-primary/20">
                  <Layers className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-black tracking-tighter text-white whitespace-nowrap">
                  WIN<span className="text-primary-light">OPS</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button 
            onClick={isMobileOpen ? closeMobileMenu : toggleSidebar} 
            className={`p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-blue-800/50 transition-all ${!isOpen ? 'mx-auto' : ''}`}
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
        
        <div className="flex-1 flex flex-col overflow-y-auto mt-4 px-3 space-y-4 no-scrollbar">
          {/* PRODUCTION - FIXED */}
          <div>
            {isOpen && (
              <div className="px-3 mb-2 text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                Production
              </div>
            )}
            <div className="space-y-1">
              {productionNav.map(item => <NavItem key={item.name} item={item} />)}
            </div>
          </div>

          {/* SERVICE - MINIMIZABLE */}
          <div>
            {isOpen ? (
              <button 
                onClick={() => toggleGroup('service')}
                className="w-full px-3 mb-2 flex items-center justify-between text-[10px] font-black uppercase text-gray-500 tracking-widest hover:text-gray-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full" />
                  Service
                </span>
                <ChevronDown size={12} className={`transition-transform duration-300 ${expanded.service ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="h-px bg-white/5 mx-2 my-4" />
            )}
            
            <AnimatePresence initial={false}>
              {(expanded.service || !isOpen) && (
                <motion.div
                  initial={isOpen ? { height: 0, opacity: 0 } : false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {serviceNav.map(item => <NavItem key={item.name} item={item} />)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MANAGEMENT - MINIMIZABLE */}
          <div>
            {isOpen ? (
              <button 
                onClick={() => toggleGroup('management')}
                className="w-full px-3 mb-2 flex items-center justify-between text-[10px] font-black uppercase text-gray-500 tracking-widest hover:text-gray-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-500 rounded-full" />
                  Management
                </span>
                <ChevronDown size={12} className={`transition-transform duration-300 ${expanded.management ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="h-px bg-white/5 mx-2 my-4" />
            )}
            
            <AnimatePresence initial={false}>
              {(expanded.management || !isOpen) && (
                <motion.div
                  initial={isOpen ? { height: 0, opacity: 0 } : false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {managementNav.map(item => <NavItem key={item.name} item={item} />)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* LOGOUT */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to logout?')) {
                logout();
              }
            }}
            title={!isOpen ? 'Logout' : undefined}
            className={`w-full group flex items-center px-3 py-3 text-sm font-black rounded-xl transition-all duration-200 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 ${!isOpen && 'justify-center'}`}
          >
            <LogOut className={`${isOpen ? 'mr-3' : ''} h-5 w-5`} />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block h-screen sticky top-0">
        {sidebarContent}
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden"
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 z-[9999] md:hidden shadow-2xl"
            >
              <div className="w-64 h-full">
                {React.cloneElement(sidebarContent, { 
                  isOpen: true,
                  className: "w-64"
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
