import { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AndroidScreenSafeArea } from '@/components/android-screen-safe-area';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinorUnitsAsDollars, parseDollarAmountToMinorUnits, validatePositiveDollarAmount } from '@/services/validation';

type BudgetCategory = { id: string; name: string; spent: number; limit: number; color: string };

const initialBudgets: Record<string, BudgetCategory[]> = {
  September: [
    { id: 'groceries', name: 'Groceries', spent: 32700, limit: 50000, color: '#4D9DE0' },
    { id: 'restaurants', name: 'Restaurants', spent: 18400, limit: 25000, color: '#E07A5F' },
    { id: 'entertainment', name: 'Entertainment', spent: 14000, limit: 15000, color: '#9B8AFB' },
    { id: 'transportation', name: 'Transportation', spent: 9600, limit: 18000, color: '#55A878' },
  ],
  October: [
    { id: 'groceries', name: 'Groceries', spent: 21400, limit: 50000, color: '#4D9DE0' },
    { id: 'restaurants', name: 'Restaurants', spent: 12800, limit: 25000, color: '#E07A5F' },
    { id: 'entertainment', name: 'Entertainment', spent: 7200, limit: 15000, color: '#9B8AFB' },
    { id: 'transportation', name: 'Transportation', spent: 5400, limit: 18000, color: '#55A878' },
  ],
};

const budgetColors = ['#4D9DE0', '#E07A5F', '#9B8AFB', '#55A878', '#D49A4A'];
const formatCurrency = (amount: number) => formatMinorUnitsAsDollars(amount);

