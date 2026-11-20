import type { Transaction } from '@/services/transaction-types';

let localTransactions: Transaction[] = [];

export function getLocalTransactions(): Transaction[] {
  return localTransactions;
}

export function addLocalTransaction(transaction: Transaction) {
  localTransactions = [transaction, ...localTransactions];
}
