import { 
  Bell, 
  Search, 
  Settings, 
  ChevronDown, 
  Plus, 
  UserPlus, 
  Camera,
  Edit3,
  Trash2,
  AlertTriangle,
  Check,
  Palette
} from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount } from '../../hooks/useAccount';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
}

const PRESET_COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Header = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | undefined>(undefined);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const   fileInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const { accounts, currentAccount, switchAccount, addAccount, removeAccount, updateAccount } = useAccount();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false);
        setShowAddAccount(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open edit modal with current account data
  const handleOpenEditModal = () => {
    if (currentAccount) {
      setEditName(currentAccount.name);
      setEditColor(currentAccount.color);
      setEditAvatar(currentAccount.avatar);
      setShowEditModal(true);
    }
  };

  const handleAddAccount = () => {
    if (newAccountName.trim()) {
      addAccount({
        name: newAccountName.trim(),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      });
      setNewAccountName('');
      setShowAddAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    if (currentAccount && accounts.length > 1) {
      removeAccount(currentAccount.id);
      setShowDeleteModal(false);
      setShowProfile(false);
    }
  };

  const handleSaveProfile = () => {
    if (currentAccount && editName.trim()) {
      updateAccount(currentAccount.id, {
        name: editName.trim(),
        color: editColor,
        avatar: editAvatar,
      });
      setShowEditModal(false);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    } else {
      navigate('/transactions');
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setEditAvatar(undefined);
  };

  const otherAccounts = accounts.filter(acc => acc.id !== currentAccount?.id);

  // Handle keyboard shortcuts
  const handleProfileKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowProfile(false);
      setShowAddAccount(false);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Left side - Mobile menu & Search */}
        <div className="flex items-center gap-4">
          {/* Search bar - Hidden on mobile */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="global-search"
              name="search"
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="
                w-64 pl-10 pr-10 py-2 rounded-xl
                bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700
                text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400
                focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-primary-200 focus:ring-4 focus:ring-primary-500/10
                transition-all duration-200
              "
            />
            <button
              onClick={handleSearchClick}
              className="absolute right-3 text-xs text-slate-400 font-medium hover:text-primary-500"
            >
              ⌘K
            </button>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          {/* Notification Button */}
          <div className="relative">
            <button
              className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              {/* Notification indicator */}
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div 
                ref={notificationsRef}
                className="
                  absolute right-0 top-full mt-3 w-80 
                  bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700
                  overflow-hidden z-50 animate-fadeIn
                "
              >
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  <span className="text-xs text-primary-600 dark:text-primary-400 font-medium cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-700">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">New feature available</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Try our new AI-powered receipt scanning</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              className="flex items-center gap-2 h-10 pl-1.5 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setShowProfile(!showProfile)}
              aria-label={`Account menu for ${currentAccount?.name || 'User'}`}
              aria-expanded={showProfile}
            >
              <div className="relative flex-shrink-0">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-700 shadow-sm overflow-hidden text-white text-[10px] font-semibold"
                  style={{ backgroundColor: currentAccount?.color || '#4F46E5' }}
                >
                  {currentAccount?.avatar ? (
                    <img 
                      src={currentAccount.avatar} 
                      alt={currentAccount.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(currentAccount?.name || 'User')
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success-500 rounded-full ring-1.5 ring-white dark:ring-slate-700" />
              </div>
              <div className="hidden sm:flex flex-col items-start justify-center">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-none">{currentAccount?.name || 'User'}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 leading-none mt-0.5">Active</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 hidden sm:block flex-shrink-0 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div
                className="
                  absolute right-0 top-full mt-3 w-80
                  bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700
                  overflow-hidden z-50 animate-fadeIn
                "
                onKeyDown={handleProfileKeyDown}
              >
                {/* Current Account Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 dark:from-slate-700/50 to-white dark:to-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Account</p>
                    <button
                      onClick={handleOpenEditModal}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Profile
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button
                        onClick={handleOpenEditModal}
                        className="relative group cursor-pointer"
                      >
                        <div 
                          className="w-14 h-14 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-600 shadow-md overflow-hidden flex-shrink-0 text-white font-semibold text-lg transition-transform group-hover:scale-105"
                          style={{ backgroundColor: currentAccount?.color || '#4F46E5' }}
                        >
                          {currentAccount?.avatar ? (
                            <img 
                              src={currentAccount.avatar} 
                              alt={currentAccount.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(currentAccount?.name || 'User')
                          )}
                        </div>
                        {/* Camera Overlay */}
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success-500 rounded-full ring-2 ring-white dark:ring-slate-700" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate text-lg">{currentAccount?.name || 'User'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Other Accounts */}
                {otherAccounts.length > 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">Switch Account</p>
                    {otherAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          switchAccount(account.id);
                          setShowProfile(false);
                        }}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 transition-all text-left group"
                      >
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                          style={{ backgroundColor: account.color }}
                        >
                          {account.avatar ? (
                            <img src={account.avatar} alt={account.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(account.name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900">{account.name}</p>
                        </div>
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-primary-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Add Account */}
                <div className="p-2 border-b border-slate-100">
                  {!showAddAccount ? (
                    <button
                      onClick={() => setShowAddAccount(true)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-primary-50 transition-colors text-left text-primary-600 group"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 transition-colors">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">Add Account</span>
                    </button>
                  ) : (
                    <div className="px-2 py-2">
                      <div className="flex gap-2">
                        <input
                          id="new-account-name"
                          name="newAccountName"
                          type="text"
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          placeholder="Account name..."
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddAccount();
                            if (e.key === 'Escape') {
                              setShowAddAccount(false);
                              setNewAccountName('');
                            }
                          }}
                        />
                        <Button size="sm" onClick={handleAddAccount} className="!px-3">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings & Actions */}
                <div className="p-2 space-y-1">
                  <button 
                    onClick={() => {
                      setShowProfile(false);
                      window.location.href = '/settings';
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                      <Settings className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">Settings</span>
                  </button>
                  
                  {accounts.length > 1 && (
                    <button
                      onClick={() => {
                        setShowDeleteModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-danger-50 transition-colors text-left text-danger-600 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-danger-50 flex items-center justify-center flex-shrink-0 group-hover:bg-danger-100 transition-colors">
                        <Trash2 className="w-4 h-4 text-danger-600" />
                      </div>
                      <span className="text-sm font-medium">Remove Account</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Account"
        description="This action cannot be undone. All data associated with this account will be permanently deleted."
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAccount}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Remove Account
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-danger-800">Warning</p>
                <p className="text-sm text-danger-700 mt-1">
                  You are about to remove <strong>{currentAccount?.name}</strong>. This will delete:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-danger-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-danger-400 rounded-full" />
                    Account profile and settings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-danger-400 rounded-full" />
                    All associated data will be lost
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        description="Customize your account profile"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProfile}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl">
            <p className="text-sm font-medium text-slate-700 mb-4">Profile Photo</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
              onMouseEnter={() => setIsHoveringAvatar(true)}
              onMouseLeave={() => setIsHoveringAvatar(false)}
              type="button"
            >
              <div 
                className="w-28 h-28 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg overflow-hidden text-white font-semibold text-3xl transition-transform group-hover:scale-105"
                style={{ backgroundColor: editColor || '#4F46E5' }}
              >
                {editAvatar ? (
                  <img 
                    src={editAvatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(editName || 'User')
                )}
              </div>
              
              {/* Hover Overlay */}
              <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity ${isHoveringAvatar ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-black/50 rounded-full" />
                <Camera className="w-10 h-10 text-white relative z-10" />
              </div>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 font-medium flex items-center gap-2 transition-colors"
                type="button"
              >
                <Camera className="w-4 h-4" />
                {editAvatar ? 'Change Photo' : 'Upload Photo'}
              </button>
              {editAvatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="text-sm text-danger-600 hover:text-danger-700 font-medium px-3 py-2 hover:bg-danger-50 rounded-lg transition-colors"
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Account Name
            </label>
            <input
              id="account-name"
              name="accountName"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter account name..."
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Profile Color
              </span>
            </label>
            <div className="grid grid-cols-5 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`
                    w-full aspect-square rounded-xl transition-all
                    ${editColor === color 
                      ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' 
                      : 'hover:scale-105 hover:shadow-md'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                >
                  {editColor === color && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Custom Color Input */}
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-slate-600">Custom:</label>
              <div className="flex items-center gap-2">
                <input
                  id="account-color-picker"
                  name="accountColorPicker"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                />
                <input
                  id="account-color"
                  name="accountColor"
                  type="text"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="#4F46E5"
                  className="w-28 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary-500 uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add CSS animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </header>
  );
};

export default Header;
