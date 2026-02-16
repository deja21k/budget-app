const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const canvas = createCanvas(600, 800);
const ctx = canvas.getContext('2d');

ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 600, 800);

ctx.fillStyle = 'black';
ctx.font = 'bold 36px Arial';
ctx.fillText('WHOLE FOODS MARKET', 120, 80);

ctx.font = '18px Arial';
ctx.fillText('123 Organic Avenue', 220, 110);
ctx.fillText('New York, NY 10001', 225, 135);

ctx.font = '16px Arial';
ctx.fillText('Date: 02/08/2026', 50, 180);
ctx.fillText('Time: 3:45 PM', 400, 180);
ctx.fillText('Register: 5', 400, 200);

ctx.beginPath();
ctx.moveTo(50, 220);
ctx.lineTo(550, 220);
ctx.stroke();

ctx.font = 'bold 20px Arial';
ctx.fillText('Item', 50, 250);
ctx.fillText('Price', 450, 250);

ctx.font = '18px Arial';
let y = 290;
const items = [
  ['Organic Bananas (2 lb)', '$3.49'],
  ['Almond Milk', '$4.29'],
  ['Avocados (3)', '$5.99'],
  ['Whole Grain Bread', '$5.49'],
  ['Greek Yogurt', '$6.99'],
];

items.forEach(([item, price]) => {
  ctx.fillText(item, 50, y);
  ctx.fillText(price, 480, y);
  y += 35;
});

ctx.beginPath();
ctx.moveTo(50, y + 10);
ctx.lineTo(550, y + 10);
ctx.stroke();

y += 40;
ctx.fillText('Subtotal', 350, y);
ctx.fillText('$26.25', 480, y);

y += 30;
ctx.fillText('Tax (8.875%)', 350, y);
ctx.fillText('$2.33', 480, y);

y += 30;
ctx.font = 'bold 24px Arial';
ctx.fillText('TOTAL', 350, y);
ctx.fillText('$28.58', 470, y);

y += 50;
ctx.font = '16px Arial';
ctx.fillText('Thank you for shopping at Whole Foods!', 150, y);

const buffer = canvas.toBuffer('image/jpeg');
fs.writeFileSync(path.join(__dirname, 'test-receipt.jpg'), buffer);
console.log('Test receipt image created: test-receipt.jpg');