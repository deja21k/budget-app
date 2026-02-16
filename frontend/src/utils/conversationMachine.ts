import type {
  ConversationStep,
  ConversationState,
  VoiceExpenseItem,
  VoiceExpenseData,
  ParsedMerchantResult,
  ParsedItemResult,
} from './voiceExpenseTypes';

import {
  createInitialState,
  CONFIRM_PROMPT,
  COMPLETE_PROMPTS,
} from './voiceExpenseTypes';

import {
  parseMerchantWithConfidence,
  parseItemsWithConfidence,
  calculateTotal,
  inferCategoryFromItems,
  createClarificationQuestion,
} from './voiceExpenseParser';

export type ConversationAction =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'SPEECH_END'; transcript: string }
  | { type: 'MERCHANT_PARSED'; result: ParsedMerchantResult }
  | { type: 'ITEMS_PARSED'; result: ParsedItemResult }
  | { type: 'CONFIRMATION_PARSED'; confirmed: boolean; editField?: string }
  | { type: 'CLARIFICATION_RESPONSE'; transcript: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }
  | { type: 'SET_STEP'; step: ConversationStep }
  | { type: 'SET_LISTENING'; isListening: boolean }
  | { type: 'SET_PROCESSING'; isProcessing: boolean }
  | { type: 'SET_SPEAKING'; isSpeaking: boolean }
  | { type: 'UPDATE_MERCHANT'; merchant: string }
  | { type: 'UPDATE_ITEMS'; items: VoiceExpenseItem[] }
  | { type: 'ADD_ITEM'; item: VoiceExpenseItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'UPDATE_CURRENCY'; currency: string }
  | { type: 'ADD_ITEMS_FROM_CLARIFICATION'; items: VoiceExpenseItem[] };

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        step: 'merchant',
        status: 'listening',
        isListening: true,
        error: null,
      };

    case 'STOP':
      return {
        ...state,
        status: 'idle',
        isListening: false,
      };

    case 'SPEECH_END':
      return {
        ...state,
        status: 'processing',
        isListening: false,
        isProcessing: true,
        transcript: action.transcript,
      };

    case 'MERCHANT_PARSED': {
      const { result } = action;
      
      if (!result.success) {
        return {
          ...state,
          status: 'idle',
          isProcessing: false,
          error: result.clarificationReason || 'Could not understand merchant',
        };
      }

      if (result.needsClarification) {
        const clarification = createClarificationQuestion('merchant', result.merchant);
        return {
          ...state,
          merchant: result.merchant,
          currentCurrency: result.currency,
          confidence: result.confidence,
          clarification,
          step: 'merchant_clarification',
          status: 'speaking',
          isProcessing: false,
          isSpeaking: true,
          lastPrompt: clarification.question,
        };
      }

      return {
        ...state,
        merchant: result.merchant,
        currentCurrency: result.currency,
        confidence: result.confidence,
        step: 'items',
        status: 'speaking',
        isProcessing: false,
        isSpeaking: true,
      };
    }

    case 'ITEMS_PARSED': {
      const { result } = action;
      
      if (!result.success || result.items.length === 0) {
        return {
          ...state,
          status: 'idle',
          isProcessing: false,
          error: 'Could not understand items',
        };
      }

      if (result.needsClarification && result.clarificationType) {
        const clarification = createClarificationQuestion(
          result.clarificationType,
          result.partialItems[0]?.name || result.partialItems[0]?.amount?.toString() || null
        );
        return {
          ...state,
          items: [...state.items, ...result.items],
          currentCurrency: result.currency,
          confidence: result.confidence,
          clarification,
          step: 'items_clarification',
          status: 'speaking',
          isProcessing: false,
          isSpeaking: true,
          lastPrompt: clarification.question,
        };
      }

      const allItems = [...state.items, ...result.items];
      const category = inferCategoryFromItems(allItems);

      return {
        ...state,
        items: allItems,
        currentCurrency: result.currency,
        category,
        confidence: result.confidence,
        step: 'confirm',
        status: 'speaking',
        isProcessing: false,
        isSpeaking: true,
      };
    }

    case 'ADD_ITEMS_FROM_CLARIFICATION': {
      const newItems = action.items;
      const allItems = [...state.items, ...newItems];
      const category = inferCategoryFromItems(allItems);

      return {
        ...state,
        items: allItems,
        category,
        clarification: null,
        step: 'confirm',
        status: 'speaking',
        isSpeaking: true,
      };
    }

    case 'CONFIRMATION_PARSED': {
      if (action.confirmed) {
        return {
          ...state,
          step: 'complete',
          status: 'speaking',
          isSpeaking: true,
          lastPrompt: COMPLETE_PROMPTS,
        };
      }

      if (action.editField === 'merchant') {
        return {
          ...state,
          merchant: '',
          step: 'merchant',
          clarification: null,
          status: 'speaking',
          isSpeaking: true,
        };
      }

      if (action.editField === 'items') {
        return {
          ...state,
          items: [],
          step: 'items',
          clarification: null,
          status: 'speaking',
          isSpeaking: true,
        };
      }

      return {
        ...createInitialState(),
        step: 'merchant',
        status: 'idle',
      };
    }

    case 'CLARIFICATION_RESPONSE': {
      const transcript = action.transcript;

      if (state.step === 'merchant_clarification') {
        const result = parseMerchantWithConfidence(transcript);
        return {
          ...state,
          merchant: result.merchant,
          currentCurrency: result.currency,
          confidence: Math.min(state.confidence, result.confidence),
          clarification: null,
          step: 'items',
          status: 'speaking',
          isSpeaking: true,
        };
      }

      if (state.step === 'items_clarification') {
        const result = parseItemsWithConfidence(transcript, state.currentCurrency);
        
        if (result.success && result.items.length > 0) {
          const allItems = [...state.items, ...result.items];
          const category = inferCategoryFromItems(allItems);

          return {
            ...state,
            items: allItems,
            currentCurrency: result.currency,
            category,
            clarification: null,
            step: 'confirm',
            status: 'speaking',
            isSpeaking: true,
          };
        }

        return {
          ...state,
          error: 'Still could not understand. Please try again.',
          status: 'idle',
          isProcessing: false,
        };
      }

      return state;
    }

    case 'ERROR':
      return {
        ...state,
        status: 'error',
        isListening: false,
        isProcessing: false,
        isSpeaking: false,
        error: action.message,
      };

    case 'RESET':
      return createInitialState();

    case 'SET_STEP':
      return {
        ...state,
        step: action.step,
      };

    case 'SET_LISTENING':
      return {
        ...state,
        isListening: action.isListening,
        status: action.isListening ? 'listening' : 'idle',
      };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.isProcessing,
        status: action.isProcessing ? 'processing' : 'idle',
      };

    case 'SET_SPEAKING':
      return {
        ...state,
        isSpeaking: action.isSpeaking,
        status: action.isSpeaking ? 'speaking' : 'idle',
      };

    case 'UPDATE_MERCHANT':
      return {
        ...state,
        merchant: action.merchant,
      };

    case 'UPDATE_ITEMS':
      return {
        ...state,
        items: action.items,
      };

    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.item],
      };

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.id),
      };

    case 'UPDATE_CURRENCY':
      return {
        ...state,
        currentCurrency: action.currency,
      };

    default:
      return state;
  }
}

