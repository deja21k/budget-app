import { 
  type VoiceExpenseItem,
  CLARIFICATION_PROMPTS,
  COMPLETE_PROMPTS,
  ERROR_PROMPTS,
} from './voiceExpenseTypes';

export type VoicePromptType = 
  | 'merchant'
  | 'items'
  | 'confirm'
  | 'complete'
  | 'clarification'
  | 'error';

class VoiceService {
  private synthesis: SpeechSynthesis | null = null;
  private isSupported: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.isSupported = true;
      this.loadVoices();
    }
  }

  private loadVoices(): void {
    if (!this.synthesis) return;

    const loadVoices = () => {
      this.voices = this.synthesis!.getVoices();
    };

    if (this.synthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synthesis.addEventListener('voiceschanged', loadVoices);
    }
  }

  get supported(): boolean {
    return this.isSupported;
  }

  async speak(text: string, lang: string = 'sr-RS'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis || !this.isSupported) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.volume = 1;

      const serbianVoice = this.voices.find(v => 
        v.lang.startsWith('sr') || v.lang.startsWith('sh')
      ) || this.voices.find(v => v.lang.startsWith('hr'));

      if (serbianVoice) {
        utterance.voice = serbianVoice;
      }

      const endHandler = () => {
        utterance.removeEventListener('end', endHandler);
        utterance.removeEventListener('error', errorHandler);
        resolve();
      };

      const errorHandler = (e: Event) => {
        utterance.removeEventListener('end', endHandler);
        utterance.removeEventListener('error', errorHandler);
        reject(e);
      };

      utterance.addEventListener('end', endHandler);
      utterance.addEventListener('error', errorHandler);

      this.synthesis.speak(utterance);
    });
  }

  async speakPrompt(type: VoicePromptType, data?: Record<string, unknown>): Promise<void> {
    let text = '';

    switch (type) {
      case 'merchant':
        text = 'Gde si kupovao?';
        break;

      case 'items':
        text = 'Šta si kupio i po kojoj ceni? Možeš navesti više stavki odjednom. Za završetak reci gotovo ili dosta.';
        break;

      case 'confirm': {
        const { merchant, items, total, currency } = data as {
          merchant: string;
          items: VoiceExpenseItem[];
          total: number;
          currency: string;
        };
        
        if (!items || items.length === 0) {
          text = 'Nisi naveo nijednu stavku. Pokušaj ponovo.';
        } else if (items.length === 1) {
          const item = items[0];
          text = `Dodajem trošak iz ${merchant || 'prodavnice'}: ${item.name || 'stavka'}${item.amount ? ` za ${item.amount} ${currency}` : ''}. ${total ? `Ukupno ${total} ${currency}.` : ''} Da li je to ispravno?`;
        } else {
          const itemList = items.slice(0, 3).map(i => 
            `${i.name || 'stavka'}${i.amount ? ` ${i.amount}` : ''}`
          ).join(', ');
          
          const moreItems = items.length > 3 ? ` i još ${items.length - 3}` : '';
          text = `Dodajem trošak iz ${merchant || 'prodavnice'}: ${itemList}${moreItems}. ${total ? `Ukupno ${total} ${currency}.` : ''} Da li je to ispravno?`;
        }
        break;
      }

      case 'complete':
        text = COMPLETE_PROMPTS;
        break;

      case 'clarification': {
        const { clarificationType, currentValue } = data as {
          clarificationType: string;
          currentValue: string | null;
        };
        
        const promptFn = CLARIFICATION_PROMPTS[clarificationType as keyof typeof CLARIFICATION_PROMPTS];
        text = promptFn ? promptFn(currentValue || '') : 'Možeš ponoviti?';
        break;
      }

      case 'error': {
        const { errorType } = data as { errorType: string };
        text = ERROR_PROMPTS[errorType] || ERROR_PROMPTS['default'];
        break;
      }
    }

    if (text) {
      return this.speak(text);
    }
  }

  speakConfirmation(
    merchant: string,
    items: VoiceExpenseItem[],
    total: number,
    currency: string
  ): Promise<void> {
    return this.speakPrompt('confirm', { merchant, items, total, currency });
  }

  speakClarification(
    type: 'merchant' | 'item' | 'amount' | 'currency',
    currentValue: string | null
  ): Promise<void> {
    return this.speakPrompt('clarification', { clarificationType: type, currentValue });
  }

  speakError(errorType: string): Promise<void> {
    return this.speakPrompt('error', { errorType });
  }

  speakComplete(): Promise<void> {
    return this.speakPrompt('complete');
  }

  cancel(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }
}

export const voiceService = new VoiceService();
