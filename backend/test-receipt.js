const { ReceiptParser } = require('./dist/services/receipt-parser.service');

// Simulated OCR output from the Serbian receipt
const sampleText = `ФИСКАЛНИ РАЧУН
101642372
DOOMSA DOO NOVI SAD
11131808-ПИБ
АЛЕКСЕ ШАНТИЋА 40
НОВИ САД

Касир Вокић Marko
ЕСИР број 45/2.0

ПРОМЕТ - ПРОДАЈА
Артикли

Назив Цена Кол. Укупно
Nadgradni LED Panel (HighQuality) 24W
Округли (6000 K) / LPN3-2460HQ (kom) (B)
1.273,60 1 1.273,60

Укупан износ рачуна 1.273,60
Готовина: 2.000,00
Повраћај: 726,40

Ознака Име Стопа Порез
B О-ПДВ 20.00% 212,27

Укупан износ пореза 212,27
Повраћај: 726,40

ПФР време 31.03.2023. 17:38:38
ПФР број рачуна PKRRE8XZ-PKRRE8XZ-31707
Бројач рачуна 29430/31707`;

const parser = new ReceiptParser();
const result = parser.parse(sampleText, 85);

console.log('\n=== PARSED RECEIPT ===');
console.log('Store:', result.storeName);
console.log('Date:', result.date);
console.log('Total:', result.total);
console.log('Tax:', result.tax);
console.log('Currency:', result.currency);
console.log('PIB:', result.pib);
console.log('Fiscal Code:', result.fiscalCode);
console.log('Line Items:', result.lineItems.length);
console.log('\nWarnings:', result.warnings);
