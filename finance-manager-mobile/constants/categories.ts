export interface Category {
  name: string;
  icon: string;
  color: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { name: 'Food & Dining', icon: 'restaurant-outline', color: '#F59E0B' },
  { name: 'Transport', icon: 'car-outline', color: '#3B82F6' },
  { name: 'Shopping', icon: 'bag-outline', color: '#8B5CF6' },
  { name: 'Utilities', icon: 'flash-outline', color: '#10B981' },
  { name: 'Healthcare', icon: 'medical-outline', color: '#EF4444' },
  { name: 'Education', icon: 'book-outline', color: '#6366F1' },
  { name: 'Entertainment', icon: 'game-controller-outline', color: '#F97316' },
  { name: 'Groceries', icon: 'basket-outline', color: '#84CC16' },
  { name: 'Rent', icon: 'home-outline', color: '#06B6D4' },
  { name: 'Salary', icon: 'cash-outline', color: '#10B981' },
  { name: 'Travel', icon: 'airplane-outline', color: '#0EA5E9' },
  { name: 'Clothing', icon: 'shirt-outline', color: '#EC4899' },
  { name: 'Investment', icon: 'trending-up-outline', color: '#6366F1' },
  { name: 'Gifts', icon: 'gift-outline', color: '#F43F5E' },
  { name: 'Insurance', icon: 'shield-outline', color: '#14B8A6' },
  { name: 'Maintenance', icon: 'construct-outline', color: '#78716C' },
  { name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#94A3B8' },
];

export const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'Bank Transfer',
  'Wallet',
  'Cheque',
  'Other',
];

export const ASSET_TYPES = [
  'Property',
  'Gold',
  'Vehicle',
  'Electronics',
  'Jewelry',
  'Business',
  'Other',
];
