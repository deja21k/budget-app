import {
  type ParsedMerchantResult,
  type ParsedItemResult,
  type VoiceExpenseItem,
  type ClarificationQuestion,
  CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
  CLARIFICATION_PROMPTS,
} from './voiceExpenseTypes';

const MERCHANT_PATTERNS: { pattern: RegExp; merchant: string; weight: number }[] = [
  { pattern: /\b(maxi|maxij)\b/i, merchant: 'Maxi', weight: 1.0 },
  { pattern: /\b(univerexport|univer export|univer)\b/i, merchant: 'Univerexport', weight: 1.0 },
  { pattern: /\b(lidl|lild)\b/i, merchant: 'Lidl', weight: 1.0 },
  { pattern: /\b(idea|idja)\b/i, merchant: 'Idea', weight: 1.0 },
  { pattern: /\b(tempo|tempa)\b/i, merchant: 'Tempo', weight: 1.0 },
  { pattern: /\b(dis|diss)\b/i, merchant: 'DIS', weight: 1.0 },
  { pattern: /\b(mercator|merkator)\b/i, merchant: 'Mercator', weight: 1.0 },
  { pattern: /\b(roda|rodja)\b/i, merchant: 'Roda', weight: 1.0 },
  { pattern: /\b(apoteka|apoteke|apoteki)\b/i, merchant: 'Apoteka', weight: 0.9 },
  { pattern: /\b(pekara|pekar|pekare|pekari)\b/i, merchant: 'Pekara', weight: 0.9 },
  { pattern: /\b(restoran|kafana|gostionica|restorani)\b/i, merchant: 'Restoran', weight: 0.8 },
  { pattern: /\b(kafić|kafic|cafe|café|kafe)\b/i, merchant: 'Cafe', weight: 0.9 },
  { pattern: /\b(benzin|gorivo|nafta)\s*(?:stanica|pumpa)?/i, merchant: 'Gas Station', weight: 0.9 },
  { pattern: /\b(shell|šel|sel)\b/i, merchant: 'Shell', weight: 1.0 },
  { pattern: /\b(omv|omf)\b/i, merchant: 'OMV', weight: 1.0 },
  { pattern: /\b(mol|mol\s*benzin)\b/i, merchant: 'Mol', weight: 1.0 },
  { pattern: /\b(naftna|nafts)\b/i, merchant: 'Naftna', weight: 1.0 },
  { pattern: /\b(parking|parkiranj|parking\s*služba)/i, merchant: 'Parking', weight: 0.9 },
  { pattern: /\b(taxi|taxi|uber|uber\s*taxi)\b/i, merchant: 'Taxi', weight: 0.9 },
  { pattern: /\b(netflix|netflix|kompakt|player)\b/i, merchant: 'Netflix', weight: 1.0 },
  { pattern: /\b(spotify|spotifaj|spotifaj\s*premium)\b/i, merchant: 'Spotify', weight: 1.0 },
  { pattern: /\b(youtube\s*premium|youtube)\b/i, merchant: 'YouTube', weight: 1.0 },
  { pattern: /\b(telekom|telenor|mts|yettel|sbb)\b/i, merchant: 'Telekom', weight: 0.9 },
  { pattern: /\b(hm|zara|c&a|newyorker|mandarin|ortopedija)\b/i, merchant: 'Clothing Store', weight: 0.8 },
  { pattern: /\b(ikea|jysk|home\s*center|tehnomanija|ct\s*world|beko|gorenje)\b/i, merchant: 'Home Store', weight: 0.8 },
  { pattern: /\b(knjižara|biblioteka|laguna|bookstore)\b/i, merchant: 'Bookstore', weight: 0.9 },
  { pattern: /\b(bioskop|sinema|kino|cinema)\b/i, merchant: 'Cinema', weight: 0.9 },
  { pattern: /\b(teretana|fitnes|plivanje|sport\s*klub)\b/i, merchant: 'Fitness', weight: 0.9 },
];

