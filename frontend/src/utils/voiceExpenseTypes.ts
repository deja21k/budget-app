export interface VoiceExpenseItem {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
}

export interface VoiceExpenseData {
  merchant: string;
  items: VoiceExpenseItem[];
  totalAmount: number | null;
  currency: string;
  category: string | null;
  date?: string;
  notes?: string;
}

export type ConversationStep = 
  | 'idle'
  | 'merchant'
  | 'merchant_clarification'
  | 'items'
  | 'items_clarification'
  | 'confirm'
  | 'complete';

export type ConversationStatus = 
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export interface ClarificationQuestion {
  type: 'merchant' | 'item' | 'amount' | 'currency';
  question: string;
  field: string;
  currentValue: string | null;
}

export interface ConversationState {
  step: ConversationStep;
  status: ConversationStatus;
  merchant: string;
  items: VoiceExpenseItem[];
  currentCurrency: string;
  category: string | null;
  date: string;
  notes: string;
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  error: string | null;
  confidence: number;
  clarification: ClarificationQuestion | null;
  lastPrompt: string;
}

export interface ParsedMerchantResult {
  success: boolean;
  merchant: string;
  currency: string;
  confidence: number;
  needsClarification: boolean;
  clarificationReason?: string;
}

export interface ParsedItemResult {
  success: boolean;
  items: VoiceExpenseItem[];
  currency: string;
  confidence: number;
  needsClarification: boolean;
  clarificationType?: 'amount' | 'item' | 'currency';
  partialItems: VoiceExpenseItem[];
}

export interface ConfirmationResult {
  confirmed: boolean;
  editField?: 'merchant' | 'items' | 'amount';
  newValue?: string;
}

export const CONFIDENCE_THRESHOLD = 0.7;
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export const SERBIAN_PROMPTS: Record<ConversationStep, string> = {
  idle: '',
  merchant: 'Gde si kupovao?',
  merchant_clarification: '',
  items: 'Šta si kupio i po kojoj ceni? Možeš navesti više stavki odjednom.',
  items_clarification: '',
  confirm: '',
  complete: '',
};

export const CLARIFICATION_PROMPTS: Record<ClarificationQuestion['type'], (current: string) => string> = {
  merchant: (current) => `Nisam razumeo prodavnicu. Možeš ponoviti? Rekao si ${current || 'ništa'}.`,
  item: (_current) => `Nisam razumeo naziv stavke. Možeš ponoviti?`,
  amount: (_current) => `Nisam razumeo cenu. Možeš ponoviti iznos?`,
  currency: () => `Koja valuta? Dinari, euro ili dolar?`,
};

export const CONFIRM_PROMPT = (
  merchant: string, 
  items: VoiceExpenseItem[], 
  total: number, 
  currency: string
): string => {
  if (items.length === 0) {
    return `Nisi naveo nijednu stavku. Pokušaj ponovo.`;
  }
  
  if (items.length === 1) {
    const item = items[0];
    return `Dodajem trošak iz ${merchant || 'nepoznate prodavnice'}: ${item.name || 'stavka'}${item.amount ? ` za ${item.amount} ${currency}` : ''}. ${total ? `Ukupno ${total} ${currency}.` : ''} Da li je to ispravno?`;
  }
  
  const itemList = items.slice(0, 3).map(i => 
    `${i.name || 'stavka'}${i.amount ? ` ${i.amount}` : ''}`
  ).join(', ');
  
  const moreItems = items.length > 3 ? ` i još ${items.length - 3}` : '';
  
  return `Dodajem trošak iz ${merchant || 'prodavnice'}: ${itemList}${moreItems}. ${total ? `Ukupno ${total} ${currency}.` : ''} Da li je to ispravno?`;
};

export const COMPLETE_PROMPTS = 'Odlično! Trošak je evidentiran. Hvala!';

export const ERROR_PROMPTS: Record<string, string> = {
  'no-speech': 'Nisam čuo ništa. Pokušaj ponovo.',
  'permission-denied': 'Dozvola za mikrofon je odbijena. Proveri podešavanja.',
  'network': 'Problem sa mrežom. Proveri internet konekciju.',
  'not-allowed': 'Mikrofon nije dozvoljen. Klikni da dozvoliš pristup.',
  'audio-capture': 'Ne mogu da pronađem mikrofon. Proveri uređaj.',
  'default': 'Došlo je do greške. Pokušaj ponovo.',
};

export function createInitialState(): ConversationState {
  return {
    step: 'idle',
    status: 'idle',
    merchant: '',
    items: [],
    currentCurrency: 'RSD',
    category: null,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    transcript: '',
    interimTranscript: '',
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    error: null,
    confidence: 1,
    clarification: null,
    lastPrompt: '',
  };
}
