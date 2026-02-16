import { initializeDatabase, getDatabase, closeDatabase } from '../config/database';
import { CategoryService } from '../services/category.service';
import { TransactionService } from '../services/transaction.service';
import { ReceiptService } from '../services/receipt.service';

async function seed() {
  console.log('Starting database seed...');
  
  initializeDatabase();
  
  const categoryService = new CategoryService();
  const transactionService = new TransactionService();
  const receiptService = new ReceiptService();

  const existingCategories = categoryService.findAll();
  if (existingCategories.length > 0) {
    console.log('Database already has data, skipping seed.');
    closeDatabase();
    return;
  }

  console.log('Creating categories...');
  
  const incomeCategories = [
    { name: 'Salary', type: 'income' as const, color: '#10B981' },
    { name: 'Freelance', type: 'income' as const, color: '#34D399' },
    { name: 'Investments', type: 'income' as const, color: '#6EE7B7' },
    { name: 'Gifts', type: 'income' as const, color: '#A7F3D0' },
  ];

  const expenseCategories = [
    { name: 'Rent', type: 'expense' as const, color: '#EF4444', is_fixed: true },
    { name: 'Groceries', type: 'expense' as const, color: '#F59E0B', budget_limit: 500 },
    { name: 'Utilities', type: 'expense' as const, color: '#F97316', is_fixed: true },
    { name: 'Transportation', type: 'expense' as const, color: '#8B5CF6', budget_limit: 200 },
    { name: 'Dining Out', type: 'expense' as const, color: '#EC4899', budget_limit: 300 },
    { name: 'Entertainment', type: 'expense' as const, color: '#6366F1', budget_limit: 150 },
    { name: 'Shopping', type: 'expense' as const, color: '#14B8A6', budget_limit: 400 },
    { name: 'Healthcare', type: 'expense' as const, color: '#06B6D4' },
    { name: 'Insurance', type: 'expense' as const, color: '#84CC16', is_fixed: true },
    { name: 'Subscriptions', type: 'expense' as const, color: '#A855F7', budget_limit: 100 },
  ];

  const createdCategories: any[] = [];
  
  for (const cat of [...incomeCategories, ...expenseCategories]) {
    const created = categoryService.create(cat);
    createdCategories.push(created);
    console.log(`  Created: ${created.name} (${created.type})`);
  }

  const salaryCategory = createdCategories.find(c => c.name === 'Salary');
  const freelanceCategory = createdCategories.find(c => c.name === 'Freelance');
  const rentCategory = createdCategories.find(c => c.name === 'Rent');
  const groceriesCategory = createdCategories.find(c => c.name === 'Groceries');
  const utilitiesCategory = createdCategories.find(c => c.name === 'Utilities');
  const transportCategory = createdCategories.find(c => c.name === 'Transportation');
  const diningCategory = createdCategories.find(c => c.name === 'Dining Out');
  const entertainmentCategory = createdCategories.find(c => c.name === 'Entertainment');
  const shoppingCategory = createdCategories.find(c => c.name === 'Shopping');

  console.log('\nCreating transactions...');

  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const transactions = [
    { type: 'income' as const, amount: 5000, category_id: salaryCategory.id, description: 'Monthly salary', merchant: 'Employer Inc.', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), is_recurring: true },
    { type: 'income' as const, amount: 1200, category_id: freelanceCategory.id, description: 'Web development project', merchant: 'Client ABC', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 5)) },
    { type: 'expense' as const, amount: 1500, category_id: rentCategory.id, description: 'Monthly rent', merchant: 'Property Management', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), is_recurring: true },
    { type: 'expense' as const, amount: 450.50, category_id: groceriesCategory.id, description: 'Weekly groceries', merchant: 'Whole Foods', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 3)) },
    { type: 'expense' as const, amount: 120.30, category_id: groceriesCategory.id, description: 'Grocery run', merchant: 'Trader Joe\'s', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 7)) },
    { type: 'expense' as const, amount: 85.00, category_id: utilitiesCategory.id, description: 'Electric bill', merchant: 'Power Company', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 5)) },
    { type: 'expense' as const, amount: 45.00, category_id: utilitiesCategory.id, description: 'Internet bill', merchant: 'ISP Provider', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 10)) },
    { type: 'expense' as const, amount: 60.00, category_id: transportCategory.id, description: 'Gas refill', merchant: 'Shell Station', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 2)) },
    { type: 'expense' as const, amount: 45.00, category_id: transportCategory.id, description: 'Uber ride', merchant: 'Uber', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 8)) },
    { type: 'expense' as const, amount: 78.50, category_id: diningCategory.id, description: 'Dinner with friends', merchant: 'Local Bistro', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 6)) },
    { type: 'expense' as const, amount: 32.40, category_id: diningCategory.id, description: 'Lunch', merchant: 'Chipotle', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 4)) },
    { type: 'expense' as const, amount: 15.99, category_id: entertainmentCategory.id, description: 'Netflix subscription', merchant: 'Netflix', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), is_recurring: true },
    { type: 'expense' as const, amount: 125.00, category_id: shoppingCategory.id, description: 'New shoes', merchant: 'Nike Store', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 9)) },
    { type: 'expense' as const, amount: 89.99, category_id: shoppingCategory.id, description: 'Office supplies', merchant: 'Staples', date: formatDate(new Date(today.getFullYear(), today.getMonth(), 11)) },
  ];

  for (const trans of transactions) {
    const created = transactionService.create(trans);
    console.log(`  Created: ${trans.description} - $${trans.amount}`);
  }

  console.log('\nCreating sample receipts...');
  
  const receipts = [
    { 
      image_path: '/data/receipts/sample1.jpg', 
      status: 'processed' as const, 
      ocr_confidence: 0.92,
      extracted_merchant: 'Whole Foods Market',
      extracted_amount: 450.50,
      extracted_date: formatDate(new Date(today.getFullYear(), today.getMonth(), 3))
    },
    { 
      image_path: '/data/receipts/sample2.jpg', 
      status: 'processing' as const,
      ocr_confidence: 0.85,
      extracted_merchant: 'Shell',
      extracted_amount: 60.00,
    },
    { 
      image_path: '/data/receipts/sample3.jpg', 
      status: 'failed' as const,
      ocr_confidence: 0.45,
    },
  ];

  for (const receipt of receipts) {
    const created = receiptService.create(receipt);
    console.log(`  Created receipt #${created.id} (${created.status})`);
  }

  const summary = transactionService.getSummary();
  console.log('\n📊 Summary:');
  console.log(`  Total Income: $${summary.total_income.toFixed(2)}`);
  console.log(`  Total Expense: $${summary.total_expense.toFixed(2)}`);
  console.log(`  Net: $${summary.net_amount.toFixed(2)}`);
  console.log(`  Transactions: ${summary.transaction_count}`);

  console.log('\n✅ Seed completed successfully!');
  
  closeDatabase();
}

seed().catch(error => {
  console.error('Seed failed:', error);
  closeDatabase();
  process.exit(1);
});