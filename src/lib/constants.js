import { 
  Coffee, Car, ReceiptText, HeartPulse, ShoppingBag, 
  Clapperboard, BookOpen, Home, RefreshCw, Box, 
  Banknote, Briefcase, Gift, TrendingUp, Wallet 
} from 'lucide-react';

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food & Drinks', type: 'expense', icon: Coffee, color: '#F59E0B' },
  { id: 'transport', name: 'Transport', type: 'expense', icon: Car, color: '#3B82F6' },
  { id: 'bills', name: 'Bills & Utilities', type: 'expense', icon: ReceiptText, color: '#EF4444' },
  { id: 'health', name: 'Health', type: 'expense', icon: HeartPulse, color: '#EC4899' },
  { id: 'shopping', name: 'Shopping', type: 'expense', icon: ShoppingBag, color: '#8B5CF6' },
  { id: 'entertainment', name: 'Entertainment', type: 'expense', icon: Clapperboard, color: '#F97316' },
  { id: 'education', name: 'Education', type: 'expense', icon: BookOpen, color: '#06B6D4' },
  { id: 'rent', name: 'Rent', type: 'expense', icon: Home, color: '#14B8A6' },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', icon: RefreshCw, color: '#6366F1' },
  { id: 'other_expense', name: 'Other', type: 'expense', icon: Box, color: '#64748B' },
  
  { id: 'salary', name: 'Salary', type: 'income', icon: Banknote, color: '#10B981' },
  { id: 'freelance', name: 'Freelance', type: 'income', icon: Briefcase, color: '#3B82F6' },
  { id: 'gift', name: 'Gift', type: 'income', icon: Gift, color: '#F43F5E' },
  { id: 'investment', name: 'Investment', type: 'income', icon: TrendingUp, color: '#F59E0B' },
  { id: 'other_income', name: 'Other', type: 'income', icon: Wallet, color: '#64748B' },
];

export const WALLET_COLORS = [
  { name: 'Vodafone Cash', hex: '#E60000' },
  { name: 'InstaPay', hex: '#6C00FF' },
  { name: 'Green', hex: '#00B85C' },
  { name: 'Black', hex: '#1A1A1A' },
  { name: 'Gold', hex: '#F5A623' },
  { name: 'Deep Blue', hex: '#003366' },
];
