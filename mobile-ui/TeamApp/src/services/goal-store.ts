import { isMockAuthenticated } from '@/services/auth';
import { createGoal as createGoalRequest, createGoalContribution, deleteGoal as deleteGoalRequest, deleteGoalContribution, getGoals as getGoalsRequest, type ApiGoal } from '@/services/api';

export type SavingsGoal = {
  id: string;
  name: string;
  saved: number;
  target: number;
  deadline: string;
  color: string;
  icon: string;
  backendId?: number;
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
export async function loadGoals(): Promise<void> {
  if (isMockAuthenticated()) return;
  const rows = await getGoalsRequest();
  publish(rows.map(goalFromApi));
}

export async function createPersistedGoal(input: { name: string; target: number; saved: number; deadline: string }): Promise<void> {
  if (isMockAuthenticated()) {
    addGoal({ id: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, name: input.name, saved: input.saved, target: input.target, deadline: input.deadline || 'No deadline', color: '#4D9DE0', icon: input.name.slice(0, 2).toUpperCase() });
    return;
  }
  const goal = await createGoalRequest({ name: input.name, target_amount_minor: input.target, target_date: deadlineToApi(input.deadline) });
  const created = goalFromApi(goal);
  publish(input.saved > 0 ? [...goals, { ...created, saved: input.saved }] : [...goals, created]);
  if (input.saved > 0 && created.backendId) {
    const contribution = await createGoalContribution(created.backendId, input.saved, new Date().toISOString().slice(0, 10));
    publish(goals.map((item) => item.id === created.id ? { ...item, saved: contribution.goal.current_amount_minor } : item));
  }
}

export async function deletePersistedGoal(goal: SavingsGoal): Promise<void> {
  if (!isMockAuthenticated() && goal.backendId) await deleteGoalRequest(goal.backendId);
  deleteGoal(goal.id);
}

export async function addGoalContribution(id: string, amount: number): Promise<number | undefined> {
  const goal = goals.find((item) => item.id === id);
  if (!goal) return undefined;
  if (!isMockAuthenticated() && goal.backendId) {
    const result = await createGoalContribution(goal.backendId, amount, new Date().toISOString().slice(0, 10));
    publish(goals.map((item) => item.id === id ? { ...item, saved: result.goal.current_amount_minor } : item));
    return result.contribution.id;
  }
  publish(goals.map((goal) => goal.id === id ? { ...goal, saved: goal.saved + amount } : goal));
  return undefined;
}

export async function removeGoalContribution(id: string, contributionId: number): Promise<void> {
  const goal = goals.find((item) => item.id === id);
  if (!goal?.backendId || isMockAuthenticated()) return;
  await deleteGoalContribution(goal.backendId, contributionId);
  publish(goals.map((item) => item.id === id ? { ...item, saved: Math.max(item.saved - 0, 0) } : item));
  await loadGoals();
}

function goalFromApi(goal: ApiGoal): SavingsGoal {
  return { id: String(goal.id), backendId: goal.id, name: goal.name, saved: goal.current_amount_minor, target: goal.target_amount_minor, deadline: goal.target_date ? formatDeadline(goal.target_date) : 'No deadline', color: '#4D9DE0', icon: goal.name.slice(0, 2).toUpperCase() };
}

function deadlineToApi(value: string): string | null {
  const parsed = new Date(value);
  return value.trim() && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function formatDeadline(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}
