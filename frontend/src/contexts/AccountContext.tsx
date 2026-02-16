import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Account, AccountsState } from '../types';

const ACCOUNTS_KEY = 'budget_app_accounts';

interface AccountContextType {
  accounts: Account[];
  currentAccount: Account | null;
  switchAccount: (accountId: string) => void;
  addAccount: (account: Omit<Account, 'id' | 'isActive'>) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
}

const defaultAccounts: Account[] = [
  {
    id: 'default',
    name: 'My Account',
    color: '#4F46E5',
    isActive: true,
  },
];

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AccountsState>({
    accounts: defaultAccounts,
    currentAccountId: 'default',
  });
  const isInitializedRef = useRef(false);

  // Load accounts from localStorage on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      const stored = localStorage.getItem(ACCOUNTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Use queueMicrotask to avoid synchronous setState in effect
        queueMicrotask(() => {
          setState({
            accounts: parsed.accounts || defaultAccounts,
            currentAccountId: parsed.currentAccountId || 'default',
          });
        });
      }
    } catch {
      // Use defaults if parsing fails
    }
    isInitializedRef.current = true;
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save accounts:', error);
    }
  }, [state]);

  const switchAccount = useCallback((accountId: string) => {
    setState(prev => ({
      ...prev,
      currentAccountId: accountId,
      accounts: prev.accounts.map(acc => ({
        ...acc,
        isActive: acc.id === accountId,
      })),
    }));
    // Reload page to refresh data for new account
    window.location.reload();
  }, []);

  const addAccount = useCallback((account: Omit<Account, 'id' | 'isActive'>) => {
    const newAccount: Account = {
      ...account,
      id: `account_${Date.now()}`,
      isActive: false,
    };
    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }));
  }, []);

  const removeAccount = useCallback((accountId: string) => {
    setState(prev => {
      const filtered = prev.accounts.filter(acc => acc.id !== accountId);
      // If we're removing the current account, switch to the first available
      let newCurrentId = prev.currentAccountId;
      if (prev.currentAccountId === accountId && filtered.length > 0) {
        newCurrentId = filtered[0].id;
        filtered[0].isActive = true;
      }
      return {
        accounts: filtered,
        currentAccountId: newCurrentId,
      };
    });
  }, []);

  const updateAccount = useCallback((accountId: string, updates: Partial<Account>) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(acc =>
        acc.id === accountId ? { ...acc, ...updates } : acc
      ),
    }));
  }, []);

  const currentAccount = state.accounts.find(acc => acc.id === state.currentAccountId) || state.accounts[0];

  return (
    <AccountContext.Provider
      value={{
        accounts: state.accounts,
        currentAccount,
        switchAccount,
        addAccount,
        removeAccount,
        updateAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export default AccountContext;