export function getPromptForStep(step: ConversationStep, state: ConversationState): string {
  switch (step) {
    case 'merchant':
      return 'Gde si kupovao?';
    
    case 'merchant_clarification':
      if (state.clarification) {
        return state.clarification.question;
      }
      return 'Možeš ponoviti ime prodavnice?';
    
    case 'items':
      return 'Šta si kupio i po kojoj ceni? Možeš navesti više stavki. Za završetak reci gotovo ili dosta.';
    
    case 'items_clarification':
      if (state.clarification) {
        return state.clarification.question;
      }
      return 'Možeš ponoviti cenu ili naziv stavke?';
    
    case 'confirm': {
      const total = calculateTotal(state.items);
      return CONFIRM_PROMPT(state.merchant, state.items, total || 0, state.currentCurrency);
    }
    
    case 'complete':
      return COMPLETE_PROMPTS;
    
    case 'idle':
    default:
      return '';
  }
}

export function getStatusMessage(state: ConversationState): { title: string; subtitle: string } {
  switch (state.status) {
    case 'listening':
      return {
        title: 'Slušam...',
        subtitle: 'Govorite sada',
      };
    
    case 'processing':
      return {
        title: 'Obrađujem...',
        subtitle: 'Molimo sačekajte',
      };
    
    case 'speaking':
      return {
        title: 'AI govori...',
        subtitle: 'Slušajte',
      };
    
    case 'error':
      return {
        title: 'Greška',
        subtitle: state.error || 'Došlo je do greške',
      };
    
    case 'idle':
    default:
      switch (state.step) {
        case 'merchant':
          return {
            title: 'Gde si kupovao?',
            subtitle: 'Recite ime prodavnice',
          };
        
        case 'merchant_clarification':
          return {
            title: 'Pojašnjenje',
            subtitle: 'Nisam razumeo, možeš ponoviti?',
          };
        
        case 'items':
          return {
            title: 'Šta si kupio?',
            subtitle: 'Navedite stavke sa cenama',
          };
        
        case 'items_clarification':
          return {
            title: 'Pojašnjenje',
            subtitle: 'Možeš ponoviti?',
          };
        
        case 'confirm':
          return {
            title: 'Potvrda',
            subtitle: 'Odgovorite da ili ne',
          };
        
        case 'complete':
          return {
            title: 'Završeno!',
            subtitle: 'Trošak je evidentiran',
          };
        
        default:
          return {
            title: 'Glasovni unos',
            subtitle: 'Kliknite da počnete',
          };
      }
  }
}

export function createExpenseData(state: ConversationState): VoiceExpenseData {
  const total = calculateTotal(state.items);
  
  return {
    merchant: state.merchant,
    items: state.items,
    totalAmount: total,
    currency: state.currentCurrency,
    category: state.category,
    date: state.date,
    notes: state.notes,
  };
}
