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

    // Use CSS animation instead of JS to avoid scroll interference
    page.style.animation = 'none';
    // Trigger reflow
    page.offsetHeight; 
    page.style.animation = 'fadeIn 0.3s ease forwards';

  }, [location.pathname]);

  return (
    <div ref={pageRef} className="min-h-full" style={{ opacity: 1 }}>
      {children}
    </div>
  );
};

export default PageTransition;
