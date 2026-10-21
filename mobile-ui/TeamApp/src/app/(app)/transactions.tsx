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

type TransactionKind = 'expense' | 'income';

type Transaction = {
  id: number;
  merchant: string;
  amount: number;
  category: string;
  account: string;
  date: string;
  notes: string;
  kind: TransactionKind;
};

const initialTransactions: Transaction[] = [
  { id: 1, merchant: 'Walmart', amount: 72.31, category: 'Groceries', account: 'Checking Account', date: 'Oct 19, 2026', notes: 'Weekly groceries', kind: 'expense' },
  { id: 2, merchant: 'Paycheck', amount: 1850, category: 'Income', account: 'Checking Account', date: 'Oct 18, 2026', notes: '', kind: 'income' },
  { id: 3, merchant: 'Spotify', amount: 11.99, category: 'Entertainment', account: 'Credit Card', date: 'Oct 17, 2026', notes: 'Monthly subscription', kind: 'expense' },
  { id: 4, merchant: 'Gas Station', amount: 48.2, category: 'Transportation', account: 'Checking Account', date: 'Oct 15, 2026', notes: '', kind: 'expense' },
];

const categories = ['Food', 'Groceries', 'Transportation', 'Bills', 'Entertainment', 'Shopping', 'Income', 'Other'];

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [account, setAccount] = useState('Checking Account');
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [notes, setNotes] = useState('');

  const totals = useMemo(() => transactions.reduce(
    (summary, transaction) => {
      if (transaction.kind === 'income') summary.income += transaction.amount;
      else summary.expenses += transaction.amount;
      return summary;
    },
    { income: 0, expenses: 0 },
  ), [transactions]);

  const openAdd = () => {
    setMerchant(''); setAmount(''); setCategory('Other'); setAccount('Checking Account'); setKind('expense'); setNotes(''); setIsAddVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setIsAddVisible(false);
    setSelectedTransaction(null);
  };

  const saveTransaction = () => {
    const parsedAmount = Number.parseFloat(amount);
    if (!merchant.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setTransactions((current) => [{ id: Date.now(), merchant: merchant.trim(), amount: parsedAmount, category, account, date: formatToday(), notes: notes.trim(), kind }, ...current]);
    closeModal();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View><Text style={styles.title}>Transactions</Text><Text style={styles.subtitle}>Track your income and spending</Text></View>
          <Pressable accessibilityRole="button" style={styles.addButton} onPress={openAdd}><Text style={styles.addButtonText}>+ Add</Text></Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View><Text style={styles.summaryLabel}>This month</Text><Text style={styles.summaryValue}>{formatCurrency(totals.income - totals.expenses)}</Text></View>
          <View style={styles.summaryDivider} />
          <View><Text style={styles.summaryLabel}>Expenses</Text><Text style={[styles.summaryValue, styles.expenseText]}>{formatCurrency(totals.expenses)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Recent transactions</Text>
        {transactions.map((transaction) => (
          <Pressable accessibilityRole="button" key={transaction.id} style={({ pressed }) => [styles.transactionCard, pressed && styles.pressed]} onPress={() => setSelectedTransaction(transaction)}>
            <View style={styles.transactionIcon}><Text style={styles.transactionIconText}>{transaction.kind === 'income' ? '+' : '−'}</Text></View>
            <View style={styles.transactionInfo}><Text style={styles.merchant}>{transaction.merchant}</Text><Text style={styles.transactionMeta}>{transaction.category} · {transaction.date}</Text></View>
            <Text style={[styles.transactionAmount, transaction.kind === 'income' && styles.incomeText]}>{transaction.kind === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
          </Pressable>
        ))}
        {transactions.length === 0 && <Text style={styles.emptyState}>No transactions yet. Add your first one above.</Text>}
      </ScrollView>

      <Modal visible={isAddVisible || selectedTransaction !== null} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>{isAddVisible ? 'Add Transaction' : 'Transaction Details'}</Text><Pressable accessibilityRole="button" onPress={closeModal}><Text style={styles.closeText}>Close</Text></Pressable></View>

              {selectedTransaction ? (
                <View>
                  <View style={styles.detailHero}><Text style={styles.detailMerchant}>{selectedTransaction.merchant}</Text><Text style={[styles.detailAmount, selectedTransaction.kind === 'income' && styles.incomeText]}>{selectedTransaction.kind === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}</Text></View>
                  <DetailRow label="Category" value={selectedTransaction.category} /><DetailRow label="Account" value={selectedTransaction.account} /><DetailRow label="Date" value={selectedTransaction.date} /><DetailRow label="Type" value={selectedTransaction.kind === 'income' ? 'Income' : 'Expense'} />
                  {selectedTransaction.notes ? <DetailRow label="Notes" value={selectedTransaction.notes} /> : null}
                </View>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Description</Text><TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholder="e.g. Coffee shop" />
                  <Text style={styles.inputLabel}>Amount</Text><TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
                  <Text style={styles.inputLabel}>Type</Text>
                  <View style={styles.optionRow}>{(['expense', 'income'] as TransactionKind[]).map((option) => <Pressable key={option} style={[styles.optionButton, kind === option && styles.selectedOption]} onPress={() => setKind(option)}><Text style={[styles.optionText, kind === option && styles.selectedOptionText]}>{option === 'expense' ? 'Expense' : 'Income'}</Text></Pressable>)}</View>
                  <Text style={styles.inputLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{categories.map((option) => <Pressable key={option} style={[styles.categoryButton, category === option && styles.selectedOption]} onPress={() => setCategory(option)}><Text style={[styles.optionText, category === option && styles.selectedOptionText]}>{option}</Text></Pressable>)}</ScrollView>
                  <Text style={styles.inputLabel}>Account</Text>
                  <View style={styles.optionRow}>{['Checking Account', 'Savings Account', 'Credit Card'].map((option) => <Pressable key={option} style={[styles.accountButton, account === option && styles.selectedOption]} onPress={() => setAccount(option)}><Text style={[styles.optionText, account === option && styles.selectedOptionText]}>{option.replace(' Account', '')}</Text></Pressable>)}</View>
                  <Text style={styles.inputLabel}>Notes (optional)</Text><TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} placeholder="Add a note" multiline />
                  <Pressable style={styles.primaryButton} onPress={saveTransaction}><Text style={styles.primaryButtonText}>Add Transaction</Text></Pressable>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function formatCurrency(value: number) { return `$${Math.abs(value).toFixed(2)}`; }
function formatToday() { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()); }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' }, container: { padding: 24, paddingBottom: 48 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' }, subtitle: { marginTop: 4, color: '#64748b' }, addButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8 }, addButtonText: { color: '#fff', fontWeight: 'bold' },
  summaryCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 28 }, summaryLabel: { color: '#64748b', fontSize: 13, marginBottom: 5 }, summaryValue: { color: '#15803d', fontSize: 21, fontWeight: 'bold' }, expenseText: { color: '#dc2626' }, summaryDivider: { width: 1, height: 42, backgroundColor: '#bfdbfe', marginHorizontal: 28 }, sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }, transactionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' }, pressed: { opacity: 0.7 }, transactionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, transactionIconText: { color: '#475569', fontSize: 22, fontWeight: '600' }, transactionInfo: { flex: 1 }, merchant: { color: '#0f172a', fontSize: 16, fontWeight: '600' }, transactionMeta: { color: '#64748b', fontSize: 13, marginTop: 5 }, transactionAmount: { color: '#dc2626', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }, incomeText: { color: '#15803d' }, emptyState: { color: '#64748b', textAlign: 'center', paddingVertical: 32 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' }, keyboardContainer: { width: '100%' }, modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%', minHeight: 360 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' }, closeText: { color: '#2563eb', fontWeight: '600' }, detailHero: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 18, marginBottom: 12 }, detailMerchant: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }, detailAmount: { color: '#dc2626', fontSize: 28, fontWeight: 'bold' }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, detailLabel: { color: '#64748b' }, detailValue: { color: '#0f172a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  inputLabel: { color: '#334155', fontWeight: '600', marginBottom: 6, marginTop: 12 }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, color: '#0f172a', backgroundColor: '#fff' }, notesInput: { minHeight: 76, textAlignVertical: 'top' }, optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, categoryRow: { gap: 8, paddingVertical: 2 }, optionButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }, categoryButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }, accountButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }, selectedOption: { backgroundColor: '#dbeafe', borderColor: '#2563eb' }, optionText: { color: '#475569' }, selectedOptionText: { color: '#1d4ed8', fontWeight: '600' }, primaryButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 12 }, primaryButtonText: { color: '#fff', fontWeight: 'bold' },
});
