export type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  limit: number;
  color: string;
  recurring: boolean;
  lastActivityAt?: number;
};

export type BudgetMap = Record<string, BudgetCategory[]>;

const initialBudgets: BudgetMap = {
  September: [
    { id: 'groceries', name: 'Groceries', spent: 32700, limit: 50000, color: '#4D9DE0', recurring: true },
    { id: 'restaurants', name: 'Restaurants', spent: 18400, limit: 25000, color: '#E07A5F', recurring: true },
    { id: 'entertainment', name: 'Entertainment', spent: 14000, limit: 15000, color: '#9B8AFB', recurring: true },
    { id: 'transportation', name: 'Transportation', spent: 9600, limit: 18000, color: '#55A878', recurring: true },
  ],
  October: [
    { id: 'groceries', name: 'Groceries', spent: 0, limit: 50000, color: '#4D9DE0', recurring: true },
    { id: 'restaurants', name: 'Restaurants', spent: 0, limit: 25000, color: '#E07A5F', recurring: true },
    { id: 'entertainment', name: 'Entertainment', spent: 0, limit: 15000, color: '#9B8AFB', recurring: true },
    { id: 'transportation', name: 'Transportation', spent: 0, limit: 18000, color: '#55A878', recurring: true },
  ],
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let budgets = initialBudgets;
let activeBudgetMonth = 'September';
const listeners = new Set<() => void>();

function publish(nextBudgets: BudgetMap) {
  budgets = nextBudgets;
  listeners.forEach((listener) => listener());
}

function nextMonthName(month: string) {
  const index = monthNames.indexOf(month);
  return index < 0 ? month : monthNames[(index + 1) % monthNames.length];
}

function ensureMonth(month: string, source = budgets) {
  if (source[month]) return source;
  const previousMonth = Object.keys(source).at(-1);
  const previousBudgets = previousMonth ? source[previousMonth] : [];
  return {
    ...source,
    [month]: previousBudgets.filter((budget) => budget.recurring).map((budget) => ({ ...budget, id: `${budget.id}-${month.toLowerCase()}`, spent: 0, lastActivityAt: undefined })),
  };
}

export function getBudgets(): BudgetMap { return budgets; }
export function subscribeToBudgets(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function getActiveBudgetMonth(): string { return activeBudgetMonth; }
export function setActiveBudgetMonth(month: string) { activeBudgetMonth = month; }

export function addBudget(month: string, budget: BudgetCategory) {
  let next = ensureMonth(month);
  if (budget.recurring) {
    next = Object.fromEntries(Object.entries(next).map(([monthName, monthBudgets]) => [monthName, monthBudgets.some((item) => item.name.toLowerCase() === budget.name.toLowerCase()) ? monthBudgets : [...monthBudgets, { ...budget, id: `${budget.id}-${monthName.toLowerCase()}` }]]));
  } else {
    next = { ...next, [month]: [...next[month], budget] };
  }
  publish(next);
}

export function updateBudget(month: string, id: string, changes: Partial<BudgetCategory>) {
  publish({ ...budgets, [month]: budgets[month].map((budget) => budget.id === id ? { ...budget, ...changes } : budget) });
}

export function deleteBudget(month: string, id: string) { publish({ ...budgets, [month]: budgets[month].filter((budget) => budget.id !== id) }); }

export function addBudgetSpent(month: string, categoryName: string, amount: number) {
  const normalizedName = categoryName.trim().toLowerCase();
  let next = ensureMonth(month);
  const monthBudgets = next[month] ?? [];
  const target = monthBudgets.find((budget) => budget.name.trim().toLowerCase() === normalizedName);
  if (!target) return;

  const nextSpent = target.spent + amount;
  next = {
    ...next,
    [month]: monthBudgets.map((budget) => budget.id === target.id ? { ...budget, spent: nextSpent, lastActivityAt: Date.now() } : budget),
  };

  if (amount > 0 && target.recurring && nextSpent > target.limit) {
    const overflow = Math.max(nextSpent - target.limit, 0) - Math.max(target.spent - target.limit, 0);
    const followingMonth = nextMonthName(month);
    next = ensureMonth(followingMonth, next);
    next[followingMonth] = next[followingMonth].map((budget) => budget.name.trim().toLowerCase() === normalizedName ? { ...budget, spent: budget.spent + overflow, lastActivityAt: Date.now() } : budget);
  }
  publish(next);
}