const CURRENCY_MAP: Record<string, string> = {
  'din': 'RSD',
  'dina': 'RSD',
  'dinara': 'RSD',
  'rsd': 'RSD',
  'rsda': 'RSD',
  'eur': 'EUR',
  'eura': 'EUR',
  'euro': 'EUR',
  'evro': 'EUR',
  'dol': 'USD',
  'dolar': 'USD',
  'dolara': 'USD',
  'dolari': 'USD',
  '$': 'USD',
  '€': 'EUR',
  '€-': 'EUR',
};

const CURRENCY_KEYWORDS = Object.keys(CURRENCY_MAP);

const STOP_WORDS = new Set([
  'sam', 'si', 'je', 'su', 'i', 'a', 'ali', 'ili', 'to', 'taj', 'ta', 'ovo', 'ovaj',
  'on', 'ona', 'ono', 'oni', 'mi', 'ti', 'vi', 'we', 'you', 'it', 'the', 'in', 'at',
  'bio', 'bila', 'bilo', 'bio sam', 'bila sam', 'kupio', 'kupila', 'kupili', 'uzeo',
  'uzela', 'platio', 'platila', 'dao', 'dala', 'dao sam', 'dala sam', 'treba', 'trebao',
  'trebala', 'hoću', 'hocu', 'želim', 'zelim', 'može', 'moze', 'moći', 'moc', 'treba',
  'dan', 'danas', 'sada', 'sad', 'odmah', 'evo', 'eto', 'e', 'pa', ' dobro', 'lep',
  'lepo', 'lepa', 'baš', 'bas', 'zaista', 'zaisto', 'valjda', 'možda', 'mozda',
  'više', 'vise', 'manje', 'još', 'jos', 'opet', 'opet', 'opet', 'još jednom',
  'hvala', 'molim', 'please', 'thank', 'thanks',
]);

function normalizeSerbianText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ć/g, 'c')
    .replace(/č/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'dj')
    .replace(/Đ/g, 'Dj')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCurrency(text: string): { currency: string; confidence: number } {
  const normalized = normalizeSerbianText(text);
  
  for (const keyword of CURRENCY_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase())) {
      return { currency: CURRENCY_MAP[keyword.toLowerCase()], confidence: 0.95 };
    }
  }
  
  const dollarSigns = (text.match(/\$/g) || []).length;
  const euroSigns = (text.match(/€/g) || []).length;
  
  if (dollarSigns > 0 && euroSigns === 0) {
    return { currency: 'USD', confidence: 0.8 };
  }
  if (euroSigns > 0) {
    return { currency: 'EUR', confidence: 0.8 };
  }
  
  return { currency: 'RSD', confidence: 0.3 };
}

