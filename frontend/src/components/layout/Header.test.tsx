import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import { AccountProvider } from '../../contexts/AccountContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location.reload
const reloadMock = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: reloadMock, href: '' },
  writable: true,
});

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  
  readAsDataURL() {
    this.result = 'data:image/png;base64,mocked';
    setTimeout(() => {
      this.onloadend?.();
    }, 0);
  }
}
Object.defineProperty(window, 'FileReader', {
  value: MockFileReader,
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AccountProvider>
        {component}
      </AccountProvider>
    </BrowserRouter>
  );
};

describe('Header Component - My Account Dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the profile button with default account', () => {
      renderWithProviders(<Header />);
      
      // Check that the profile button is rendered
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      expect(profileButton).toBeInTheDocument();
      
      // Check that the account name is displayed
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    it('should not show dropdown initially', () => {
      renderWithProviders(<Header />);
      
      // Dropdown should not be visible initially
      expect(screen.queryByText('Current Account')).not.toBeInTheDocument();
      expect(screen.queryByText('Switch Account')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open dropdown when profile button is clicked', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Check that dropdown is now visible
      expect(screen.getByText('Current Account')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      renderWithProviders(<Header />);
      
      // Open dropdown
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      expect(screen.getByText('Current Account')).toBeInTheDocument();
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('Current Account')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking the button again', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      
      // Open
      await userEvent.click(profileButton);
      expect(screen.getByText('Current Account')).toBeInTheDocument();
      
      // Close
      await userEvent.click(profileButton);
      await waitFor(() => {
        expect(screen.queryByText('Current Account')).not.toBeInTheDocument();
      });
    });
  });

  describe('Account Management', () => {
    it('should display account count in current account section', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      expect(screen.getByText('1 account')).toBeInTheDocument();
    });

    it('should allow adding a new account', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Click add account button
      const addAccountButton = screen.getByText('Add Account');
      await userEvent.click(addAccountButton);
      
      // Input should appear
      const input = screen.getByPlaceholderText('Account name...');
      expect(input).toBeInTheDocument();
      
      // Type new account name
      await userEvent.type(input, 'Business Account');
      
      // Find the add button by looking for the plus icon within the dropdown
      // The button with Plus icon is the primary colored one
      const addButtons = screen.getAllByRole('button');
      const addButton = addButtons.find(btn => 
        btn.className.includes('bg-primary-600')
      );
      expect(addButton).toBeTruthy();
      await userEvent.click(addButton!);
      
      // Account should be added
      await waitFor(() => {
        expect(screen.getByText('Business Account')).toBeInTheDocument();
      });
    });

    it('should allow switching between accounts', async () => {
      // Setup: Add an account first
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        accounts: [
          { id: 'default', name: 'My Account', color: '#4F46E5', isActive: true },
          { id: 'account_123', name: 'Business', color: '#hsl(100, 70%, 50%)', isActive: false },
        ],
        currentAccountId: 'default',
      }));
      
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Switch Account section should be visible
      expect(screen.getByText('Switch Account')).toBeInTheDocument();
      expect(screen.getByText('Business')).toBeInTheDocument();
      
      // Click on Business account
      const businessAccount = screen.getByText('Business');
      await userEvent.click(businessAccount);
      
      // Page should reload
      expect(reloadMock).toHaveBeenCalled();
    });

    it('should show remove account option when multiple accounts exist', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        accounts: [
          { id: 'default', name: 'My Account', color: '#4F46E5', isActive: true },
          { id: 'account_123', name: 'Business', color: '#hsl(100, 70%, 50%)', isActive: false },
        ],
        currentAccountId: 'default',
      }));
      
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      expect(screen.getByText('Remove Account')).toBeInTheDocument();
    });

    it('should not show remove account option with only one account', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      expect(screen.queryByText('Remove Account')).not.toBeInTheDocument();
    });
  });

  describe('Account Removal with Confirmation', () => {
    it('should show confirmation modal when clicking remove account', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        accounts: [
          { id: 'default', name: 'My Account', color: '#4F46E5', isActive: true },
          { id: 'account_123', name: 'Business', color: '#hsl(100, 70%, 50%)', isActive: false },
        ],
        currentAccountId: 'default',
      }));
      
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Click remove account button (the one with Trash2 icon in dropdown)
      const removeButtons = screen.getAllByText('Remove Account');
      // First one is the dropdown button, click that
      const dropdownRemoveButton = removeButtons[0].closest('button');
      await userEvent.click(dropdownRemoveButton!);
      
      // Confirmation modal should appear - look for the description
      await waitFor(() => {
        expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
      });
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should allow canceling account removal', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        accounts: [
          { id: 'default', name: 'My Account', color: '#4F46E5', isActive: true },
          { id: 'account_123', name: 'Business', color: '#hsl(100, 70%, 50%)', isActive: false },
        ],
        currentAccountId: 'default',
      }));
      
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Click remove account
      const removeButton = screen.getByText('Remove Account');
      await userEvent.click(removeButton);
      
      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText(/This action cannot be undone/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Profile Editing', () => {
    it('should open edit modal when clicking Edit Profile button', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Click edit profile button (first Edit Profile text in dropdown)
      const editButtons = screen.getAllByText('Edit Profile');
      await userEvent.click(editButtons[0]);
      
      // Edit modal should appear
      await waitFor(() => {
        expect(screen.getByText('Customize your account profile')).toBeInTheDocument();
      });
    });

    it('should allow editing account name', async () => {
      renderWithProviders(<Header />);
      
      // Open dropdown and click edit profile
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      const editButtons = screen.getAllByText('Edit Profile');
      await userEvent.click(editButtons[0]);
      
      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Customize your account profile')).toBeInTheDocument();
      });
      
      // Change name
      const nameInput = screen.getByPlaceholderText('Enter account name...');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Account Name');
      
      // Save
      const saveButton = screen.getByText('Save Changes');
      await userEvent.click(saveButton);
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Customize your account profile')).not.toBeInTheDocument();
      });
    });

    it('should show color picker with preset colors', async () => {
      renderWithProviders(<Header />);
      
      // Open dropdown and click edit profile
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      const editButtons = screen.getAllByText('Edit Profile');
      await userEvent.click(editButtons[0]);
      
      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Profile Color')).toBeInTheDocument();
      });
      
      // Should have color picker buttons (preset colors)
      const colorButtons = screen.getAllByLabelText(/Select color/i);
      expect(colorButtons.length).toBeGreaterThan(0);
      
      // Should have at least one preset color button
      expect(colorButtons[0]).toBeInTheDocument();
    });

    it('should allow canceling profile edit', async () => {
      renderWithProviders(<Header />);
      
      // Open dropdown and click edit profile
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      const editButtons = screen.getAllByText('Edit Profile');
      await userEvent.click(editButtons[0]);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Customize your account profile')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Customize your account profile')).not.toBeInTheDocument();
      });
    });

    it('should show upload photo button in edit profile modal', async () => {
      renderWithProviders(<Header />);
      
      // Open dropdown and click edit profile
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      const editButtons = screen.getAllByText('Edit Profile');
      await userEvent.click(editButtons[0]);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Customize your account profile')).toBeInTheDocument();
      });

      // Upload Photo button should be visible
      const uploadButton = screen.getByText('Upload Photo');
      expect(uploadButton).toBeInTheDocument();
    });

    it('should show file input for avatar upload', async () => {
      renderWithProviders(<Header />);
      
      // Open dropdown and click edit profile
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      const editButtons = screen.getAllByText('Edit Profile');
      await userEvent.click(editButtons[0]);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Customize your account profile')).toBeInTheDocument();
      });

      // File input should exist
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });
  });

  describe('Settings Navigation', () => {
    it('should navigate to settings when clicking Settings', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      const settingsButton = screen.getByText('Settings');
      await userEvent.click(settingsButton);
      
      expect(window.location.href).toBe('/settings');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should add account on Enter key press', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Click add account
      const addAccountButton = screen.getByText('Add Account');
      await userEvent.click(addAccountButton);
      
      const input = screen.getByPlaceholderText('Account name...');
      await userEvent.type(input, 'Test Account{enter}');
      
      // Account should be added
      await waitFor(() => {
        expect(screen.getByText('Test Account')).toBeInTheDocument();
      });
    });

    it('should cancel add account on Escape key press', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      const addAccountButton = screen.getByText('Add Account');
      await userEvent.click(addAccountButton);
      
      const input = screen.getByPlaceholderText('Account name...');
      await userEvent.type(input, 'Test Account{escape}');
      
      // Input should be gone
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Account name...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual Elements', () => {
    it('should display user initials when no avatar', async () => {
      renderWithProviders(<Header />);
      
      // Initials "MA" for "My Account" should be displayed
      expect(screen.getByText('MA')).toBeInTheDocument();
    });

    it('should display active status indicator', () => {
      renderWithProviders(<Header />);
      
      // Look for the green dot indicator
      const statusDot = document.querySelector('.bg-success-500');
      expect(statusDot).toBeInTheDocument();
    });

    it('should show Edit Profile button in dropdown', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /My Account/i });
      await userEvent.click(profileButton);
      
      // Should have Edit Profile text (button in dropdown)
      const editProfileElements = screen.getAllByText('Edit Profile');
      expect(editProfileElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels on profile button', async () => {
      renderWithProviders(<Header />);
      
      const profileButton = screen.getByRole('button', { name: /Account menu for/i });
      expect(profileButton).toHaveAttribute('aria-expanded', 'false');
      
      await userEvent.click(profileButton);
      
      expect(profileButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper aria labels on notification button', () => {
      renderWithProviders(<Header />);
      
      const notificationButton = screen.getByRole('button', { name: 'Notifications' });
      expect(notificationButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
