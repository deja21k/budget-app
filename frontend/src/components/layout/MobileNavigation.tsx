import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Camera, PieChart } from 'lucide-react';

const mobileNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/transactions', icon: Wallet, label: 'Transactions' },
  { to: '/receipts', icon: Camera, label: 'Scan' },
  { to: '/insights', icon: PieChart, label: 'Insights' },
];

const MobileNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }: { isActive: boolean }) =>
                `
                  relative flex flex-col items-center justify-center flex-1 h-full gap-1
                  transition-colors duration-200
                  ${isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }
                `
              }
            >
              {isActive && (
                <div className="absolute inset-2 rounded-xl bg-primary-50 dark:bg-primary-900/30" />
              )}
              
              <div className={`
                relative z-10 p-2 rounded-xl transition-all duration-200
                ${isActive ? 'bg-primary-100 dark:bg-primary-900/50' : ''}
              `}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
              </div>
              
              <span className={`
                relative z-10 text-xs font-medium transition-colors
                ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}
              `}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
