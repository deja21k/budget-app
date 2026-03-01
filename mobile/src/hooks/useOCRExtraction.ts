import { useState, useCallback } from 'react';
import type { ReceiptData, ReceiptItem } from '../types/scanner';

interface OCRResult {
  text: string;
  confidence: number;
  blocks: TextBlock[];
}

interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface UseOCRExtractionReturn {
  isProcessing: boolean;
  receiptData: ReceiptData | null;
  error: string | null;
  extractFromImage: (imageUri: string) => Promise<ReceiptData | null>;
  extractFromText: (rawText: string) => Promise<ReceiptData | null>;
  reset: () => void;
}

const GLM5_EXTRACTION_PROMPT = `Extract receipt information from the following OCR text and return a JSON object with this exact structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "total": number,
  "currency": "USD/EUR/etc",
  "items": [{"name": "item", "price": number, "quantity": number}],
  "confidence": 0.0-1.0
}

OCR Text:
`;

export function useOCRExtraction(apiKey?: string): UseOCRExtractionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const extractFromText = useCallback(
    async (rawText: string): Promise<ReceiptData | null> => {
      setIsProcessing(true);
      setError(null);
      
      try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey || process.env.GLM_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'glm-5',
            messages: [
              {
                role: 'system',
                content: 'You are a receipt data extraction assistant. Extract structured data from OCR text and return only valid JSON.',
              },
              {
                role: 'user',
                content: GLM5_EXTRACTION_PROMPT + rawText,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });
        
        if (!response.ok) {
          throw new Error('GLM-5 API request failed');
        }
        
        const result = await response.json();
        const content = result.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('No response from GLM-5');
        }
        
        const parsed: ReceiptData = JSON.parse(content);
        
        const validatedData: ReceiptData = {
          merchant: parsed.merchant || 'Unknown Merchant',
          date: parsed.date || new Date().toISOString().split('T')[0],
          total: typeof parsed.total === 'number' ? parsed.total : 0,
          currency: parsed.currency || 'USD',
          items: validateItems(parsed.items),
          confidence: parsed.confidence || 0.5,
        };
        
        setReceiptData(validatedData);
        setIsProcessing(false);
        return validatedData;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsProcessing(false);
        return null;
      }
    },
    [apiKey]
  );
  
  const extractFromImage = useCallback(
    async (imageUri: string): Promise<ReceiptData | null> => {
      setIsProcessing(true);
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'receipt.jpg',
        });
        
        const ocrResponse = await fetch('https://api.example.com/ocr', {
          method: 'POST',
          body: formData,
        });
        
        if (!ocrResponse.ok) {
          throw new Error('OCR processing failed');
        }
        
        const ocrResult: OCRResult = await ocrResponse.json();
        
        return await extractFromText(ocrResult.text);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsProcessing(false);
        return null;
      }
    },
    [extractFromText]
  );
  
  const reset = useCallback(() => {
    setIsProcessing(false);
    setReceiptData(null);
    setError(null);
  }, []);
  
  return {
    isProcessing,
    receiptData,
    error,
    extractFromImage,
    extractFromText,
    reset,
  };
}

function validateItems(items: unknown): ReceiptItem[] | undefined {
  if (!Array.isArray(items)) return undefined;
  
  return items
    .filter((item): item is ReceiptItem => 
      typeof item === 'object' &&
      item !== null &&
      typeof item.name === 'string' &&
      typeof item.price === 'number'
    )
    .map(item => ({
      name: item.name,
      price: item.price,
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
    }));
}
