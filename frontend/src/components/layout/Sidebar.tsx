import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  Settings,
  TrendingUp,
  Camera,
  Sparkles
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/transactions', icon: <Wallet className="w-5 h-5" />, label: 'Transactions' },
  { to: '/receipts', icon: <Camera className="w-5 h-5" />, label: 'Scan Receipt' },
  { to: '/insights', icon: <PieChart className="w-5 h-5" />, label: 'Insights' },
];

const Sidebar = () => {
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Premium entrance animation
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.2 });

    // Animate sidebar background
    tl.fromTo(sidebarRef.current,
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }
    );

    // Animate logo
    tl.fromTo(logoRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.3'
    );

    // Animate nav items with stagger
    if (navRef.current) {
      const items = navRef.current.querySelectorAll('.nav-item');
      tl.fromTo(items,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
        '-=0.2'
      );
    }

    // Animate settings
    tl.fromTo(settingsRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      '-=0.2'
    );
  }, []);

  // Premium active indicator animation
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = e.currentTarget;
    const indicator = target.querySelector('.active-indicator');
    
    if (indicator) {
      gsap.fromTo(indicator,
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  };

  return (
    <aside 
      ref={sidebarRef}
      className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-40 hidden lg:block"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
      }}
    >
      <style>{`
        html.dark aside {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%) !important;
        }
      `}</style>
      <div className="flex flex-col h-full">
        {/* Premium Logo Section */}
        <div 
          ref={logoRef}
          className="p-8 border-b border-slate-100/80 dark:border-slate-800"
        >
          <div className="flex items-center gap-4">
            {/* Premium Logo Icon with gradient */}
            <div className="
              w-12 h-12 rounded-2xl 
              bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600
              flex items-center justify-center
              shadow-lg shadow-primary-500/25
              relative overflow-hidden
              group
            ">
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <TrendingUp className="w-6 h-6 text-white relative z-10" strokeWidth={2.5} />
            </div>
            
            {/* Premium Logo Text */}
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Budget</h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary-500" />
                Smart Finance
              </p>
            </div>
          </div>
        </div>

        {/* Premium Navigation */}
        <nav ref={navRef} className="flex-1 p-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-4">
            Menu
          </div>
          
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }: { isActive: boolean }) =>
                `nav-item relative flex items-center gap-3 px-4 py-3.5 rounded-xl
                 transition-all duration-300 ease-premium group
                 ${isActive 
                   ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium shadow-soft' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                 }`
              }
            >
              {/* Premium active indicator */}
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <span className={`
                    absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 
                    bg-primary-500 rounded-r-full
                    transition-all duration-300 ease-premium
                    ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}
                  `} />
                  
                  {/* Icon with animation */}
                  <span className={`
                    transition-all duration-300 ease-premium
                    ${isActive ? 'text-primary-600 dark:text-primary-400 scale-110' : 'group-hover:scale-105'}
                  `}>
                    {item.icon}
                  </span>
                  
                  {/* Label */}
                  <span className="flex-1">{item.label}</span>
                  
                  {/* Badge if exists */}
                  {item.badge && (
                    <span className="
                      px-2 py-0.5 text-xs font-semibold 
                      bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 
                      rounded-full
                    ">
                      {item.badge}
                    </span>
                  )}
                  
                  {/* Hover arrow indicator */}
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center overflow-visible">
                    <svg
                      className={`
                        w-4 h-4 text-slate-400 flex-shrink-0
                        transition-all duration-300 ease-premium
                        ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'}
                      `}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ minWidth: '16px', minHeight: '16px' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Premium Settings at bottom */}
        <div 
          ref={settingsRef}
          className="p-6 border-t border-slate-100/80"
        >
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-100">
            <NavLink
              to="/settings"
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl
                 transition-all duration-300 ease-premium
                 ${isActive 
                   ? 'bg-white text-primary-700 font-medium shadow-soft' 
                   : 'text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-soft'
                 }`
              }
            >
              <Settings className={`
                w-5 h-5 transition-all duration-300
                ${location.pathname === '/settings' ? 'text-primary-600 rotate-90' : ''}
              `} />
              <span className="flex-1 font-medium">Settings</span>
            </NavLink>
          </div>
          
          {/* Premium version badge */}
          <div className="mt-4 text-center">
            <span className="text-xs font-medium text-slate-400">v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