function extractNumbers(text: string): { amount: number | null; confidence: number; remaining: string } {
  const normalized = normalizeSerbianText(text);
  
  const numberWordToDigit: Record<string, number> = {
    'jedan': 1, 'jedna': 1, 'jedno': 1,
    'dva': 2, 'dve': 2, 'tri': 3, 'četiri': 4, 'cetiri': 4,
    'pet': 5, 'šest': 6, 'sest': 6, 'sedam': 7, 'osam': 8, 'devet': 9, 'deset': 10,
    'jedanaest': 11, 'dvanaest': 12, 'trinaest': 13, 'četrnaest': 14, 'petnaest': 15,
    'šesnaest': 16, 'sedamnaest': 17, 'osamnaest': 18, 'devetnaest': 19, 'dvadeset': 20,
    'stotine': 100, 'hiljadu': 1000, 'hiljade': 1000, 'tisuću': 1000,
  };
  
  let processedText = normalized;
  for (const [word, num] of Object.entries(numberWordToDigit)) {
    processedText = processedText.replace(new RegExp(`\\b${word}\\b`, 'g'), String(num));
  }
  
  const patterns = [
    /(\d{1,3}(?:\s?\d{3})*(?:\.\d{2})?)/g,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    /(\d+)(?:\.\d{1,2})?(?=\s*(?:din|dinara|rsd|eur|eura|dol|dolara|$|€))/gi,
  ];
  
  const numbers: number[] = [];
  
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, 'gi');
    while ((match = regex.exec(processedText)) !== null) {
      const numStr = match[1].replace(/[\s,]/g, '.');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && num < 10000000) {
        numbers.push(num);
      }
    }
  }
  
  if (numbers.length === 0) {
    return { amount: null, confidence: 0, remaining: processedText };
  }
  
  const likelyPrices = numbers.filter(n => n >= 5 && n <= 50000);
  
  let amount: number;
  let confidence: number;
  
  if (numbers.length === 1) {
    amount = numbers[0];
    confidence = numbers[0] >= 10 && numbers[0] <= 10000 ? 0.9 : 0.5;
  } else if (likelyPrices.length === 1) {
    amount = likelyPrices[0];
    confidence = 0.85;
  } else if (likelyPrices.length > 1) {
    amount = Math.max(...likelyPrices);
    confidence = 0.75;
  } else {
    amount = Math.max(...numbers);
    confidence = 0.4;
  }
  
  const amountPattern = new RegExp(`\\b${amount}\\b`, 'g');
  const remaining = processedText.replace(amountPattern, '').replace(/\d+[\.,]?\d*/, '').trim();
  
  return { amount, confidence, remaining };
}

function extractMerchant(text: string): { merchant: string; confidence: number; needsClarification: boolean } {
  const normalized = normalizeSerbianText(text);
  
  const cleanedText = normalized
    .replace(/\b(kupio|kupila|kupili|kupio sam|kupila sam)\b/g, '')
    .replace(/\b(bio|bila|bilo)\b/g, '')
    .replace(/\b(je|su|i|a|ali|ili|to|taj|ta|ovo|ovaj)\b/g, ' ')
    .replace(/\b(za|na|u|od|sa|s|do)\b/g, ' ')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  let bestMatch = { merchant: '', confidence: 0 };
  
  for (const { pattern, merchant, weight } of MERCHANT_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(cleanedText)) {
      if (weight > bestMatch.confidence) {
        bestMatch = { merchant, confidence: weight };
      }
    }
  }
  
  if (!bestMatch.merchant) {
    const words = cleanedText.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
    
    if (words.length > 0) {
      const capitalized = words.slice(0, 2).join(' ');
      const merchant = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
      
      return {
        merchant: merchant || '',
        confidence: 0.4,
        needsClarification: true,
      };
    }
    
    return { merchant: '', confidence: 0, needsClarification: true };
  }
  
  return {
    merchant: bestMatch.merchant,
    confidence: bestMatch.confidence,
    needsClarification: bestMatch.confidence < CONFIDENCE_THRESHOLD,
  };
}

function parseMultipleItems(text: string): VoiceExpenseItem[] {
  const items: VoiceExpenseItem[] = [];
  const normalized = normalizeSerbianText(text);
  
  const itemSeparators = /[,](?:\s*)|(?:\s+i\s+)|(?:\s+takođe\s+)|(?:\s+takodje\s+)|(?:\s+takođe\s+)|(?:\s+pa\s+)|(?:\s+zatim\s+)|(?:\s+onda\s+)/gi;
  
  let segments = normalized.split(itemSeparators).filter(s => s.trim().length > 1);
  
  if (segments.length <= 1) {
    const simpleSeparators = /\s+i\s+/gi;
    segments = normalized.split(simpleSeparators).filter(s => s.trim().length > 1);
  }
  
  if (segments.length === 0) {
    segments.push(normalized);
  }
  
  const { amount: totalAmount } = extractNumbers(normalized);
  const { currency } = extractCurrency(normalized);
  
  const hasSingleAmount = totalAmount !== null && segments.length > 1;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const { amount: segmentAmount, remaining } = extractNumbers(segment);
    
    let itemName = remaining
      .replace(/\b(kupio|kupila|kupili|platio|platila|dao|dala)\b/g, '')
      .replace(/\b(za|na|u|od|sa)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = itemName.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
    itemName = words.slice(0, 4).join(' ');
    
    let finalAmount: number | null = segmentAmount;
    
    if (hasSingleAmount && finalAmount === null) {
      finalAmount = Math.round(totalAmount! / segments.length);
      if (i === segments.length - 1) {
        finalAmount = totalAmount! - (Math.round(totalAmount! / segments.length) * (segments.length - 1));
      }
    }
    
    if (itemName.length < 2 && finalAmount === null) {
      continue;
    }
    
    if (itemName.length < 2) {
      itemName = 'Stavka';
    }
    
    const capitalized = itemName.charAt(0).toUpperCase() + itemName.slice(1);
    
    items.push({
      id: crypto.randomUUID(),
      name: capitalized,
      amount: finalAmount,
      currency: currency || 'RSD',
    });
  }
  
  return items;
}

