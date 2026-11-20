export type SavingsGoal = {
  id: string;
  name: string;
  saved: number;
  target: number;
  deadline: string;
  color: string;
  icon: string;
};

const initialGoals: SavingsGoal[] = [
  { id: 'emergency-fund', name: 'Emergency fund', saved: 420000, target: 1000000, deadline: 'Dec 2026', color: '#55A878', icon: 'EF' },
  { id: 'new-laptop', name: 'New laptop', saved: 95000, target: 240000, deadline: 'Aug 2026', color: '#9B8AFB', icon: 'NL' },
  { id: 'weekend-trip', name: 'Weekend trip', saved: 62000, target: 120000, deadline: 'Jun 2026', color: '#E07A5F', icon: 'WT' },
];

let goals = initialGoals;
const listeners = new Set<() => void>();

function publish(nextGoals: SavingsGoal[]) {
  goals = nextGoals;
  listeners.forEach((listener) => listener());
}

export function getGoals(): SavingsGoal[] { return goals; }

export function subscribeToGoals(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addGoal(goal: SavingsGoal) { publish([...goals, goal]); }
export function deleteGoal(id: string) { publish(goals.filter((goal) => goal.id !== id)); }
export function addGoalContribution(id: string, amount: number) {
  publish(goals.map((goal) => goal.id === id ? { ...goal, saved: goal.saved + amount } : goal));
}
