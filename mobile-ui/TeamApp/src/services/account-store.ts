export type SharedAccount = {
  id: number;
  name: string;
  type: string;
  balance: number;
  last4: string;
  persisted: boolean;
};

const initialAccounts: SharedAccount[] = [
  { id: 1, name: 'Checking Account', type: 'Checking', balance: 425075, last4: '1842', persisted: false },
  { id: 2, name: 'Savings Account', type: 'Savings', balance: 630000, last4: '9077', persisted: false },
  { id: 3, name: 'Credit Card', type: 'Credit', balance: -24820, last4: '3319', persisted: false },
];

let accounts = initialAccounts;
const listeners = new Set<() => void>();

function publish(nextAccounts: SharedAccount[]) {
  accounts = nextAccounts;
  listeners.forEach((listener) => listener());
}

export function getAccounts(): SharedAccount[] { return accounts; }
export function subscribeToAccounts(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function replaceAccounts(nextAccounts: SharedAccount[]) { publish(nextAccounts); }
export function addAccount(account: SharedAccount) { publish([...accounts, account]); }
export function replaceAccount(account: SharedAccount) { publish(accounts.map((item) => item.id === account.id ? account : item)); }
export function removeAccount(id: number) { publish(accounts.filter((account) => account.id !== id)); }

export function adjustAccountBalance(name: string, amount: number) {
  publish(accounts.map((account) => account.name === name ? { ...account, balance: account.balance + amount } : account));
}
