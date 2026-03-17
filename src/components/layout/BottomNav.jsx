import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Truck, FileBarChart, PieChart, Settings } from 'lucide-react';

const navigation = [
  { name: 'Overview', to: '/', icon: LayoutDashboard },
  { name: 'Expenses', to: '/expenses', icon: Receipt },
  { name: 'Delivery', to: '/delivery', icon: Truck },
  { name: 'Reports', to: '/reports', icon: FileBarChart },
  { name: 'More', to: '/settings', icon: Settings },
];

export default function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
