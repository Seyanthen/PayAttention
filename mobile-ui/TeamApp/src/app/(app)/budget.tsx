import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  limit: number;
  color: string;
  icon: string;
};

const monthData: Record<string, BudgetCategory[]> = {
  September: [
    { id: 'groceries', name: 'Groceries', spent: 327, limit: 500, color: '#4D9DE0', icon: '🛒' },
    { id: 'restaurants', name: 'Restaurants', spent: 184, limit: 250, color: '#E07A5F', icon: '🍽️' },
    { id: 'entertainment', name: 'Entertainment', spent: 140, limit: 150, color: '#9B8AFB', icon: '🎬' },
    { id: 'transportation', name: 'Transportation', spent: 96, limit: 180, color: '#55A878', icon: '🚗' },
  ],
  October: [
    { id: 'groceries', name: 'Groceries', spent: 214, limit: 500, color: '#4D9DE0', icon: '🛒' },
    { id: 'restaurants', name: 'Restaurants', spent: 128, limit: 250, color: '#E07A5F', icon: '🍽️' },
    { id: 'entertainment', name: 'Entertainment', spent: 72, limit: 150, color: '#9B8AFB', icon: '🎬' },
    { id: 'transportation', name: 'Transportation', spent: 54, limit: 180, color: '#55A878', icon: '🚗' },
  ],
};

const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US')}`;

export default function BudgetScreen() {
  const theme = useTheme();
  const [monthIndex, setMonthIndex] = useState(0);
  const months = Object.keys(monthData);
  const month = months[monthIndex];
  const categories = monthData[month];
  const totals = useMemo(() => {
    const budget = categories.reduce((total, category) => total + category.limit, 0);
    const spent = categories.reduce((total, category) => total + category.spent, 0);
    return { budget, spent, remaining: budget - spent, percent: Math.round((spent / budget) * 100) };
  }, [categories]);

  const moveMonth = (direction: -1 | 1) => {
    setMonthIndex((current) => (current + direction + months.length) % months.length);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>YOUR PLAN</Text>
            <Text style={[styles.title, { color: theme.text }]}>Budget</Text>
          </View>
          <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>● On track</Text></View>
        </View>

        <View style={styles.monthRow}>
          <Pressable accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={styles.monthArrow}>
            <Text style={[styles.arrowText, { color: theme.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.monthTitle, { color: theme.text }]}>{month} Budget</Text>
          <Pressable accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={styles.monthArrow}>
            <Text style={[styles.arrowText, { color: theme.text }]}>›</Text>
          </Pressable>
        </View>

        <View style={[styles.overviewCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Total spent</Text>
              <Text style={[styles.overviewAmount, { color: theme.text }]}>{formatCurrency(totals.spent)}</Text>
            </View>
            <View style={styles.percentCircle}><Text style={styles.percentText}>{totals.percent}%</Text></View>
          </View>
          <View style={styles.overviewTrack}><View style={[styles.overviewFill, { width: `${totals.percent}%` }]} /></View>
          <View style={styles.overviewFooter}>
            <Text style={[styles.overviewCaption, { color: theme.textSecondary }]}>of {formatCurrency(totals.budget)} planned</Text>
            <Text style={[styles.remainingText, { color: theme.text }]}>{formatCurrency(totals.remaining)} left</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending by category</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Keep an eye on your biggest expenses</Text>
          </View>
          <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>{categories.length} categories</Text>
        </View>

        <View style={styles.categoryList}>
          {categories.map((category) => {
            const percent = Math.round((category.spent / category.limit) * 100);
            const progress = Math.min(percent, 100);
            const isOver = percent > 100;
            const progressColor = isOver ? '#D64550' : percent >= 90 ? '#E6A23C' : category.color;
            return (
              <View key={category.id} style={[styles.categoryCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.categoryTopRow}>
                  <View style={styles.categoryNameRow}>
                    <View style={[styles.iconBubble, { backgroundColor: `${category.color}22` }]}><Text style={styles.categoryIcon}>{category.icon}</Text></View>
                    <View><Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text><Text style={[styles.categoryLimit, { color: theme.textSecondary }]}>Monthly limit {formatCurrency(category.limit)}</Text></View>
                  </View>
                  <View style={styles.categoryAmount}><Text style={[styles.spentAmount, { color: theme.text }]}>{formatCurrency(category.spent)}</Text><Text style={[styles.percentLabel, { color: progressColor }]}>{isOver ? 'Over' : `${percent}%`}</Text></View>
                </View>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]} /></View>
                <Text style={[styles.progressCaption, { color: theme.textSecondary }]}>{isOver ? `${formatCurrency(category.spent - category.limit)} over budget` : `${formatCurrency(category.limit - category.spent)} remaining`}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.tipCard, { borderColor: theme.backgroundSelected }]}>
          <Text style={styles.tipIcon}>✨</Text>
          <View style={styles.tipCopy}><Text style={[styles.tipTitle, { color: theme.text }]}>A little progress goes a long way</Text><Text style={[styles.tipText, { color: theme.textSecondary }]}>You have {formatCurrency(totals.remaining)} left across your categories this month.</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: Spacing.three, paddingBottom: 48, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.two },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.3 },
  title: { fontSize: 34, fontWeight: '700', marginTop: 2 },
  headerBadge: { backgroundColor: '#DDF5E6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  headerBadgeText: { color: '#247A43', fontSize: 12, fontWeight: '700' },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one },
  monthArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F0F3', alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 28, lineHeight: 30, fontWeight: '300' },
  monthTitle: { fontSize: 21, fontWeight: '700' },
  overviewCard: { borderRadius: 22, padding: Spacing.three, marginTop: Spacing.one },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewLabel: { fontSize: 13, fontWeight: '600' },
  overviewAmount: { fontSize: 32, fontWeight: '700', marginTop: 4 },
  percentCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D9EAFB', alignItems: 'center', justifyContent: 'center' },
  percentText: { color: '#3478B8', fontSize: 15, fontWeight: '800' },
  overviewTrack: { height: 10, borderRadius: 5, backgroundColor: '#D8D9DE', overflow: 'hidden', marginTop: Spacing.three },
  overviewFill: { height: '100%', borderRadius: 5, backgroundColor: '#4D9DE0' },
  overviewFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two },
  overviewCaption: { fontSize: 13 },
  remainingText: { fontSize: 13, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: Spacing.two },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionSubtitle: { fontSize: 13, marginTop: 4 },
  categoryCount: { fontSize: 12, marginBottom: 2 },
  categoryList: { gap: 12 },
  categoryCard: { borderRadius: 18, padding: Spacing.three },
  categoryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBubble: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryIcon: { fontSize: 20 },
  categoryName: { fontSize: 16, fontWeight: '700' },
  categoryLimit: { fontSize: 12, marginTop: 3 },
  categoryAmount: { alignItems: 'flex-end' },
  spentAmount: { fontSize: 17, fontWeight: '700' },
  percentLabel: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  progressTrack: { height: 9, backgroundColor: '#D8D9DE', borderRadius: 5, overflow: 'hidden', marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressCaption: { fontSize: 12, marginTop: 8 },
  tipCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: Spacing.three, marginTop: Spacing.one },
  tipIcon: { fontSize: 22, marginRight: 12 },
  tipCopy: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700' },
  tipText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
});
