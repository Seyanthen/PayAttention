import { readPersistedJson, writePersistedJson } from '@/services/persistent-storage';

export type SharedAccount = {
  id: number;
  name: string;
  type: string;
  balance: number;
  last4: string;
  persisted: boolean;
};

const initialAccounts: SharedAccount[] = [];

let accounts = initialAccounts;
const STORAGE_KEY = 'pay-attention.accounts';
let hasPersistedSnapshot = false;
const listeners = new Set<() => void>();

function publish(nextAccounts: SharedAccount[]) {
  accounts = nextAccounts;
  void writePersistedJson(STORAGE_KEY, accounts);
  listeners.forEach((listener) => listener());
}

export function getAccounts(): SharedAccount[] { return accounts; }
export function subscribeToAccounts(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export async function loadAccounts(): Promise<void> {
  const stored = await readPersistedJson<SharedAccount[]>(STORAGE_KEY);
  if (stored) { accounts = stored; hasPersistedSnapshot = true; listeners.forEach((listener) => listener()); }
}
export function hasPersistedAccounts(): boolean { return hasPersistedSnapshot; }
export function replaceAccounts(nextAccounts: SharedAccount[]) { publish(nextAccounts); }
export function addAccount(account: SharedAccount) { publish([...accounts, account]); }
export function replaceAccount(account: SharedAccount) { publish(accounts.map((item) => item.id === account.id ? account : item)); }
export function removeAccount(id: number) { publish(accounts.filter((account) => account.id !== id)); }

export function adjustAccountBalance(name: string, amount: number) {
  publish(accounts.map((account) => account.name === name ? { ...account, balance: account.balance + amount } : account));
}
