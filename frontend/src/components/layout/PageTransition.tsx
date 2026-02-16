import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    // Simple fade-in animation using CSS
    page.style.opacity = '0';
    page.style.transform = 'translateY(10px)';
    
    const timer = setTimeout(() => {
      page.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      page.style.opacity = '1';
      page.style.transform = 'translateY(0)';
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div ref={pageRef} className="min-h-full">
      {children}
    </div>
  );
};

export default PageTransition;
