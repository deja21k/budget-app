import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks';
import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();
  const [showIndicator, setShowIndicator] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setShowIndicator(true);
      });
    } else if (wasOfflineRef.current) {
      // Show "back online" briefly then hide
      const timer = setTimeout(() => {
        setShowIndicator(false);
        wasOfflineRef.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  useEffect(() => {
    if (indicatorRef.current && showIndicator) {
      gsap.fromTo(
        indicatorRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [showIndicator]);

  if (!showIndicator) return null;

  return (
    <div
      ref={indicatorRef}
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
        isOnline
          ? 'bg-success-500 text-white'
          : 'bg-warning-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>You're back online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline. All data is stored locally.</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
