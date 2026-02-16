# QA Checklist - Add Transaction Feature

## Pre-deployment Testing

### 1. Core Functionality Tests

#### Transaction Creation
- [ ] Create income transaction with all fields
- [ ] Create expense transaction with all fields
- [ ] Create transaction with minimum required fields (type, amount, date, category)
- [ ] Create transaction with items (itemized purchase)
- [ ] Create transaction without items (single amount)

#### Transaction Editing
- [ ] Edit existing transaction - change amount
- [ ] Edit existing transaction - change category
- [ ] Edit existing transaction - add items
- [ ] Edit existing transaction - remove items
- [ ] Edit existing transaction - change merchant
- [ ] Edit existing transaction - change date

#### Transaction Types
- [ ] Switch from expense to income (category should clear)
- [ ] Switch from income to expense (category should clear)
- [ ] Verify income doesn't show recurring/regret options
- [ ] Verify expense shows all options

### 2. Items (Itemized Purchase) Tests

#### Add/Remove Items
- [ ] Add first item (section should auto-expand)
- [ ] Add multiple items (up to 50)
- [ ] Remove item from middle of list
- [ ] Remove last item (section stays expanded)

#### Item Calculations
- [ ] Unit price × quantity = total per item
- [ ] Items total sums correctly
- [ ] Decimal places limited to 2
- [ ] Zero quantity shows error
- [ ] Negative price shows error

#### Sync Features
- [ ] "Sync to Amount" button appears when items total ≠ transaction amount
- [ ] Clicking sync updates transaction amount to items total
- [ ] Visual indicator shows when amounts match (green checkmark)
- [ ] Warning shows when amounts differ

### 3. Category Selection Tests

#### Dropdown Functionality
- [ ] Dropdown opens and shows all categories of selected type
- [ ] Selecting category shows colored dot indicator
- [ ] Recent categories appear first with ★ indicator
- [ ] Empty state shows when no categories exist

#### Auto-categorization
- [ ] Type "Whole Foods" - should auto-select "Groceries"
- [ ] Type "Starbucks" - should auto-select "Dining Out"
- [ ] Type "Shell" - should auto-select "Transportation"
- [ ] Auto-categorization badge shows "Auto-categorized based on merchant"
- [ ] Editing merchant after auto-categorization resets flag

#### Recent Categories
- [ ] First 5 used categories stored in localStorage
- [ ] Recent categories appear at top of dropdown
- [ ] Using category again moves it to top

### 4. Validation Tests

#### Amount Validation
- [ ] Empty amount shows "Amount is required"
- [ ] Zero amount shows "Amount must be greater than 0"
- [ ] Negative amount shows error
- [ ] Amount > 999,999,999.99 shows error
- [ ] More than 2 decimal places shows error
- [ ] Non-numeric input shows error

#### Date Validation
- [ ] Empty date shows "Date is required"
- [ ] Invalid format shows "Invalid date format"
- [ ] Future date > 1 year shows error
- [ ] Date > 10 years ago shows error
- [ ] Today's date is valid

#### Category Validation
- [ ] Empty category shows "Category is required"
- [ ] Invalid category ID shows error
- [ ] Category from wrong type shows error

#### Merchant Validation
- [ ] Empty merchant is allowed (optional field)
- [ ] Merchant > 100 characters shows error
- [ ] Merchant with < > " ' shows error

#### Items Validation
- [ ] Item with empty name shows error
- [ ] Item with zero quantity shows error
- [ ] Item with negative price shows error
- [ ] More than 100 items shows error

### 5. Recurring & Regret Tests

#### Recurring Toggle
- [ ] Toggle switch works (on/off)
- [ ] When ON: frequency selector appears
- [ ] Frequency options: Weekly, Monthly, Yearly
- [ ] Default frequency is Monthly
- [ ] Changing frequency updates selection

#### Regret Flag
- [ ] Three options: Worth it, Neutral, Regret
- [ ] Default is Neutral
- [ ] Selection changes visual state
- [ ] All three options selectable

### 6. Receipt Tests

#### Receipt Selection
- [ ] "Link Existing Receipt" button opens selector
- [ ] Unlinked receipts list displays
- [ ] Receipt with merchant name shown
- [ ] Receipt with amount shown
- [ ] Receipt thumbnail displays (if available)

