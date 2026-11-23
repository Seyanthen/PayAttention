import type { Transaction } from '@/services/transaction-types';
import { readPersistedJson, writePersistedJson } from '@/services/persistent-storage';

let localTransactions: Transaction[] = [];
const listeners = new Set<() => void>();
const STORAGE_KEY = 'pay-attention.transactions';

export function getLocalTransactions(): Transaction[] {
  return localTransactions;
}

export function subscribeToLocalTransactions(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export async function loadLocalTransactions(): Promise<void> {
  const stored = await readPersistedJson<Transaction[]>(STORAGE_KEY);
  if (stored) { localTransactions = stored; listeners.forEach((listener) => listener()); }
}

export function addLocalTransaction(transaction: Transaction) {
  localTransactions = [transaction, ...localTransactions];
  void writePersistedJson(STORAGE_KEY, localTransactions);
  listeners.forEach((listener) => listener());
}

export function removeLocalTransaction(id: number) {
  localTransactions = localTransactions.filter((transaction) => transaction.id !== id);
  void writePersistedJson(STORAGE_KEY, localTransactions);
  listeners.forEach((listener) => listener());
}
