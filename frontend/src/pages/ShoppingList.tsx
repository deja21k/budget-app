import { useState, useEffect, useCallback } from 'react';
import type { ShoppingListItem, ShoppingListSummary, SpendingPrediction, CreateShoppingListItemInput } from '../types';
import { formatCurrency, getCurrentCurrency } from '../utils/validation';
import { settingsService } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const API_BASE = 'http://localhost:3000/api';

interface StorePrice {
  store: string;
  price: number | null;
  url?: string;
}

interface PricePrediction {
  itemName: string;
  prices: StorePrice[];
  suggestedPrice: number | null;
}

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [summary, setSummary] = useState<ShoppingListSummary | null>(null);
  const [prediction, setPrediction] = useState<SpendingPrediction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<CreateShoppingListItemInput>({
    name: '',
    price: 0,
    quantity: 1,
    importance: 'medium',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricePrediction, setPricePrediction] = useState<PricePrediction | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [actualPrice, setActualPrice] = useState<string>('');
  const currency = getCurrentCurrency();
  const settings = settingsService.getSettings();
  const monthlyBudget = settings.monthlyBudget;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [itemsRes, summaryRes, predictionRes] = await Promise.all([
        fetch(`${API_BASE}/shopping-list`),
        fetch(`${API_BASE}/shopping-list/summary`),
        fetch(`${API_BASE}/shopping-list/prediction?budget=${monthlyBudget}`),
      ]);
      
      if (!itemsRes.ok || !summaryRes.ok || !predictionRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      setItems(await itemsRes.json());
      setSummary(await summaryRes.json());
      setPrediction(await predictionRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load shopping list. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPricePrediction = useCallback(async (name: string) => {
    if (!name.trim() || name.length < 2) {
      setPricePrediction(null);
      return;
    }
    
    setLoadingPrediction(true);
    try {
      const res = await fetch(`${API_BASE}/shopping-list/price-prediction?item=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setPricePrediction(data);
      }
    } catch (err) {
      console.error('Error fetching price prediction:', err);
    } finally {
      setLoadingPrediction(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPricePrediction(newItem.name);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [newItem.name, fetchPricePrediction]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!newItem.name.trim()) {
      setError('Please enter an item name');
      return;
    }
    
    if (newItem.price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/shopping-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add item');
      }
      
      const item = await res.json();
      setItems([item, ...items]);
      setNewItem({ name: '', price: 0, quantity: 1, importance: 'medium', notes: '' });
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      console.error('Error adding item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  const handleToggleComplete = async (id: number) => {
    console.log('Toggling item:', id);
    try {
      const url = `${API_BASE}/shopping-list/${id}/toggle`;
      console.log('Fetching:', url);
      const res = await fetch(url, {
        method: 'PATCH',
      });
      console.log('Response:', res.status);
      
      if (res.ok) {
        const updatedItem = await res.json();
        setItems(items => items.map(item => item.id === id ? updatedItem : item));
        fetchData();
      } else {
        console.error('Failed to toggle:', await res.text());
      }
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/shopping-list/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleUpdateActualPrice = async (id: number) => {
    const price = parseFloat(actualPrice);
    if (isNaN(price) || price <= 0) return;
    
    try {
      const res = await fetch(`${API_BASE}/shopping-list/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_price: price }),
      });
      
      if (res.ok) {
        const updatedItem = await res.json();
        setItems(items.map(item => item.id === id ? updatedItem : item));
        setEditingPriceId(null);
        setActualPrice('');
        fetchData();
      }
    } catch (error) {
      console.error('Error updating actual price:', error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      const res = await fetch(`${API_BASE}/shopping-list/completed/clear`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setItems(items.filter(item => !item.is_completed));
        fetchData();
      }
    } catch (error) {
      console.error('Error clearing completed:', error);
    }
  };

  const importanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const importanceLabel = (importance: string) => {
    switch (importance) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return importance;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shopping List</h1>
          <p className="text-slate-500 dark:text-slate-400">Track items and predict spending</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Item'}
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </Card>
      )}

      {showAddForm && (
        <Card className="p-4">
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Item name (e.g., Milk, Bread)"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Price"
                  value={newItem.price || ''}
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {pricePrediction && pricePrediction.suggestedPrice && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  {loadingPrediction ? 'Searching stores...' : `Tap to select price:`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pricePrediction.prices
                    .filter(p => p.price !== null)
                    .sort((a, b) => (a.price || 0) - (b.price || 0))
                    .map((p, idx) => (
                      <button
                        key={p.store}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, price: p.price || 0 })}
                        className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                          p.price === pricePrediction.suggestedPrice
                            ? 'bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300 font-medium'
                            : idx === 0
                            ? 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500 text-yellow-700 dark:text-yellow-300 font-medium'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                        }`}
                      >
                        <span>{p.store}</span>
                        <span className="font-bold">{p.price?.toLocaleString('sr-RS')} RSD</span>
                        {idx === 0 && <span className="text-xs bg-yellow-500 text-white px-1 rounded">CHEAPEST</span>}
                      </button>
                    ))}
                </div>
                {newItem.price > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Selected: {newItem.price.toLocaleString('sr-RS')} RSD
                  </p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
              <div>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all duration-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-slate-300"
                  value={newItem.importance}
                  onChange={(e) => setNewItem({ ...newItem, importance: e.target.value as 'high' | 'medium' | 'low' })}
                  style={{ height: '48px' }}
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div>
                <Input
                  placeholder="Notes (optional)"
                  value={newItem.notes || ''}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full md:w-auto">
              Add to List
            </Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Items</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary?.total_items || 0}</p>
          <p className="text-xs text-slate-400">{summary?.pending_items || 0} pending</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Price</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary?.total_price || 0, currency)}</p>
          <p className="text-xs text-green-600">{formatCurrency(summary?.pending_price || 0, currency)} remaining</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Prediction</p>
          <p className={`text-2xl font-bold ${prediction?.is_over_budget ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(prediction?.predicted_completed_total || 0, currency)}
          </p>
          <p className="text-xs text-slate-400">of {formatCurrency(monthlyBudget, currency)} budget</p>
        </Card>
      </div>

      {prediction && (
        <Card className={`p-4 ${prediction.is_over_budget ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
          <p className={`text-sm ${prediction.is_over_budget ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
            {prediction.recommendation}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">High Priority</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.by_importance.high.price || 0, currency)}
          </p>
          <p className="text-xs text-slate-400">{summary?.by_importance.high.count} items</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-yellow-500">
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Medium Priority</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.by_importance.medium.price || 0, currency)}
          </p>
          <p className="text-xs text-slate-400">{summary?.by_importance.medium.count} items</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">Low Priority</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.by_importance.low.price || 0, currency)}
          </p>
          <p className="text-xs text-slate-400">{summary?.by_importance.low.count} items</p>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Items</h2>
        {summary?.completed_items ? (
          <Button variant="ghost" size="sm" onClick={handleClearCompleted}>
            Clear Completed
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">No items in your shopping list yet.</p>
          <Button className="mt-4" onClick={() => setShowAddForm(true)}>
            Add Your First Item
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['high', 'medium', 'low'] as const).map((importance) => (
            <div key={importance} className="space-y-2">
              <h3 className={`font-semibold text-sm uppercase tracking-wide ${importance === 'high' ? 'text-red-500' : importance === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                {importance} Priority
              </h3>
              {items.filter(item => item.importance === importance).map((item) => (
            <div 
              key={item.id} 
              className={`bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700 ${item.is_completed ? 'opacity-60' : ''}`}
            >
              <button
                type="button"
                id={`toggle-${item.id}`}
                onClick={() => handleToggleComplete(item.id)}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer select-none"
                style={{
                  borderColor: item.is_completed ? '#22c55e' : '#cbd5e1',
                  backgroundColor: item.is_completed ? '#22c55e' : '#fff',
                }}
              >
                {item.is_completed ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-slate-900 dark:text-white truncate ${item.is_completed ? 'line-through' : ''}`}>
                  {item.name}
                </p>
                {item.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.notes}</p>
                )}
              </div>
              
              <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${importanceColor(item.importance)}`}>
                {importanceLabel(item.importance)}
              </span>
              
              <div className="text-right flex-shrink-0">
                {editingPriceId === item.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={actualPrice}
                      onChange={(e) => setActualPrice(e.target.value)}
                      placeholder="Paid"
                      className="w-20 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateActualPrice(item.id)}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { setEditingPriceId(null); setActualPrice(''); }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <p className={`font-bold text-slate-900 dark:text-white ${item.is_completed ? 'line-through' : ''}`}>
                      {formatCurrency(item.price * item.quantity, currency)}
                    </p>
                    {item.actual_price && item.actual_price !== item.price && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Paid: {formatCurrency(item.actual_price * item.quantity, currency)}
                      </p>
                    )}
                    {!item.is_completed && (
                      <button
                        onClick={() => { setEditingPriceId(item.id); setActualPrice(item.actual_price?.toString() || item.price.toString()); }}
                        className="text-xs text-blue-500 hover:text-blue-600"
                      >
                        Edit price
                      </button>
                    )}
                  </>
                )}
                {item.quantity > 1 && (
                  <p className="text-xs text-slate-400">x{item.quantity}</p>
                )}
              </div>
              
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
