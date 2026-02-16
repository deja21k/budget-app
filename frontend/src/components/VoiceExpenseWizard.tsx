import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, AlertCircle, X, Plus, Trash2, Volume2, VolumeX, Check, Edit2, CheckCircle } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { voiceService } from '../utils/voiceService';
import {
  parseMerchantWithConfidence,
  parseItemsWithConfidence,
  parseConfirmation,
  calculateTotal,
} from '../utils/voiceExpenseParser';
import {
  type VoiceExpenseData,
  type VoiceExpenseItem,
} from '../utils/voiceExpenseTypes';

interface VoiceExpenseWizardProps {
  onComplete: (data: VoiceExpenseData) => void;
  onCancel: () => void;
  disabled?: boolean;
}

type WizardStep = 'merchant' | 'items' | 'confirm' | 'complete';

function getNextPrompt(step: WizardStep, state: { merchant: string; items: VoiceExpenseItem[]; currentCurrency: string }): string {
  switch (step) {
    case 'merchant':
      return 'Gde si kupovao?';
    case 'items':
      return 'Šta si kupio i po kojoj ceni? Možeš navesti više stavki. Reci gotovo kada završiš.';
    case 'confirm': {
      const { merchant, items, currentCurrency } = state;
      const total = calculateTotal(items);
      if (items.length === 0) {
        return 'Nisi naveo nijednu stavku.';
      }
      if (items.length === 1) {
        const item = items[0];
        return `Dodajem trošak iz ${merchant || 'prodavnice'}: ${item.name || 'stavka'}${item.amount ? ` za ${item.amount} ${currentCurrency}` : ''}. ${total ? `Ukupno ${total} ${currentCurrency}.` : ''} Da li je to ispravno?`;
      }
      const itemList = items.slice(0, 3).map(i => `${i.name || 'stavka'}${i.amount ? ` ${i.amount}` : ''}`).join(', ');
      const moreItems = items.length > 3 ? ` i još ${items.length - 3}` : '';
      return `Dodajem trošak iz ${merchant || 'prodavnice'}: ${itemList}${moreItems}. ${total ? `Ukupno ${total} ${currentCurrency}.` : ''} Da li je to ispravno?`;
    }
    case 'complete':
      return 'Odlično! Trošak je evidentiran. Hvala!';
    default:
      return '';
  }
}