#### Receipt Auto-fill
- [ ] Selecting receipt fills merchant field
- [ ] Selecting receipt fills amount field
- [ ] Selecting receipt fills date field (if valid)
- [ ] Selecting receipt triggers auto-categorization

#### Receipt Clear
- [ ] X button clears selected receipt
- [ ] All fields remain editable after clearing

### 7. Voice Input Tests

#### Voice Wizard
- [ ] Microphone button opens voice wizard
- [ ] Wizard recognizes speech (if supported)
- [ ] Merchant extracted from voice
- [ ] Amount extracted from voice
- [ ] Category suggested from voice merchant
- [ ] Cancel button closes wizard

### 8. UI/UX Tests

#### Visual Design
- [ ] Form sections clearly separated
- [ ] Consistent spacing throughout
- [ ] Premium, clean aesthetic
- [ ] Color-coded transaction types (green/red)
- [ ] Proper focus states on all inputs

#### Responsive Design
- [ ] Mobile: Form fits small screens
- [ ] Mobile: Touch targets > 44px
- [ ] Tablet: Form looks good
- [ ] Desktop: Form centered, not too wide

#### Loading States
- [ ] Loading spinner on save button
- [ ] Categories show "Loading..." initially
- [ ] Submit button disabled while loading
- [ ] Cancel button disabled while submitting

#### Success Feedback
- [ ] Success message appears after save
- [ ] Green checkmark icon shown
- [ ] Message auto-dismisses after 800ms
- [ ] Form closes after success

#### Error Feedback
- [ ] Field errors show below inputs
- [ ] Error icon appears with message
- [ ] Submit errors show at bottom
- [ ] Network errors show friendly message

### 9. Edge Cases

#### No Categories
- [ ] Form loads when no categories exist
- [ ] Dropdown shows "No categories available"
- [ ] Warning message displayed
- [ ] Submit blocked until category created

#### Network Failures
- [ ] Offline: Shows network error
- [ ] Timeout: Shows timeout error
- [ ] Server error: Shows generic error
- [ ] Retry logic works

#### Large Data
- [ ] 100 items can be added
- [ ] Very long merchant names truncated
- [ ] Very long descriptions work
- [ ] Large amounts display correctly

#### Special Characters
- [ ] Unicode characters in merchant work
- [ ] Unicode characters in description work
- [ ] Emoji in description work

### 10. Integration Tests

#### With Insights
- [ ] New transaction appears in insights
- [ ] Category spending updated
- [ ] Regret analysis includes new transaction
- [ ] Recurring expenses tracked

#### With Receipts
- [ ] Linked receipt shows in transaction
- [ ] Receipt status updates to linked
- [ ] Receipt unlinking works

#### With Export
- [ ] Transaction exports with items
- [ ] Transaction exports with all fields
- [ ] Import preserves all data

## Performance Tests

- [ ] Form opens in < 500ms
- [ ] Category dropdown opens instantly
- [ ] Receipt selector opens in < 1s
- [ ] Save completes in < 2s
- [ ] No memory leaks on open/close cycles

## Accessibility Tests

- [ ] All inputs have labels
- [ ] Error messages announced by screen readers
- [ ] Keyboard navigation works (Tab order)
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] ARIA attributes on interactive elements

## Security Tests

- [ ] XSS prevention in merchant field
- [ ] XSS prevention in description field
- [ ] SQL injection prevention (backend)
- [ ] No sensitive data in localStorage

## Regression Tests

- [ ] Existing transactions still display correctly
- [ ] Existing categories still work
- [ ] Receipt scanning still works
- [ ] Insights still calculate correctly
- [ ] Export/Import still works

## Sign-off

- [ ] All tests passed
- [ ] No critical bugs
- [ ] UI approved by designer
- [ ] Code reviewed
- [ ] Ready for deployment

## Notes

### Test Data
- Use test merchant: "Test Store"
- Use test amount: 123.45
- Use test date: Today
- Use test category: Create "Test Category"

### Browser Testing
Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

### Screen Resolution Testing
- 1920×1080 (Desktop)
- 1366×768 (Laptop)
- 768×1024 (Tablet)
- 375×667 (Mobile)