function calculateItemsConfidence(items: VoiceExpenseItem[]): number {
  if (items.length === 0) return 0;
  
  let totalConf = 0;
  
  for (const item of items) {
    let itemConf = 0.5;
    
    if (item.name && item.name.length > 2) {
      itemConf += 0.25;
    }
    
    if (item.amount !== null && item.amount > 0) {
      itemConf += 0.2;
    }
    
    if (item.currency) {
      itemConf += 0.05;
    }
    
    totalConf += Math.min(itemConf, 1);
  }
  
  return totalConf / items.length;
}

export function parseMerchantWithConfidence(transcript: string): ParsedMerchantResult {
  if (!transcript || transcript.trim() === '') {
    return {
      success: false,
      merchant: '',
      currency: 'RSD',
      confidence: 0,
      needsClarification: true,
      clarificationReason: 'No speech detected',
    };
  }
  
  const { merchant, confidence } = extractMerchant(transcript);
  const { currency } = extractCurrency(transcript);
  
  if (!merchant) {
    return {
      success: false,
      merchant: '',
      currency,
      confidence: 0,
      needsClarification: true,
      clarificationReason: 'Could not understand merchant name',
    };
  }
  
  const finalConfidence = confidence * (currency === 'RSD' ? 1.0 : 0.9);
  
  return {
    success: true,
    merchant,
    currency,
    confidence: finalConfidence,
    needsClarification: finalConfidence < LOW_CONFIDENCE_THRESHOLD,
    clarificationReason: finalConfidence < LOW_CONFIDENCE_THRESHOLD 
      ? 'Could not clearly identify the merchant' 
      : undefined,
  };
}

export function parseItemsWithConfidence(transcript: string, existingCurrency: string = 'RSD'): ParsedItemResult {
  if (!transcript || transcript.trim() === '') {
    return {
      success: false,
      items: [],
      currency: existingCurrency,
      confidence: 0,
      needsClarification: true,
      partialItems: [],
    };
  }
  
  const { currency: detectedCurrency } = extractCurrency(transcript);
  const currency = detectedCurrency || existingCurrency;
  
  const items = parseMultipleItems(transcript);
  
  if (items.length === 0) {
    return {
      success: false,
      items: [],
      currency,
      confidence: 0,
      needsClarification: true,
      clarificationType: 'item',
      partialItems: [],
    };
  }
  
  const confidence = calculateItemsConfidence(items);
  
  const needsClarification = 
    confidence < LOW_CONFIDENCE_THRESHOLD ||
    items.some(item => item.amount === null) ||
    items.some(item => item.name.length < 2);
  
  let clarificationType: 'amount' | 'item' | 'currency' | undefined;
  
  if (items.some(item => item.amount === null)) {
    clarificationType = 'amount';
  } else if (items.some(item => item.name.length < 2)) {
    clarificationType = 'item';
  }
  
  const partialItems = items.filter(item => item.amount === null);
  
  return {
    success: items.length > 0,
    items,
    currency,
    confidence,
    needsClarification,
    clarificationType,
    partialItems,
  };
}