export function VoiceExpenseWizard({ onComplete, onCancel, disabled }: VoiceExpenseWizardProps) {
  const [step, setStep] = useState<WizardStep>('merchant');
  const [merchant, setMerchant] = useState('');
  const [items, setItems] = useState<VoiceExpenseItem[]>([]);
  const [currency, setCurrency] = useState('RSD');
  const [category, setCategory] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [clarifyingItemId, setClarifyingItemId] = useState<string | null>(null);
  const [autoCloseTimeout, setAutoCloseTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const transcriptRef = useRef('');
  const isTransitioning = useRef(false);
  const hasProcessedRef = useRef(false);

  const { state: speechState, startListening, stopListening, isSupported } = useSpeechRecognition({
    language: 'sr-RS',
    continuous: false,
    onResult: (result) => {
      transcriptRef.current = result.transcript;
      if (result.isFinal) {
        hasProcessedRef.current = true;
        handleTranscript(result.transcript);
      }
    },
    onEnd: () => {
      if (transcriptRef.current.trim() && !hasProcessedRef.current) {
        handleTranscript(transcriptRef.current);
      }
      hasProcessedRef.current = false;
    },
    onError: (err) => {
      console.error('Speech error:', err);
      setError(err);
      hasProcessedRef.current = false;
    },
  });

  const speak = useCallback(async (text: string) => {
    if (!soundEnabled) return;
    try {
      await voiceService.speak(text);
    } catch (e) {
      console.error('TTS error:', e);
    }
  }, [soundEnabled]);

  const startOver = useCallback(() => {
    setStep('merchant');
    setMerchant('');
    setItems([]);
    setCurrency('RSD');
    setCategory(null);
    setTranscript('');
    setError(null);
    setClarifyingItemId(null);
    transcriptRef.current = '';
  }, []);

  const handleTranscript = useCallback(async (text: string) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    
    setTranscript(text);
    setIsProcessing(true);

    try {
      if (step === 'merchant') {
        const result = parseMerchantWithConfidence(text);
        
        if (!result.success || !result.merchant) {
          setError('Nisam razumeo. Možeš ponoviti ime prodavnice?');
          setIsProcessing(false);
          isTransitioning.current = false;
          return;
        }

        setMerchant(result.merchant);
        setCurrency(result.currency);
        setStep('items');
        setIsProcessing(false);
        
        await speak(getNextPrompt('items', { merchant: result.merchant, items: [], currentCurrency: result.currency }));
        setTimeout(() => startListening(), 1000);

      } else if (step === 'items') {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('gotovo') || lowerText.includes('kraj') || lowerText.includes('dovoljno') || lowerText.includes('dosta')) {
          if (items.length === 0) {
            setError('Nisi rekao nijednu stavku. Šta si kupio?');
            setIsProcessing(false);
            isTransitioning.current = false;
            return;
          }
          
          setStep('confirm');
          setIsProcessing(false);
          
          await speak(getNextPrompt('confirm', { merchant, items, currentCurrency: currency }));
          setTimeout(() => startListening(), 1500);
        } else {
          const result = parseItemsWithConfidence(text, currency);

          if (!result.success || result.items.length === 0) {
            if (clarifyingItemId) {
              const amountResult = parseItemsWithConfidence(text, currency);
              const amount = amountResult.items[0]?.amount;
              if (amount) {
                setItems(prev => prev.map(item => 
                  item.id === clarifyingItemId 
                    ? { ...item, amount, currency: amountResult.currency || currency }
                    : item
                ));
                setClarifyingItemId(null);
                setIsProcessing(false);
                
                const remainingIncomplete = items.filter(i => i.id !== clarifyingItemId && i.amount === null);
                if (remainingIncomplete.length > 0) {
                  await speak(`Koliko je koštao ${remainingIncomplete[0].name}?`);
                  setClarifyingItemId(remainingIncomplete[0].id);
                  setTimeout(() => startListening(), 1500);
                  return;
                }
                
                await speak('Čuo sam. Šta još? Ili reci gotovo.');
                setTimeout(() => startListening(), 1000);
                return;
              }
            }
            setError('Nisam razumeo. Možeš ponoviti šta si kupio i cenu?');
            setIsProcessing(false);
            isTransitioning.current = false;
            return;
          }

          let newItems: VoiceExpenseItem[];
          
          if (clarifyingItemId) {
            const parsedItem = result.items[0];
            if (parsedItem && parsedItem.amount !== null) {
              setItems(prev => prev.map(item => 
                item.id === clarifyingItemId 
                  ? { ...item, amount: parsedItem.amount, currency: result.currency || currency }
                  : item
              ));
              setClarifyingItemId(null);
              newItems = items.map(item => 
                item.id === clarifyingItemId 
                  ? { ...item, amount: parsedItem.amount, currency: result.currency || currency }
                  : item
              );
            } else {
              newItems = [...items, ...result.items];
            }
          } else {
            newItems = [...items, ...result.items];
          }
          
          setItems(newItems);
          setCurrency(result.currency);
          
          const incompleteItems = newItems.filter(item => item.amount === null);
          if (incompleteItems.length > 0) {
            const incomplete = incompleteItems[0];
            setClarifyingItemId(incomplete.id);
            setIsProcessing(false);
            await speak(`Koliko je koštao ${incomplete.name}?`);
            setTimeout(() => startListening(), 1500);
            return;
          }
          
          const inferredCategory = inferCategory(newItems);
          if (inferredCategory) setCategory(inferredCategory);

          setIsProcessing(false);
          
          await speak('Čuo sam. Šta još? Ili reci gotovo.');
          setTimeout(() => startListening(), 1000);
        }

      } else if (step === 'confirm') {
        const result = parseConfirmation(text);

        if (result.confirmed) {
          await speak('Odlično! Trošak je evidentiran.');
          
          const total = calculateTotal(items);
          const data: VoiceExpenseData = {
            merchant,
            items,
            totalAmount: total,
            currency,
            category,
            date: new Date().toISOString().split('T')[0],
          };
          
          setStep('complete');
          onComplete(data);
          
          const timeoutId = setTimeout(() => {
            onCancel();
          }, 3000);
          setAutoCloseTimeout(timeoutId);
        } else {
          await speak('U redu, počnimo ponovo. Gde si kupovao?');
          startOver();
          setTimeout(() => startListening(), 1500);
        }
      }
    } catch (e) {
      console.error('Processing error:', e);
      setError('Došlo je do greške. Pokušajte ponovo.');
    } finally {
      isTransitioning.current = false;
    }
  }, [step, merchant, items, currency, category, speak, startListening, onComplete, startOver]);

  const handleAddAnother = useCallback(async () => {
    transcriptRef.current = '';
    setTranscript('');
    setError(null);
    await speak('Slušam. Šta još?');
    startListening();
  }, [speak, startListening]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleManualMerchantChange = useCallback((value: string) => {
    setMerchant(value);
  }, []);

  const handleManualItemChange = useCallback((id: string, field: 'name' | 'amount', value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'amount' ? (value ? parseFloat(value) : null) : value,
        };
      }
      return item;
    }));
  }, []);

  const handleConfirm = useCallback(async () => {
    await speak('Odlično! Trošak je evidentiran.');
    
    const total = calculateTotal(items);
    const data: VoiceExpenseData = {
      merchant,
      items,
      totalAmount: total,
      currency,
      category,
      date: new Date().toISOString().split('T')[0],
    };
    
    setStep('complete');
    onComplete(data);
    
    const timeoutId = setTimeout(() => {
      onCancel();
    }, 3000);
    setAutoCloseTimeout(timeoutId);
  }, [speak, merchant, items, currency, category, onComplete, onCancel]);

  const handleCancel = useCallback(() => {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
    }
    voiceService.cancel();
    stopListening();
    onCancel();
  }, [stopListening, autoCloseTimeout, onCancel]);

  useEffect(() => {
    if (!disabled && isSupported && !initialized) {
      setInitialized(true);
      
      const timer = setTimeout(() => {
        speak('Gde si kupovao?');
        setTimeout(() => startListening(), 1500);
      }, 500);
      
      return () => {
        clearTimeout(timer);
        voiceService.cancel();
      };
    }
  }, [disabled, isSupported, initialized, speak, startListening]);

  useEffect(() => {
    return () => {
      voiceService.cancel();
    };
  }, []);

  const isListening = speechState === 'listening';
  const isSpeaking = speechState === 'processing' || isProcessing;
  const total = calculateTotal(items);

  const getStepLabel = () => {
    switch (step) {
      case 'merchant': return { color: 'bg-primary-500', label: 'Prodavnica' };
      case 'items': return { color: 'bg-warning-500', label: 'Stavke' };
      case 'confirm': return { color: 'bg-success-500', label: 'Potvrda' };
      case 'complete': return { color: 'bg-slate-400', label: 'Završeno' };
    }
  };

  const stepInfo = getStepLabel();

  if (!isSupported) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div className="p-6 text-center">
            <MicOff className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 font-medium">Glasovno prepoznavanje nije podržano</p>
            <p className="text-sm text-slate-400 mt-2">Koristite Chrome, Edge ili Safari</p>
            <button onClick={onCancel} className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 rounded-lg">
              Zatvori
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${stepInfo.color}`} />
            <span className="font-medium text-slate-700">{stepInfo.label}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg hover:bg-slate-200" title={soundEnabled ? 'Isključi zvuk' : 'Uključi zvuk'}>
              {soundEnabled ? <Volume2 className="w-4 h-4 text-slate-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button onClick={handleCancel} className="p-2 rounded-lg hover:bg-slate-200">
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="text-center mb-6">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center transition-all ${
              isListening ? 'bg-danger-100 animate-pulse' :
              isSpeaking ? 'bg-primary-100' :
              'bg-slate-100'
            }`}>
              {isListening ? (
                <Mic className="w-12 h-12 text-danger-500" />
              ) : isSpeaking ? (
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
              ) : step === 'complete' ? (
                <CheckCircle className="w-12 h-12 text-success-500" />
              ) : (
                <Mic className="w-12 h-12 text-slate-400" />
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              {isListening ? 'Slušam...' : 
               isSpeaking ? 'Obrađujem...' :
               step === 'merchant' ? 'Gde si kupovao?' :
               step === 'items' ? 'Šta si kupio?' :
               step === 'confirm' ? 'Potvrdi?' :
               'Završeno!'}
            </h2>
            
            <p className="text-sm text-slate-500">
              {isListening ? 'Govorite sada' : 
               isSpeaking ? 'Molimo sačekajte' :
               step === 'merchant' ? 'Recite ime prodavnice' :
               step === 'items' ? 'Navedite stavke sa cenama' :
               step === 'confirm' ? 'Odgovorite da ili ne' :
               'Hvala!'}
            </p>
          </div>

          {(transcript || transcriptRef.current) && (
            <div className="mb-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 italic">"{transcriptRef.current || transcript}"</p>
            </div>
          )}

          {step === 'merchant' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Prodavnica</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => handleManualMerchantChange(e.target.value)}
                placeholder="Unesi prodavnicu..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {step === 'items' && items.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stavke:</p>
              
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleManualItemChange(item.id, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-none text-sm text-slate-700 focus:outline-none"
                    placeholder="Naziv stavke"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={item.amount || ''}
                      onChange={(e) => handleManualItemChange(item.id, 'amount', e.target.value)}
                      className="w-20 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      placeholder="Cena"
                    />
                    <span className="text-xs text-slate-400">{currency}</span>
                    <button onClick={() => handleRemoveItem(item.id)} className="p-1 hover:bg-danger-100 rounded ml-1">
                      <Trash2 className="w-3 h-3 text-danger-400" />
                    </button>
                  </div>
                </div>
              ))}

              {total && (
                <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg mt-3">
                  <span className="font-medium text-primary-700">Ukupno:</span>
                  <span className="font-bold text-lg text-primary-700">
                    {total.toLocaleString('sr-RS')} {currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="mb-4 p-4 bg-success-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-success-200">
                <span className="text-sm font-medium text-success-800">Prodavnica:</span>
                <span className="text-sm text-success-700">{merchant || 'Nepoznato'}</span>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-success-800 uppercase">Stavke:</p>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-success-700">{item.name || 'Stavka'}</span>
                    <span className="text-success-700 font-medium">
                      {item.amount ? `${item.amount.toLocaleString('sr-RS')} ${item.currency}` : 'bez cene'}
                    </span>
                  </div>
                ))}
              </div>

              {total && (
                <div className="flex justify-between items-center pt-3 border-t border-success-200">
                  <span className="font-bold text-success-800">Ukupno:</span>
                  <span className="font-bold text-xl text-success-800">
                    {total.toLocaleString('sr-RS')} {currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success-500" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Trošak dodat!</h3>
              <p className="text-sm text-slate-500">Hvala ti.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex gap-3">
            {step === 'items' && items.length > 0 && (
              <button
                onClick={handleAddAnother}
                disabled={isListening || isSpeaking}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Dodaj još
              </button>
            )}

            {step === 'confirm' && (
              <button
                onClick={handleConfirm}
                disabled={isListening || isSpeaking}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Potvrdi
              </button>
            )}

            {step === 'confirm' && (
              <button
                onClick={startOver}
                disabled={isListening || isSpeaking}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                <Edit2 className="w-4 h-4" />
                Izmeni
              </button>
            )}

            {step !== 'confirm' && step !== 'complete' && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium ${
                  isListening
                    ? 'bg-danger-500 text-white hover:bg-danger-600'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                } disabled:opacity-50`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Zaustavi
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Slušam
                  </>
                )}
              </button>
            )}

            <button
              onClick={startOver}
              className="py-3 px-4 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300"
            >
              Novo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function inferCategory(items: VoiceExpenseItem[]): string | null {
  const categoryKeywords: Record<string, string[]> = {
    'Food & Drinks': ['kafa', 'cappuccino', 'latte', 'espresso', 'ručak', 'doručak', 'večera', 'pizza', 'hamburger', 'burek', 'kifle', 'pogača', 'sok', 'voda', 'pivo', 'vino', 'hleb', 'mleko'],
    'Transportation': ['gorivo', 'benzin', 'dizel', 'parking', 'taxi', 'uber', 'autobus'],
    'Entertainment': ['netflix', 'spotify', 'youtube', 'bioskop', 'film', 'konzert'],
    'Utilities': ['struja', 'gas', 'grejanje', 'voda', 'internet', 'telefon'],
  };
  
  const allText = items.map(i => i.name.toLowerCase()).join(' ');
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) return category;
    }
  }
  
  return null;
}
