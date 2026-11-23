export type TransactionKind = 'expense' | 'income' | 'transfer' | 'goal';

export type Transaction = {
  id: number;
  merchant: string;
  amount: number;
  category: string;
  categoryId?: string;
  contributionId?: number;
  account: string;
  transferAccount?: string;
  date: string;
  timestamp?: string;
  notes: string;
  kind: TransactionKind;
};
