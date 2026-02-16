import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Clock, CheckCircle, Sparkles, Image, Camera } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReceiptScanner from '../components/ReceiptScanner';
import PageTransition from '../components/layout/PageTransition';
import { receiptService } from '../services/api';
import type { Receipt } from '../types';
import { gsap } from 'gsap';
import { formatCurrency, getCurrentCurrency } from '../utils/defensive';

const Receipts = () => {
  const currency = getCurrentCurrency();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    failed: 0,
  });

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const gsapContextRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
      }
    };
  }, []);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const data = await receiptService.getReceipts();
      if (!isMountedRef.current) return;
      
      setReceipts(data.slice(0, 6));
      
      setStats({
        total: data.length,
        processed: data.filter(r => r.status === 'processed').length,
        failed: data.filter(r => r.status === 'failed').length,
      });
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Failed to load receipts:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleScanSuccess = () => {
    const container = document.querySelector('.scanner-container');
    if (!container || !isMountedRef.current) {
      if (isMountedRef.current) {
        setShowScanner(false);
        loadReceipts();
      }
      return;
    }

    // Create GSAP context for proper cleanup
    const ctx = gsap.context(() => {
      gsap.to(container, {
        opacity: 0,
        y: -30,
        duration: 0.4,
        onComplete: () => {
          if (!isMountedRef.current) return;
          
          setShowScanner(false);
          loadReceipts();
          
          setTimeout(() => {
            if (!isMountedRef.current) return;
            
            setShowScanner(true);
            // Create new context for the return animation
            const returnCtx = gsap.context(() => {
              const newContainer = document.querySelector('.scanner-container');
              if (newContainer) {
                gsap.fromTo(newContainer, 
                  { opacity: 0, y: 30 },
                  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
                );
              }
            });
            gsapContextRef.current = returnCtx;
          }, 2000);
        }
      });
    });
    
    gsapContextRef.current = ctx;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-5 h-5 text-success-600" strokeWidth={2.5} />;
      case 'failed':
        return <RefreshCw className="w-5 h-5 text-danger-600" />;
      default:
        return <Clock className="w-5 h-5 text-warning-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'failed':
        return 'bg-danger-50 text-danger-700 border-danger-200';
      default:
        return 'bg-warning-50 text-warning-700 border-warning-200';
    }
  };

  return (
    <PageTransition>
      <div className="page-container pb-24 lg:pb-8">
        {/* Premium Header */}
        <div className="mb-10 animate-item">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-primary-600">AI-Powered</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                Scan Receipt
              </h1>
              <p className="text-slate-500">
                Upload a receipt photo to automatically extract transaction details using AI
              </p>
            </div>
            <div className="flex gap-4">
              <div className="
                px-5 py-3 bg-success-50 rounded-2xl border border-success-100
                flex flex-col items-center
              ">
                <span className="text-xs text-success-600 font-semibold uppercase tracking-wider">Processed</span>
                <span className="text-2xl font-bold text-success-700">{stats.processed}</span>
              </div>
              <div className="
                px-5 py-3 bg-primary-50 rounded-2xl border border-primary-100
                flex flex-col items-center
              ">
                <span className="text-xs text-primary-600 font-semibold uppercase tracking-wider">Total</span>
                <span className="text-2xl font-bold text-primary-700">{stats.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Scanner Component */}
        {showScanner && (
          <div className="scanner-container animate-item">
            <Card variant="premium" padding="xl" className="gradient-border">
              <ReceiptScanner onSuccess={handleScanSuccess} />
            </Card>
          </div>
        )}

        {/* Premium Recent Receipts */}
        <div className="mt-10 animate-item">
          <CardHeader 
            title={<CardTitle subtitle="Your recently scanned receipts">Recent Receipts</CardTitle>}
            action={
              <Button variant="ghost" size="sm" onClick={loadReceipts} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Refresh
              </Button>
            }
          />

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} variant="premium" className="animate-pulse">
                  <div className="h-32 bg-slate-100 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : receipts.length === 0 ? (
            <Card variant="premium" padding="xl" className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <Camera className="w-10 h-10 text-slate-400" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">
                No receipts yet
              </h4>
              <p className="text-slate-500 max-w-md mx-auto">
                Start by scanning your first receipt above. All your scanned receipts will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {receipts.map((receipt) => (
                <Card 
                  key={receipt.id} 
                  variant="premium"
                  hover
                  hoverScale
                  className="cursor-pointer group overflow-hidden"
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                      ${getStatusColor(receipt.status)}
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      {getStatusIcon(receipt.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-900 truncate">
                          {receipt.extracted_merchant || 'Unknown Store'}
                        </p>
                        <span className={`
                          text-xs px-2.5 py-1 rounded-full font-semibold border
                          ${getStatusColor(receipt.status)}
                        `}>
                          {receipt.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(receipt.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {receipt.extracted_amount && (
                        <p className="text-xl font-bold text-slate-900 mt-2">
                          {formatCurrency(receipt.extracted_amount, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {receipt.image_url && (
                    <div className="mt-5 aspect-video rounded-xl bg-slate-100 overflow-hidden">
                      <img 
                        src={`http://localhost:3000${receipt.image_url}`}
                        alt="Receipt"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Premium Tips Section */}
        <div className="mt-10 animate-item">
          <CardHeader title={<CardTitle>Tips for Best Results</CardTitle>} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: 'Good Lighting',
                desc: 'Ensure the receipt is well-lit and shadows are minimized',
                icon: Sparkles,
              },
              {
                title: 'Flat Surface',
                desc: 'Place the receipt on a flat, contrasting background',
                icon: Image,
              },
              {
                title: 'Full Receipt',
                desc: 'Make sure all text including total and date is visible',
                icon: CheckCircle,
              },
            ].map((tip, index) => (
              <Card 
                key={index} 
                variant="premium" 
                padding="lg"
                className="group hover:border-primary-200"
              >
                <div className="flex items-start gap-4">
                  <div className="
                    w-12 h-12 rounded-xl 
                    bg-gradient-to-br from-slate-100 to-white
                    flex items-center justify-center
                    border border-slate-200
                    group-hover:border-primary-200 group-hover:bg-primary-50
                    transition-all duration-300
                  ">
                    <tip.icon className="w-6 h-6 text-slate-400 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{tip.title}</h4>
                    <p className="text-sm text-slate-500">{tip.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Receipts;
