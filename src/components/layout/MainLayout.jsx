import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Truck, Menu } from 'lucide-react';
import { auth } from '../../services/firebase';
import SmartNotifications from './SmartNotifications';
import BotFAB from '../ui/BotFAB';
import { onAuthStateChanged } from 'firebase/auth';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Responsive Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        isMobileOpen={isMobileMenuOpen}
        closeMobileMenu={() => setIsMobileMenuOpen(false)}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
             <button
               onClick={toggleMobileMenu}
               className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
             >
               <Menu className="h-6 w-6" />
             </button>
             <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                   <Truck className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                   <span className="text-primary">Win</span> <span className="text-gray-400">Express</span>
                </h1>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <SmartNotifications />
             
             <button 
               onClick={toggleTheme}
               className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
             >
               {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
             </button>
             
             {user && (
               <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                 <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                   <span className="text-xs font-bold text-primary uppercase">
                     {user.email?.charAt(0)}
                   </span>
                 </div>
               </div>
             )}
          </div>
        </header>

        {/* Desktop Header/Breadcrumb area */}
        <header className="hidden md:flex bg-white dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 items-center justify-between px-8 py-4 flex-shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <div className="flex flex-col items-end">
                  <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                    {user.email}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <span className="text-sm font-black uppercase">
                    {user.email?.charAt(0)}
                  </span>
                </div>
              </div>
            )}
            
            <SmartNotifications />
            
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 pb-6 relative custom-scrollbar">
          <div className="w-full min-h-full">
            <Outlet />
          </div>
        </main>

        <BotFAB />
      </div>
    </div>
  );
}