export default function BudgetScreen() {
  const theme = useTheme();
  const [budgets, setBudgets] = useState(initialBudgets);
  const [monthIndex, setMonthIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');
  const months = Object.keys(budgets);
  const month = months[monthIndex] ?? months[0];
  const categories = budgets[month];
  const totals = useMemo(() => {
    const budget = categories.reduce((total, category) => total + category.limit, 0);
    const spent = categories.reduce((total, category) => total + category.spent, 0);
    return { budget, spent, remaining: budget - spent, percent: budget ? Math.round((spent / budget) * 100) : 0 };
  }, [categories]);

  const moveMonth = (direction: -1 | 1) => setMonthIndex((current) => (current + direction + months.length) % months.length);
  const closeModal = () => { Keyboard.dismiss(); setIsModalVisible(false); };
  const openCreateModal = () => { setEditingId(null); setName(''); setLimit(''); setError(''); setIsModalVisible(true); };
  const openEditModal = (category: BudgetCategory) => { setEditingId(category.id); setName(category.name); setLimit((category.limit / 100).toFixed(2)); setError(''); setIsModalVisible(true); };

  const saveBudget = () => {
    const trimmedName = name.trim();
    const limitAmount = parseDollarAmountToMinorUnits(limit);
    if (!trimmedName || limitAmount === undefined) {
      setError(!trimmedName ? 'Enter a budget name.' : validatePositiveDollarAmount(limit, 'Monthly limit') ?? 'Enter a valid monthly limit.');
      return;
    }
    setBudgets((current) => ({
      ...current,
      [month]: editingId
        ? current[month].map((category) => category.id === editingId ? { ...category, name: trimmedName, limit: limitAmount } : category)
        : [...current[month], { id: `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, name: trimmedName, spent: 0, limit: limitAmount, color: budgetColors[current[month].length % budgetColors.length] }],
    }));
    closeModal();
  };

  const confirmDelete = (category: BudgetCategory) => Alert.alert('Delete budget?', `Remove “${category.name}” from ${month}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => setBudgets((current) => ({ ...current, [month]: current[month].filter((item) => item.id !== category.id) })) },
  ]);

  return (
    <AndroidScreenSafeArea style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={[styles.eyebrow, { color: theme.textSecondary }]}>YOUR PLAN</Text><Text style={[styles.title, { color: theme.text }]}>Budget</Text></View><View style={styles.headerBadge}><Text style={styles.headerBadgeText}>On track</Text></View></View>
        <View style={styles.monthRow}><Pressable accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={styles.monthArrow}><Text style={[styles.arrowText, { color: theme.text }]}>‹</Text></Pressable><Text style={[styles.monthTitle, { color: theme.text }]}>{month} Budget</Text><Pressable accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={styles.monthArrow}><Text style={[styles.arrowText, { color: theme.text }]}>›</Text></Pressable></View>
        <View style={[styles.overviewCard, { backgroundColor: theme.backgroundElement }]}><View style={styles.overviewHeader}><View><Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Total spent</Text><Text style={[styles.overviewAmount, { color: theme.text }]}>{formatCurrency(totals.spent)}</Text></View><View style={styles.percentCircle}><Text style={styles.percentText}>{totals.percent}%</Text></View></View><View style={styles.overviewTrack}><View style={[styles.overviewFill, { width: `${Math.min(totals.percent, 100)}%` }]} /></View><View style={styles.overviewFooter}><Text style={[styles.overviewCaption, { color: theme.textSecondary }]}>of {formatCurrency(totals.budget)} planned</Text><Text style={[styles.remainingText, { color: theme.text }]}>{formatCurrency(totals.remaining)} left</Text></View></View>
        <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: theme.text }]}>Spending by category</Text><Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Keep an eye on your biggest expenses</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Add budget" onPress={openCreateModal} style={styles.addButton}><Text style={styles.addButtonText}>+ Add budget</Text></Pressable></View>
        <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>{categories.length} categories</Text>
        <View style={styles.categoryList}>{categories.map((category) => { const percent = category.limit ? Math.round((category.spent / category.limit) * 100) : 0; const progress = Math.min(percent, 100); const isOver = percent > 100; const progressColor = isOver ? '#D64550' : percent >= 90 ? '#E6A23C' : category.color; return <View key={category.id} style={[styles.categoryCard, { backgroundColor: theme.backgroundElement }]}><View style={styles.categoryTopRow}><View style={styles.categoryNameRow}><View style={[styles.iconBubble, { backgroundColor: `${category.color}22` }]}><Text style={[styles.categoryIcon, { color: category.color }]}>{category.name.slice(0, 2).toUpperCase()}</Text></View><View><Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text><Text style={[styles.categoryLimit, { color: theme.textSecondary }]}>Monthly limit {formatCurrency(category.limit)}</Text></View></View><View style={styles.categoryAmount}><Text style={[styles.spentAmount, { color: theme.text }]}>{formatCurrency(category.spent)}</Text><Text style={[styles.percentLabel, { color: progressColor }]}>{isOver ? 'Over' : `${percent}%`}</Text></View></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]} /></View><Text style={[styles.progressCaption, { color: theme.textSecondary }]}>{isOver ? `${formatCurrency(category.spent - category.limit)} over budget` : `${formatCurrency(category.limit - category.spent)} remaining`}</Text><View style={styles.cardActions}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${category.name} budget`} onPress={() => openEditModal(category)}><Text style={styles.editButtonText}>Edit</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${category.name} budget`} onPress={() => confirmDelete(category)}><Text style={styles.deleteButtonText}>Delete</Text></Pressable></View></View>; })}</View>
        <View style={[styles.tipCard, { borderColor: theme.backgroundSelected }]}><Text style={styles.tipIcon}>✦</Text><View style={styles.tipCopy}><Text style={[styles.tipTitle, { color: theme.text }]}>A little progress goes a long way</Text><Text style={[styles.tipText, { color: theme.textSecondary }]}>You have {formatCurrency(totals.remaining)} left across your categories this month.</Text></View></View>
      </ScrollView>
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={closeModal}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: theme.background }]}><View style={styles.modalHeader}><View><Text style={[styles.modalTitle, { color: theme.text }]}>{editingId ? 'Edit budget' : 'New budget'}</Text><Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Set a monthly spending limit.</Text></View><Pressable accessibilityLabel="Close budget form" onPress={closeModal}><Text style={[styles.closeButton, { color: theme.textSecondary }]}>Close</Text></Pressable></View><Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Budget name</Text><TextInput autoFocus style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="e.g. Utilities" placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} /><Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Monthly limit in US dollars</Text><TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="$0.00" placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" value={limit} onChangeText={setLimit} />{error ? <Text style={styles.formError}>{error}</Text> : null}<Pressable accessibilityRole="button" onPress={saveBudget} style={styles.saveButton}><Text style={styles.saveButtonText}>{editingId ? 'Save changes' : 'Create budget'}</Text></Pressable></View></KeyboardAvoidingView></Modal>
    </AndroidScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, container: { paddingHorizontal: Spacing.three, paddingBottom: 48, gap: Spacing.three }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.two }, eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.3 }, title: { fontSize: 34, fontWeight: '700', marginTop: 2 }, headerBadge: { backgroundColor: '#DDF5E6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }, headerBadgeText: { color: '#247A43', fontSize: 12, fontWeight: '700' }, monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one }, monthArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F0F3', alignItems: 'center', justifyContent: 'center' }, arrowText: { fontSize: 28, lineHeight: 30, fontWeight: '300' }, monthTitle: { fontSize: 21, fontWeight: '700' }, overviewCard: { borderRadius: 22, padding: Spacing.three, marginTop: Spacing.one }, overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, overviewLabel: { fontSize: 13, fontWeight: '600' }, overviewAmount: { fontSize: 32, fontWeight: '700', marginTop: 4 }, percentCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D9EAFB', alignItems: 'center', justifyContent: 'center' }, percentText: { color: '#3478B8', fontSize: 15, fontWeight: '800' }, overviewTrack: { height: 10, borderRadius: 5, backgroundColor: '#D8D9DE', overflow: 'hidden', marginTop: Spacing.three }, overviewFill: { height: '100%', borderRadius: 5, backgroundColor: '#4D9DE0' }, overviewFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two }, overviewCaption: { fontSize: 13 }, remainingText: { fontSize: 13, fontWeight: '700' }, sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: Spacing.two }, sectionTitle: { fontSize: 20, fontWeight: '700' }, sectionSubtitle: { fontSize: 13, marginTop: 4 }, categoryCount: { fontSize: 12, marginTop: -Spacing.two }, addButton: { backgroundColor: '#3478B8', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }, addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, categoryList: { gap: 12 }, categoryCard: { borderRadius: 18, padding: Spacing.three }, categoryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, categoryNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 }, iconBubble: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, categoryIcon: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }, categoryName: { fontSize: 16, fontWeight: '700' }, categoryLimit: { fontSize: 12, marginTop: 3 }, categoryAmount: { alignItems: 'flex-end' }, spentAmount: { fontSize: 17, fontWeight: '700' }, percentLabel: { fontSize: 12, fontWeight: '700', marginTop: 3 }, progressTrack: { height: 9, backgroundColor: '#D8D9DE', borderRadius: 5, overflow: 'hidden', marginTop: 16 }, progressFill: { height: '100%', borderRadius: 5 }, progressCaption: { fontSize: 12, marginTop: 8 }, cardActions: { flexDirection: 'row', gap: 16, marginTop: 12 }, editButtonText: { color: '#3478B8', fontSize: 12, fontWeight: '700' }, deleteButtonText: { color: '#D64550', fontSize: 12, fontWeight: '700' }, tipCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: Spacing.three, marginTop: Spacing.one }, tipIcon: { fontSize: 22, marginRight: 12 }, tipCopy: { flex: 1 }, tipTitle: { fontSize: 14, fontWeight: '700' }, tipText: { fontSize: 12, lineHeight: 18, marginTop: 4 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.45)' }, modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.four, gap: 10 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.two }, modalTitle: { fontSize: 24, fontWeight: '800' }, modalSubtitle: { fontSize: 13, marginTop: 4 }, closeButton: { fontSize: 13, fontWeight: '700', paddingTop: 4 }, inputLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 }, input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, marginTop: 5 }, formError: { color: '#D64550', fontSize: 12, lineHeight: 17 }, saveButton: { backgroundColor: '#3478B8', borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: Spacing.two }, saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
