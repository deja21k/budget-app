import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { 
    Globe, Database, Download, Upload, Trash2, 
    FileJson, FileSpreadsheet, AlertTriangle, CheckCircle, RefreshCw,
    ChevronRight, Info, HardDrive, Settings as SettingsIcon,
    Palette, BellRing, ShieldCheck
  } from 'lucide-react';
  import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import PageTransition from '../components/layout/PageTransition';
import { exportService, settingsService } from '../services/api';
import type { DatabaseStats, AppSettings, ExportData } from '../types';
import { formatCurrency } from '../utils/defensive';

const Settings = () => {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const gsapContextRef = useRef<gsap.Context | null>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotificationCallback = useCallback((message: string, type: 'success' | 'error') => {
    if (!isMountedRef.current) return;
    
    // Clear existing notification timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    setNotification({ message, type });
    
    notificationTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setNotification(null);
      }
    }, 5000);
  }, []);

  const loadStats = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const data = await exportService.getStats();
      if (isMountedRef.current) {
        setStats(data);
      }
    } catch {
      if (isMountedRef.current) {
        showNotificationCallback('Failed to load database stats', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [showNotificationCallback]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
        gsapContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    loadStats();
    
    // Animate sections
    if (gsapContextRef.current) {
      gsapContextRef.current.revert();
    }
    
    const ctx = gsap.context(() => {
      const sections = document.querySelectorAll('.settings-section');
      gsap.fromTo(
        sections,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.2
        }
      );
    });
    
    gsapContextRef.current = ctx;
  }, [loadStats]);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = settingsService.updateSettings({ [key]: value });
    setSettings(newSettings);
    
    if (key === 'theme') {
      const root = document.documentElement;
      if (value === 'dark') {
        root.classList.add('dark');
      } else if (value === 'light') {
        root.classList.remove('dark');
      } else if (value === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    }
    
    showNotificationCallback('Settings saved', 'success');
  };

  const updateNestedSetting = (
    key: 'notifications' | 'privacy',
    nestedKey: string,
    value: boolean
  ) => {
    const current = settingsService.getSettings();
    const newSettings = settingsService.updateSettings({
      [key]: { ...current[key], [nestedKey]: value },
    } as Partial<AppSettings>);
    setSettings(newSettings);
  };

  const handleExportJSON = async () => {
    try {
      const blob = await exportService.exportJSON();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotificationCallback('Data exported successfully', 'success');
    } catch {
      showNotificationCallback('Failed to export data', 'error');
    }
  };

  const handleExportTransactionsCSV = async () => {
    try {
      const blob = await exportService.exportTransactionsCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotificationCallback('Transactions exported successfully', 'success');
    } catch {
      showNotificationCallback('Failed to export transactions', 'error');
    }
  };

  const handleExportSummaryCSV = async () => {
    try {
      const blob = await exportService.exportSummaryCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `summary-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotificationCallback('Summary exported successfully', 'success');
    } catch {
      showNotificationCallback('Failed to export summary', 'error');
    }
  };

  const handleImport = async () => {
    try {
      setImportError(null);
      const data: ExportData = JSON.parse(importData);
      const result = await exportService.importJSON(data);
      
      if (result.success) {
        showNotificationCallback(
          `Imported: ${result.imported.categories} categories, ${result.imported.transactions} transactions, ${result.imported.receipts} receipts`,
          'success'
        );
        setShowImportModal(false);
        setImportData('');
        loadStats();
      } else {
        setImportError(result.errors.join(', '));
      }
    } catch {
      setImportError('Invalid JSON format');
    }
  };

  const handleReset = async () => {
    try {
      const result = await exportService.resetData();
      if (result.success) {
        showNotificationCallback('All data has been reset', 'success');
        setShowResetModal(false);
        loadStats();
        settingsService.resetSettings();
        setSettings(settingsService.getSettings());
      } else {
        showNotificationCallback(result.message, 'error');
      }
    } catch {
      showNotificationCallback('Failed to reset data', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="page-container pb-24 lg:pb-8">
        {/* Premium Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-soft-xl flex items-center gap-3 animate-enter ${
            notification.type === 'success' 
              ? 'bg-success-50 text-success-800 border border-success-200' 
              : 'bg-danger-50 text-danger-800 border border-danger-200'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {/* Premium Header */}
        <div className="mb-10 settings-section">
          <div className="flex items-center gap-2 mb-2">
            <SettingsIcon className="w-5 h-5 text-primary-500" />
            <span className="text-sm font-medium text-primary-600">Configuration</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
            Settings
          </h1>
          <p className="text-slate-500">
            Manage your app preferences and data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Premium Appearance */}
            <Card className="settings-section" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-primary-600" />
                    </div>
                    <CardTitle>Appearance</CardTitle>
                  </div>
                }
              />
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'system'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updateSetting('theme', theme)}
                        className={`
                          py-3 px-4 rounded-xl font-semibold capitalize transition-all duration-300
                          ${settings.theme === theme
                            ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500 shadow-soft'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }
                        `}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Premium Regional Settings */}
            <Card className="settings-section" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary-600" />
                    </div>
                    <CardTitle>Regional</CardTitle>
                  </div>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Currency
                  </label>
                  <select 
                    value={settings.currency}
                    onChange={(e) => updateSetting('currency', e.target.value)}
                    className="
                      w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900
                      focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                      transition-all duration-300
                    "
                  >
                    <option value="RSD">RSD (din) - Serbian Dinar</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date Format
                  </label>
                  <select 
                    value={settings.dateFormat}
                    onChange={(e) => updateSetting('dateFormat', e.target.value)}
                    className="
                      w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900
                      focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                      transition-all duration-300
                    "
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Serbian)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Time Zone
                  </label>
                  <select 
                    value={settings.timezone}
                    onChange={(e) => updateSetting('timezone', e.target.value)}
                    className="
                      w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900
                      focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                      transition-all duration-300
                    "
                  >
                    <option value="Europe/Belgrade">Belgrade (Serbia)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Australia/Sydney">Sydney</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Premium Notifications */}
            <Card className="settings-section" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <BellRing className="w-5 h-5 text-primary-600" />
                    </div>
                    <CardTitle>Notifications</CardTitle>
                  </div>
                }
              />
              <div className="space-y-2">
                {[
                  { key: 'budgetAlerts', label: 'Budget alerts', desc: 'Get notified when you approach budget limits' },
                  { key: 'weeklySummary', label: 'Weekly summary', desc: 'Receive weekly spending reports' },
                  { key: 'recurringReminders', label: 'Recurring payments', desc: 'Reminders for upcoming bills' },
                  { key: 'featureUpdates', label: 'New features', desc: 'Updates about new app features' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                        onChange={(e) => updateNestedSetting('notifications', item.key as keyof typeof settings.notifications, e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Premium Data Export */}
            <Card className="settings-section" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Download className="w-5 h-5 text-primary-600" />
                    </div>
                    <CardTitle>Export Data</CardTitle>
                  </div>
                }
              />
              <p className="text-sm text-slate-500 mb-6">
                Download your data in various formats for backup or analysis
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="secondary"
                  onClick={handleExportJSON}
                  leftIcon={<FileJson className="w-4 h-4" />}
                  className="justify-center"
                >
                  Export JSON
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportTransactionsCSV}
                  leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                  className="justify-center"
                >
                  Transactions CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportSummaryCSV}
                  leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                  className="justify-center"
                >
                  Summary CSV
                </Button>
              </div>
            </Card>

            {/* Premium Data Import */}
            <Card className="settings-section" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-primary-600" />
                    </div>
                    <CardTitle>Import Data</CardTitle>
                  </div>
                }
              />
              <p className="text-sm text-slate-500 mb-6">
                Import data from a previous export (JSON format)
              </p>
              <Button
                variant="secondary"
                onClick={() => setShowImportModal(true)}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Import from JSON
              </Button>
            </Card>
          </div>

          {/* Premium Sidebar */}
          <div className="space-y-8">
            {/* Database Stats */}
            <Card className="settings-section" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Database className="w-5 h-5 text-primary-600" />
                    </div>
                    <CardTitle>Database</CardTitle>
                  </div>
                }
              />
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-600">Categories</span>
                    <span className="font-bold text-slate-900">{stats.categories}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-600">Transactions</span>
                    <span className="font-bold text-slate-900">{stats.transactions}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-600">Receipts</span>
                    <span className="font-bold text-slate-900">{stats.receipts}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-600">Total Income</span>
                    <span className="font-bold text-success-600">{formatCurrency(stats.totalIncome, settings.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-600">Total Expenses</span>
                    <span className="font-bold text-danger-600">{formatCurrency(stats.totalExpenses, settings.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-600 flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Database Size
                    </span>
                    <span className="font-bold text-slate-900">{stats.databaseSize}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">Failed to load stats</p>
              )}
            </Card>

            {/* Premium Privacy */}
            <Card className="settings-section" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <CardTitle>Privacy</CardTitle>
                  </div>
                }
              />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Auto Backup</p>
                    <p className="text-sm text-slate-500">Export data weekly</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.privacy.autoBackup}
                      onChange={(e) => updateNestedSetting('privacy', 'autoBackup', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                  <p className="text-xs text-slate-500">
                    All data is stored locally on your device. No data is sent to any server.
                  </p>
                </div>
              </div>
            </Card>

            {/* Premium Danger Zone */}
            <Card className="settings-section border-danger-200" variant="premium" padding="lg">
              <CardHeader 
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-danger-50 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-danger-600" />
                    </div>
                    <CardTitle className="text-danger-600">Danger Zone</CardTitle>
                  </div>
                }
              />
              <p className="text-sm text-slate-500 mb-6">
                These actions cannot be undone. Make sure to export your data first.
              </p>
              <Button 
                variant="danger" 
                onClick={() => setShowResetModal(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="w-full"
              >
                Reset All Data
              </Button>
            </Card>
          </div>
        </div>

        {/* Premium Import Modal */}
        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Data"
          description="Paste your JSON export data below"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} leftIcon={<Upload className="w-4 h-4" />}>
                Import
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="
                w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900
                focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                transition-all duration-300 min-h-[200px] resize-none font-mono text-sm
              "
              placeholder="Paste JSON data here..."
            />
            {importError && (
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">
                {importError}
              </div>
            )}
            <p className="text-xs text-slate-500">
              Importing will add new data without deleting existing records.
            </p>
          </div>
        </Modal>

        {/* Premium Reset Confirmation Modal */}
        <Modal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          title="Reset All Data"
          description="This will permanently delete all your data"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReset} leftIcon={<Trash2 className="w-4 h-4" />}>
                Yes, Reset Everything
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-5 bg-danger-50 border border-danger-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-danger-600 mt-0.5" />
                <div>
                  <p className="font-bold text-danger-800">Warning: This cannot be undone</p>
                  <p className="text-sm text-danger-700 mt-1">
                    All categories, transactions, and receipts will be permanently deleted. 
                    Make sure to export your data before proceeding.
                  </p>
                </div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                {stats?.categories || 0} categories will be deleted
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                {stats?.transactions || 0} transactions will be deleted
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                {stats?.receipts || 0} receipts will be deleted
              </li>
            </ul>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
};

export default Settings;
