import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileNavigation from './components/layout/MobileNavigation';
import OfflineIndicator from './components/OfflineIndicator';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Receipts from './pages/Receipts';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import ShoppingList from './pages/ShoppingList';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Sidebar - Desktop */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="lg:ml-72 min-h-screen flex flex-col dark:bg-slate-900">
          {/* Header */}
          <Header />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/shopping-list" element={<ShoppingList />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation />
      </div>
    </Router>
  );
}

export default App;