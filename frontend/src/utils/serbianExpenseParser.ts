export interface ParsedExpense {
  item: string;
  amount: number | null;
  currency: string;
  category: string | null;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedExpense;
  error?: string;
  needsClarification?: 'amount' | 'item';
}

const CURRENCY_KEYWORDS: { [key: string]: string } = {
  'din': 'RSD',
  'dinara': 'RSD',
  'rsd': 'RSD',
  'eur': 'EUR',
  'eura': 'EUR',
  'euro': 'EUR',
  'dol': 'USD',
  'dolara': 'USD',
  'dollars': 'USD',
  '$': 'USD',
  '€': 'EUR',
};

const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
  'Food & Drinks': [
    'kafa', 'coffee', 'cafe', 'cappuccino', 'latte', 'espresso',
    'ručak', 'rucak', 'doručak', 'dorucak', 'večera', 'vecera', 'vecherak',
    'pizza', 'hamburger', 'burger', 'sendvič', 'sendvic', 'kebab',
    'slatko', 'kolač', 'kolac', 'torta', 'krem', 'krempita',
    'sok', 'juice', 'voda', 'water', 'čaj', 'caj', 'tea',
    'pivo', 'pivo', 'beer', 'vino', 'wine', 'alkohol',
    'pekara', 'pekara', 'bakery', 'burek', 'kifle', 'pogača', 'pogaca',
    'market', 'supermarket', 'groceries', 'maxi', 'univerexport', 'lidl', 'idea',
    'restoran', 'kafana', 'gostionica', 'obilježje',
  ],
  'Transportation': [
    'gorivo', 'benzin', 'dizel', 'nafta', 'fuel', 'gas',
    'parking', 'parking', 'garaza', 'garage',
    'taxi', 'uber', 'lyft',
    'autobus', 'bus', 'voz', 'train', 'metro',
    'tire', 'gume', 'oil', 'ulje', 'auto', 'car',
    'registration', 'saobraćajna', 'saobracajna',
  ],
  'Entertainment': [
    'netflix', 'spotify', 'youtube', 'hbo', 'disney', 'amazon prime',
    'bioskop', 'cinema', 'movie', 'film', 'kino',
    'konzert', 'concert', 'festival',
    'igra', 'game', 'playstation', 'xbox', 'steam',
    'knjiga', 'book', 'biblioteka',
  ],
  'Shopping': [
    'odežda', 'odeca', 'clothes', 'clothes', 'obuca', 'shoes',
    'elektronika', 'electronics', 'telefon', 'phone', 'laptop',
    'apoteka', 'pharmacy', 'lek', 'medicine',
    'poklon', 'gift', 'dar', 'regali',
    'mebli', 'furniture', 'nameštaj', 'namestaj',
  ],
  'Healthcare': [
    'doktor', 'doctor', 'lekar', 'ordinacija', 'polyclinic',
    'zubar', 'dentist', 'stomatolog', 'stomatology',
    'bolnica', 'hospital', 'klinika', 'clinic',
    'apoteka', 'apoteka', 'pharmacy', 'medicine', 'lekovi',
    'pregled', 'examination', 'test', 'analysis', 'analiza',
  ],
  'Utilities': [
    'struja', 'electricity', ' električna', 'elekticna',
    'gas', 'grejanje', 'heating', 'toplanа',
    'voda', 'water', 'vodovod',
    'internet', 'net', 'wifi',
    'telefon', 'phone', 'mts', 'telenor', 'yettel',
    'komunalije', 'utilities', 'održavanje', 'odrzavanje',
  ],
};

function extractAmount(text: string): { amount: number | null; remainingText: string } {
  const numberPatterns = [
    /\b(\d+[.,]\d{2})\b/g,
    /\b(\d+[.,]\d{1})\b/g,
    /\b(\d+)\s*(?:din|dinara|rsd|eur|eura|dol|dolara)?s?\b/gi,
    /\b(\d+)\b/g,
  ];

  const processedText = text.toLowerCase()
    .replace(/(\d+)[.,](\d{1})$/g, '$1.$2')
    .replace(/,/g, '.');

  const numbers: number[] = [];

  for (const pattern of numberPatterns) {
    let match;
    const regex = new RegExp(pattern.source, 'gi');
    while ((match = regex.exec(processedText)) !== null) {
      const numStr = match[1].replace(',', '.');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && num < 10000000) {
        numbers.push(num);
      }
    }
  }

  const currencyPattern = /\b(din|dinara|rsd|eur|eura|dol|dolara|€|$)\b/gi;
  
  let amount: number | null = null;
  
  if (numbers.length > 0) {
    if (numbers.length === 1) {
      amount = numbers[0];
    } else {
      const likelyPrice = numbers.find(n => n > 10 && n < 10000);
      if (likelyPrice) {
        amount = likelyPrice;
      } else {
        amount = Math.max(...numbers);
      }
    }
  }

  let remainingText = processedText
    .replace(currencyPattern, '')
    .replace(/\d+[.,]?\d*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { amount, remainingText };
}

function extractCurrency(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [keyword, currency] of Object.entries(CURRENCY_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return currency;
    }
  }
  
  return 'RSD';
}

function extractItem(text: string): string {
  const cleanedText = text
    .replace(/kupio|kupila|kupili|kupio sam|kupila sam|platio|platila|platio sam|platila sam/gi, '')
    .replace(/za|na|u|od|sa|s|do/g, ' ')
    .replace(/(\d+)[.,]?\d*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const stopWords = ['sam', 'sam', 'bio', 'bila', 'bilo', 'je', 'su', 'i', 'a', 'ali', 'ili', 'to', 'taj', 'ta', 'ovo', 'ovaj'];
  const words = cleanedText.split(' ').filter(word => 
    word.length > 1 && !stopWords.includes(word)
  );

  if (words.length === 0) {
    return cleanedText || '';
  }

  const item = words.slice(0, 3).join(' ');
  return item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
}

function inferCategory(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return null;
}

export function parseSerbianExpense(transcript: string): ParseResult {
  if (!transcript || transcript.trim() === '') {
    return {
      success: false,
      error: 'No speech input detected',
      needsClarification: 'item',
    };
  }

  const { amount, remainingText } = extractAmount(transcript);
  const currency = extractCurrency(transcript);
  const item = extractItem(remainingText || transcript);
  const category = inferCategory(transcript);

  if (!amount && !item) {
    return {
      success: false,
      error: 'Could not extract amount or item from the input',
      needsClarification: 'amount',
    };
  }

  if (!amount) {
    return {
      success: true,
      data: {
        item: item || '',
        amount: null,
        currency,
        category,
      },
      needsClarification: 'amount',
    };
  }

  if (!item) {
    return {
      success: true,
      data: {
        item: '',
        amount,
        currency,
        category,
      },
      needsClarification: 'item',
    };
  }

  return {
    success: true,
    data: {
      item,
      amount,
      currency,
      category,
    },
  };
}

export function formatTranscriptForDisplay(transcript: string): string {
  return transcript
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