export function parseConfirmation(transcript: string): { confirmed: boolean; editField?: string; newValue?: string } {
  if (!transcript || transcript.trim() === '') {
    return { confirmed: false };
  }
  
  const normalized = normalizeSerbianText(transcript);
  
  const positivePatterns = [
    /\b(da|da da|jeste|ok|okay|ok je|correct|ispravno|potvrđujem|potvrdujem|sigurno|definitivno|pravo|točno|tacno)\b/i,
    /\b(yes|yep|yeah)\b/i,
  ];
  
  const negativePatterns = [
    /\b(ne|nije|no|nope|wrong|greška|greska|pogrešno|pogresno|poništi|ponisti|otkaži|otkazi)\b/i,
    /\b(nah|not really)\b/i,
  ];
  
  const editPatterns = [
    /\b(promeni|promena|izmeni|izmeni|izmeniću|izmenicu|želim|promenicu)\b.*(prodavnicu|stavku|iznos|cenu|merchant|item|amount)/i,
    /\b(merchant|prodavnicu)\b.*\b(promeni|promena)\b/i,
    /\b(stavku|item)\b.*\b(promeni|promena)\b/i,
  ];
  
  for (const pattern of negativePatterns) {
    if (pattern.test(normalized)) {
      return { confirmed: false };
    }
  }
  
  for (const pattern of positivePatterns) {
    if (pattern.test(normalized)) {
      return { confirmed: true };
    }
  }
  
  for (const pattern of editPatterns) {
    if (pattern.test(normalized)) {
      if (normalized.includes('prodavnic') || normalized.includes('merchant')) {
        return { confirmed: false, editField: 'merchant' };
      }
      if (normalized.includes('stavk') || normalized.includes('item')) {
        return { confirmed: false, editField: 'items' };
      }
      return { confirmed: false, editField: 'amount' };
    }
  }
  
  return { confirmed: false };
}

export function createClarificationQuestion(
  type: ClarificationQuestion['type'],
  currentValue: string | null
): ClarificationQuestion {
  return {
    type,
    question: CLARIFICATION_PROMPTS[type](currentValue || ''),
    field: type,
    currentValue,
  };
}

export function calculateTotal(items: VoiceExpenseItem[]): number | null {
  const amounts = items.filter(i => i.amount !== null).map(i => i.amount!);
  if (amounts.length === 0) return null;
  return amounts.reduce((a, b) => a + b, 0);
}

export function inferCategoryFromItems(items: VoiceExpenseItem[]): string | null {
  const categoryKeywords: Record<string, string[]> = {
    'Food & Drinks': [
      'kafa', 'cappuccino', 'latte', 'espresso', 'kafe',
      'ručak', 'rucak', 'doručak', 'večera', 'pizza', 'hamburger', 'burger', 
      'sendvič', 'kebab', 'burek', 'kifle', 'pogača',
      'sok', 'voda', 'čaj', 'pivo', 'vino',
      'hleb', 'mleko', 'jaja', 'sir', 'jogurt',
      'voće', 'povrće', 'meso', 'riba',
    ],
    'Transportation': [
      'gorivo', 'benzin', 'dizel', 'nafta', 'gas',
      'parking', 'taxi', 'uber', 'autobus', 'voz',
      'gume', 'ulje', 'auto', 'registracija',
    ],
    'Entertainment': [
      'netflix', 'spotify', 'youtube', 'hbo', 'disney',
      'bioskop', 'film', 'konzert', 'festival',
      'igra', 'game', 'knjiga',
    ],
    'Shopping': [
      'odežda', 'odeca', 'obuca', 'elektronika', 'telefon',
      'apoteka', 'lek', 'poklon', 'namestaj',
    ],
    'Utilities': [
      'struja', 'gas', 'grejanje', 'voda',
      'internet', 'wifi', 'telefon', 'mts', 'telenor',
    ],
  };
  
  const allText = items.map(i => i.name.toLowerCase()).join(' ');
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        return category;
      }
    }
  }
  
  return null;
}
