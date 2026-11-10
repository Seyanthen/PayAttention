import { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinorUnitsAsDollars, parseDollarAmountToMinorUnits, validatePositiveDollarAmount } from '@/services/validation';

type SavingsGoal = {
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

const formatCurrency = (amount: number) => formatMinorUnitsAsDollars(amount);

export default function GoalsScreen() {
  const theme = useTheme();
  const [goals, setGoals] = useState(initialGoals);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  const totals = useMemo(() => {
    const savedAmount = goals.reduce((total, goal) => total + goal.saved, 0);
    const targetAmount = goals.reduce((total, goal) => total + goal.target, 0);
    return { saved: savedAmount, target: targetAmount, percent: targetAmount ? Math.round((savedAmount / targetAmount) * 100) : 0 };
  }, [goals]);

  const openModal = () => {
    setName(''); setTarget(''); setSaved(''); setDeadline(''); setError(''); setIsModalVisible(true);
  };
  const closeModal = () => { Keyboard.dismiss(); setIsModalVisible(false); };
  const createGoal = () => {
    const trimmedName = name.trim();
    const targetAmount = parseDollarAmountToMinorUnits(target);
    const savedAmount = saved.trim() ? parseDollarAmountToMinorUnits(saved, true) : 0;
    if (!trimmedName || targetAmount === undefined || savedAmount === undefined || savedAmount > targetAmount) {
      setError(validatePositiveDollarAmount(target, 'Target amount') ?? 'Enter a valid saved amount up to the target.');
      return;
    }
    setGoals((current) => [...current, {
      id: `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: trimmedName, saved: savedAmount, target: targetAmount, deadline: deadline.trim() || 'No deadline', color: '#4D9DE0', icon: trimmedName.slice(0, 2).toUpperCase(),
    }]);
    closeModal();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={[styles.eyebrow, { color: theme.textSecondary }]}>YOUR PLAN</Text><Text style={[styles.title, { color: theme.text }]}>Savings goals</Text></View>
          <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>On track</Text></View>
        </View>
        <Text style={[styles.intro, { color: theme.textSecondary }]}>Give your money a destination and make steady progress toward what matters.</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}><View><Text style={styles.summaryLabel}>Saved across goals</Text><Text style={styles.summaryAmount}>{formatCurrency(totals.saved)}</Text></View><View style={styles.summaryPercent}><Text style={styles.summaryPercentText}>{totals.percent}%</Text></View></View>
          <View style={styles.summaryTrack}><View style={[styles.summaryFill, { width: `${Math.min(totals.percent, 100)}%` }]} /></View>
          <View style={styles.summaryFooter}><Text style={styles.summaryCaption}>of {formatCurrency(totals.target)} total target</Text><Text style={styles.summaryCaption}>{goals.length} goals</Text></View>
        </View>
        <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: theme.text }]}>Your goals</Text><Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Small deposits add up</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Add savings goal" onPress={openModal} style={styles.addButton}><Text style={styles.addButtonText}>+ Add goal</Text></Pressable></View>
        <View style={styles.goalList}>
          {goals.map((goal) => {
            const percent = Math.round((goal.saved / goal.target) * 100);
            return <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.goalTopRow}><View style={styles.goalNameRow}><View style={[styles.iconBubble, { backgroundColor: `${goal.color}22` }]}><Text style={[styles.goalIcon, { color: goal.color }]}>{goal.icon}</Text></View><View><Text style={[styles.goalName, { color: theme.text }]}>{goal.name}</Text><Text style={[styles.goalDeadline, { color: theme.textSecondary }]}>Target {goal.deadline}</Text></View></View><View style={styles.goalAmount}><Text style={[styles.savedAmount, { color: theme.text }]}>{formatCurrency(goal.saved)}</Text><Text style={[styles.targetAmount, { color: theme.textSecondary }]}>of {formatCurrency(goal.target)}</Text></View></View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: goal.color }]} /></View>
              <Text style={[styles.progressCaption, { color: theme.textSecondary }]}>{percent}% complete · {formatCurrency(Math.max(goal.target - goal.saved, 0))} to go</Text>
            </View>;
          })}
        </View>
      </ScrollView>
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}><View><Text style={[styles.modalTitle, { color: theme.text }]}>New savings goal</Text><Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Set a target and start making progress.</Text></View><Pressable accessibilityLabel="Close savings goal form" onPress={closeModal}><Text style={[styles.closeButton, { color: theme.textSecondary }]}>Close</Text></Pressable></View>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Goal name</Text>
            <TextInput autoFocus style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="e.g. Emergency fund" placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} />
            <View style={styles.inputRow}><View style={styles.inputColumn}><Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target amount in US dollars</Text><TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="$0.00" placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" value={target} onChangeText={setTarget} /></View><View style={styles.inputColumn}><Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Already saved in US dollars</Text><TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="$0.00" placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" value={saved} onChangeText={setSaved} /></View></View>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target date <Text style={styles.optionalText}>(optional)</Text></Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="e.g. Dec 2026" placeholderTextColor={theme.textSecondary} value={deadline} onChangeText={setDeadline} />
            {error ? <Text style={styles.formError}>{error}</Text> : null}
            <Pressable accessibilityRole="button" onPress={createGoal} style={styles.saveButton}><Text style={styles.saveButtonText}>Create goal</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, container: { paddingHorizontal: Spacing.three, paddingBottom: 48, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.two }, eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.3 }, title: { fontSize: 34, fontWeight: '700', marginTop: 2 },
  headerBadge: { backgroundColor: '#DDF5E6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }, headerBadgeText: { color: '#247A43', fontSize: 12, fontWeight: '700' }, intro: { fontSize: 14, lineHeight: 21, marginTop: -Spacing.one },
  summaryCard: { backgroundColor: '#EAF4FF', borderRadius: 20, padding: Spacing.three }, summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, summaryLabel: { color: '#3478B8', fontSize: 13, fontWeight: '700' }, summaryAmount: { color: '#1E4F7A', fontSize: 30, fontWeight: '800', marginTop: 4 }, summaryPercent: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, summaryPercentText: { color: '#3478B8', fontSize: 15, fontWeight: '800' }, summaryTrack: { height: 9, backgroundColor: '#CFE3F7', borderRadius: 5, overflow: 'hidden', marginTop: Spacing.three }, summaryFill: { height: '100%', borderRadius: 5, backgroundColor: '#3478B8' }, summaryFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two }, summaryCaption: { color: '#3478B8', fontSize: 12, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: Spacing.two }, sectionTitle: { fontSize: 20, fontWeight: '700' }, sectionSubtitle: { fontSize: 13, marginTop: 4 }, addButton: { backgroundColor: '#3478B8', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }, addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, goalList: { gap: 12 }, goalCard: { borderRadius: 18, padding: Spacing.three }, goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, goalNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 }, iconBubble: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, goalIcon: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }, goalName: { fontSize: 16, fontWeight: '700' }, goalDeadline: { fontSize: 12, marginTop: 3 }, goalAmount: { alignItems: 'flex-end' }, savedAmount: { fontSize: 17, fontWeight: '700' }, targetAmount: { fontSize: 12, marginTop: 3 }, progressTrack: { height: 9, backgroundColor: '#D8D9DE', borderRadius: 5, overflow: 'hidden', marginTop: 16 }, progressFill: { height: '100%', borderRadius: 5 }, progressCaption: { fontSize: 12, marginTop: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.45)' }, modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.four, gap: 10 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.two }, modalTitle: { fontSize: 24, fontWeight: '800' }, modalSubtitle: { fontSize: 13, marginTop: 4 }, closeButton: { fontSize: 13, fontWeight: '700', paddingTop: 4 }, inputLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 }, optionalText: { fontWeight: '400' }, inputRow: { flexDirection: 'row', gap: 10 }, inputColumn: { flex: 1 }, input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, marginTop: 5 }, formError: { color: '#D64550', fontSize: 12, lineHeight: 17 }, saveButton: { backgroundColor: '#3478B8', borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: Spacing.two }, saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
