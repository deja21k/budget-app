"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptParser = void 0;
class ReceiptParser {
    constructor() {
        this.warnings = [];
    }
    parse(text, confidence) {
        this.warnings = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const isSerbianReceipt = this.isSerbianFiscalReceipt(lines, text);
        console.log('Is Serbian receipt:', isSerbianReceipt);
        const storeName = this.extractStoreName(lines, isSerbianReceipt);
        const date = this.extractDate(text);
        const currency = isSerbianReceipt ? 'RSD' : this.detectCurrency(text);
        const fiscalCode = this.extractFiscalCode(text);
        const pib = this.extractPIB(text);
        const { total, subtotal, tax } = this.extractAmounts(lines, isSerbianReceipt);
        const lineItems = this.extractLineItems(lines, isSerbianReceipt);
        if (!storeName) {
            this.warnings.push('Could not confidently identify store name');
        }
        if (!date) {
            this.warnings.push('Could not find valid date');
        }
        if (!total) {
            this.warnings.push('Could not find total amount');
        }
        return {
            storeName,
            date,
            total,
            subtotal,
            tax,
            lineItems,
            rawText: text,
            confidence,
            warnings: this.warnings,
            currency,
            fiscalCode,
            pib,
        };
    }
    isSerbianFiscalReceipt(lines, text) {
        const textLower = text.toLowerCase();
        // US format markers - very strong indicators
        const hasUSDate = /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text);
        const hasDollar = /\$[\d,]+\.\d{2}/.test(text);
        // If US format is present, it's not Serbian
        if (hasUSDate || hasDollar) {
            return false;
        }
        const cyrillicMarkers = [
            'фискални рачун', 'фискални', 'рачун', 'промет', 'продаја',
            'пиб', 'купц', 'плаћање',
        ];
        const latinSerbianMarkers = [
            'fiskalni racun', 'fiskalni', 'racun', 'promet', 'prodaja', 'pib',
        ];
        const hasDOO = /\b(DOO|DOO)\b/i.test(text);
        // Need substantial Cyrillic text, not just OCR noise
        const cyrillicChars = text.match(/[\u0400-\u04FF]/g) || [];
        const hasStrongCyrillic = cyrillicChars.length > 15;
        const hasSerbianFormat = /\d{1,3}\.\d{3},\d{2}/.test(text);
        const hasRSD = /\b(rs[dд]|дин)\b/i.test(text);
        const cyrillicMatch = cyrillicMarkers.some(marker => textLower.includes(marker));
        const latinMatch = latinSerbianMarkers.some(marker => textLower.includes(marker));
        return hasStrongCyrillic || hasSerbianFormat || hasRSD || hasDOO || cyrillicMatch || latinMatch;
    }
    extractStoreName(lines, isSerbianReceipt) {
        if (isSerbianReceipt) {
            return this.extractSerbianStoreName(lines);
        }
        return this.extractGenericStoreName(lines);
    }
    extractSerbianStoreName(lines) {
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (/^(фискални|фиск|рачун|fiskalni|fisk|racun|vreme)/i.test(line))
                continue;
            if (/^\d+$/.test(line))
                continue;
            if (/\b(DOO|DOO)\b/i.test(line) && line.length >= 5 && line.length <= 60) {
                return line.replace(/\s+/g, ' ').trim();
            }
            if (/^[A-ZА-Я][A-Za-zА-Яа-я0-9\s&'\-\.]{3,50}$/.test(line)) {
                if (!this.isLikelyNoise(line) && line.length >= 4) {
                    return line.trim();
                }
            }
        }
        for (const line of lines.slice(0, 8)) {
            if (line.length >= 4 && line.length <= 50 && !this.isLikelyNoise(line)) {
                return line.trim();
            }
        }
        return null;
    }
    extractGenericStoreName(lines) {
        const commonStoreKeywords = [
            'walmart', 'target', 'costco', 'whole foods', 'trader joe', 'kroger', 'safeway',
            'publix', 'aldi', 'walgreens', 'cvs', 'rite aid', 'home depot', 'lowe',
            'best buy', 'amazon', 'starbucks', 'mcdonald', 'subway', 'chipotle',
            'shell', 'exxon', 'chevron', 'bp', 'mobil', 'wegmans',
        ];
        // Skip lines that look like OCR noise (starting with digits)
        const cleanLines = lines.filter(line => !/^\d/.test(line));
        for (let i = 0; i < Math.min(8, cleanLines.length); i++) {
            const line = cleanLines[i].toLowerCase();
            if (line.length < 3 || line.length > 50)
                continue;
            for (const keyword of commonStoreKeywords) {
                if (line.includes(keyword.toLowerCase())) {
                    return cleanLines[i].trim();
                }
            }
            if (/^[A-Z][A-Za-z0-9\s&'\-\.]{2,40}$/.test(cleanLines[i]) && !this.isLikelyNoise(cleanLines[i])) {
                return cleanLines[i].trim();
            }
        }
        return cleanLines.length > 0 ? cleanLines[0].substring(0, 30).trim() : null;
    }
    isLikelyNoise(line) {
        const noisePatterns = [
            /^\d+$/, /^\d{2}\/\d{2}\/\d{2,4}$/, /^\d{2}\.\d{2}\.\d{2,4}$/,
            /^\$?\d+[\.,]\d{2}$/, /^(tel|phone|fax|www|http|email|@)/i,
            /^(date|time|order|receipt|invoice|#)/i,
        ];
        return noisePatterns.some(pattern => pattern.test(line));
    }
    extractDate(text) {
        const serbianDatePattern = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
        const serbianMatch = text.match(serbianDatePattern);
        if (serbianMatch) {
            const day = parseInt(serbianMatch[1]);
            const month = parseInt(serbianMatch[2]);
            const year = parseInt(serbianMatch[3]);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2030) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
        const datePatterns = [
            { regex: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, format: 'MDY' },
            { regex: /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, format: 'YMD' },
        ];
        for (const { regex, format } of datePatterns) {
            const match = text.match(regex);
            if (match) {
                try {
                    let year, month, day;
                    switch (format) {
                        case 'MDY':
                            month = parseInt(match[1]) - 1;
                            day = parseInt(match[2]);
                            year = parseInt(match[3]);
                            if (year < 100)
                                year += 2000;
                            break;
                        case 'YMD':
                            year = parseInt(match[1]);
                            month = parseInt(match[2]) - 1;
                            day = parseInt(match[3]);
                            break;
                    }
                    const date = new Date(year, month, day);
                    if (date.getFullYear() >= 2000 && date.getFullYear() <= 2030) {
                        return date.toISOString().split('T')[0];
                    }
                }
                catch {
                    continue;
                }
            }
        }
        return null;
    }
    extractPIB(text) {
        const pibPatterns = [
            /(?:PIB|пИБ|пиб)[\s:\-]*(\d{8,9})/i,
        ];
        for (const pattern of pibPatterns) {
            const match = text.match(pattern);
            if (match)
                return match[1];
        }
        return null;
    }
    detectCurrency(text) {
        const textLower = text.toLowerCase();
        if (/\$[\d,]+\.\d{2}/.test(text)) {
            return 'USD';
        }
        const rsdPatterns = [/\bрсд\b/i, /\brsd\b/i, /\bдин\b/i, /\bdin\b/i];
        for (const pattern of rsdPatterns) {
            if (pattern.test(textLower))
                return 'RSD';
        }
        if (/\beur\b/i.test(textLower) || /\b€/.test(text))
            return 'EUR';
        if (/\bgbp\b/i.test(textLower) || /£\d/.test(text))
            return 'GBP';
        return 'USD';
    }
    extractFiscalCode(text) {
        const patterns = [
            /(?:Број рачуна|Broj racuna)[\s:]*([A-Z0-9\-]+)/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match)
                return match[1];
        }
        return null;
    }
    extractAmounts(lines, isSerbianReceipt) {
        let total = null;
        let subtotal = null;
        let tax = null;
        const allText = lines.join(' ');
        if (isSerbianReceipt) {
            const totalPatterns = [
                /(?:Укупан износ рачуна|Ukupan iznos racuna)[\s:]*([\d\.]+,\d{2})/i,
                /(?:Уukupно|Ukupno)[\s:]*([\d\.]+,\d{2})/i,
                /(?:За плаћање|Za placanje)[\s:]*([\d\.]+,\d{2})/i,
            ];
            const taxPatterns = [
                /(?:Порез|Porez)[\s:]*([\d\.]+,\d{2})/i,
            ];
            for (const pattern of totalPatterns) {
                const match = allText.match(pattern);
                if (match) {
                    total = this.parseSerbianAmount(match[1]);
                    if (total !== null && total > 0)
                        break;
                }
            }
            for (const pattern of taxPatterns) {
                const match = allText.match(pattern);
                if (match) {
                    tax = this.parseSerbianAmount(match[1]);
                    if (tax !== null && tax >= 0)
                        break;
                }
            }
            if (!total) {
                const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;
                const matches = [...allText.matchAll(amountPattern)];
                if (matches.length > 0) {
                    const amounts = matches
                        .map(m => this.parseSerbianAmount(m[1]))
                        .filter((a) => a !== null && a > 0);
                    if (amounts.length > 0) {
                        total = Math.max(...amounts);
                    }
                }
            }
        }
        else {
            // US/International format
            const totalPatterns = [
                /(?:TOTAL|Total|total)[\s:]*\$?([\d,]+\.\d{2})/i,
                /(?:AMOUNT\s*DUE|Amount\s*Due)[\s:]*\$?([\d,]+\.\d{2})/i,
                /(?:GRAND\s*TOTAL)[\s:]*\$?([\d,]+\.\d{2})/i,
                /(?:ТОТАГ|TOTAЛ|TOTAl)[\s\.]*([\d,]+\.\d{2})/i,
            ];
            const taxPatterns = [
                /(?:TAX|Tax)[\s:]*[\$]?([\d,]+\.\d{2})/i,
                /(?:SALES?\s*TAX)[\s:]*[\$]?([\d,]+\.\d{2})/i,
                /Тах\s*\(8\.875\%\)\D*(\d+\.\d{2})/i,
                /\(8\.875\%\)\D*(\d+\.\d{2})/i,
            ];
            for (const pattern of totalPatterns) {
                const match = allText.match(pattern);
                if (match) {
                    total = parseFloat(match[1].replace(/,/g, ''));
                    if (!isNaN(total) && total > 0)
                        break;
                }
            }
            for (const pattern of taxPatterns) {
                const match = allText.match(pattern);
                if (match) {
                    tax = parseFloat(match[1].replace(/,/g, ''));
                    if (!isNaN(tax) && tax >= 0)
                        break;
                }
            }
            if (!total) {
                const amountPattern = /\b(\d+\.\d{2})\b/g;
                const matches = [...allText.matchAll(amountPattern)];
                if (matches.length > 0) {
                    const amounts = matches
                        .map(m => parseFloat(m[1]))
                        .filter((a) => !isNaN(a) && a > 0);
                    if (amounts.length > 0) {
                        total = Math.max(...amounts);
                    }
                }
            }
        }
        return { total, subtotal, tax };
    }
    parseSerbianAmount(amountStr) {
        if (!amountStr)
            return null;
        const normalized = amountStr.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? null : parsed;
    }
    extractLineItems(lines, isSerbianReceipt) {
        const items = [];
        if (isSerbianReceipt) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (/^(фискални|рачун|уukupно|порез|пдв|датум|време)/i.test(line))
                    continue;
                if (line.length < 5 || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(line))
                    continue;
                const priceMatch = line.match(/^([\w\s\-\(\)/\.\u0400-\u04FF]+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/);
                if (priceMatch) {
                    const description = priceMatch[1].trim();
                    const price = this.parseSerbianAmount(priceMatch[2]);
                    if (price !== null && price > 0 && description.length > 2 && !this.isLikelyNoise(description)) {
                        items.push({ description, price });
                    }
                }
            }
        }
        else {
            for (const line of lines) {
                const match = line.match(/^([\w\s\-&'\.]{3,40})\s+([$]?[\d,]+\.\d{2})\s*$/);
                if (match) {
                    const description = match[1].trim();
                    const price = parseFloat(match[2].replace(/[$,]/g, ''));
                    if (price > 0 && description.length > 2) {
                        items.push({ description, price });
                    }
                }
            }
        }
        return items.slice(0, 20);
    }
}
exports.ReceiptParser = ReceiptParser;
//# sourceMappingURL=receipt-parser.service.js.map