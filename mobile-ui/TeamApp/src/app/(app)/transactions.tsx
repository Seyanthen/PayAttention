import { useEffect, useMemo, useRef, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { authenticatedGet, getApiErrorMessage } from '@/services/api';
import { validateTransaction, validateTransactionFilters, type ValidationErrors } from '@/services/validation';

type TransactionKind = 'expense' | 'income' | 'transfer';

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

type ApiTransaction = {
  id: number;
  account: number;
  category: number | null;
  transaction_type: TransactionKind;
  amount_minor: number;
  occurred_on: string;
  merchant: string;
  note: string;
};

type Lookup = { id: number; name: string; category_type?: 'expense' | 'income' };

type TransactionFilters = {
  search: string;
  account: string;
  category: string;
  transactionType: '' | TransactionKind;
  startDate: string;
  endDate: string;
  minAmountMinor: string;
  maxAmountMinor: string;
};

const initialTransactions: Transaction[] = [];

const categories = ['Food', 'Groceries', 'Transportation', 'Bills', 'Entertainment', 'Shopping', 'Income', 'Other'];

export default function TransactionsScreen() {
  const isMounted = useRef(true);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [accounts, setAccounts] = useState<Lookup[]>([]);
  const [lookupCategories, setLookupCategories] = useState<Lookup[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({ search: '', account: '', category: '', transactionType: '', startDate: '', endDate: '', minAmountMinor: '', maxAmountMinor: '' });
  const [filterErrors, setFilterErrors] = useState<ValidationErrors>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [account, setAccount] = useState('Checking Account');
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [date, setDate] = useState(formatToday());
  const [notes, setNotes] = useState('');
  const [transferAccount, setTransferAccount] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  function transactionFromApi(row: ApiTransaction, accountRows: Lookup[], categoryRows: Lookup[]): Transaction {
    return {
      id: row.id,
      merchant: row.merchant || 'Untitled transaction',
      amount: row.amount_minor,
      category: categoryRows.find((item) => item.id === row.category)?.name ?? 'Uncategorized',
      account: accountRows.find((item) => item.id === row.account)?.name ?? `Account ${row.account}`,
      date: row.occurred_on,
      notes: row.note,
      kind: row.transaction_type,
    };
  }

  function queryFor(nextFilters = filters) {
    const query = new URLSearchParams();
    if (nextFilters.search.trim()) query.set('search', nextFilters.search.trim());
    if (nextFilters.account) query.set('account', nextFilters.account);
    if (nextFilters.category) query.set('category', nextFilters.category);
    if (nextFilters.transactionType) query.set('transaction_type', nextFilters.transactionType);
    if (nextFilters.startDate.trim()) query.set('start_date', nextFilters.startDate.trim());
    if (nextFilters.endDate.trim()) query.set('end_date', nextFilters.endDate.trim());
    if (nextFilters.minAmountMinor.trim()) query.set('min_amount_minor', nextFilters.minAmountMinor.trim());
    if (nextFilters.maxAmountMinor.trim()) query.set('max_amount_minor', nextFilters.maxAmountMinor.trim());
    return query.toString();
  }

  async function loadTransactions(refresh: boolean, nextFilters = filters) {
    if (refresh) setIsRefreshing(true);
    else setIsInitialLoading(true);
    setLoadError('');
    try {
      const suffix = queryFor(nextFilters);
      const [transactionResponse, accountResponse, categoryResponse] = await Promise.all([
        authenticatedGet(`/transactions/${suffix ? `?${suffix}` : ''}`),
        authenticatedGet('/accounts/'),
        authenticatedGet('/categories/'),
      ]);
      const [transactionRows, accountRows, categoryRows] = await Promise.all([
        transactionResponse.json() as Promise<unknown>,
        accountResponse.json() as Promise<unknown>,
        categoryResponse.json() as Promise<unknown>,
      ]);
      if (!Array.isArray(transactionRows) || !Array.isArray(accountRows) || !Array.isArray(categoryRows)) {
        throw new Error('Invalid transaction response.');
      }
      if (!isMounted.current) return;
      const typedAccounts = accountRows as Lookup[];
      const typedCategories = categoryRows as Lookup[];
      setAccounts(typedAccounts);
      setLookupCategories(typedCategories);
      setTransactions((transactionRows as ApiTransaction[]).map((row) => transactionFromApi(row, typedAccounts, typedCategories)));
    } catch (error) {
      if (isMounted.current) setLoadError(getApiErrorMessage(error, 'Unable to load transactions. Please try again.'));
    } finally {
      if (isMounted.current) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadTransactions(false);
  }, []);

  const applyFilters = () => {
    const nextErrors = validateTransactionFilters(filters);
    setFilterErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) void loadTransactions(true);
  };

  const clearFilters = () => {
    const cleared: TransactionFilters = { search: '', account: '', category: '', transactionType: '', startDate: '', endDate: '', minAmountMinor: '', maxAmountMinor: '' };
    setFilters(cleared);
    setFilterErrors({});
    void loadTransactions(true, cleared);
  };

  const totals = useMemo(() => transactions.reduce(
    (summary, transaction) => {
      if (transaction.kind === 'income') summary.income += transaction.amount;
      else summary.expenses += transaction.amount;
      return summary;
    },
    { income: 0, expenses: 0 },
  ), [transactions]);

  const openAdd = () => {
    setMerchant(''); setAmount(''); setCategory('Other'); setAccount('Checking Account'); setKind('expense'); setDate(formatToday()); setNotes(''); setTransferAccount(''); setFieldErrors({}); setIsAddVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setIsAddVisible(false);
    setSelectedTransaction(null);
    setIsHistoryVisible(false);
  };

  const saveTransaction = () => {
    const nextErrors = validateTransaction({
      merchant,
      amountMinor: amount,
      date,
      transactionType: kind,
      categoryType: kind === 'income' ? 'income' : kind === 'expense' ? 'expense' : undefined,
      account,
      transferAccount,
    });
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setTransactions((current) => [{ id: Date.now(), merchant: merchant.trim(), amount: Number(amount.trim()), category, account, date: date.trim(), notes: notes.trim(), kind }, ...current]);
    closeModal();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View><Text style={styles.title}>Transactions</Text><Text style={styles.subtitle}>Track your income and spending</Text></View>
          <Pressable accessibilityRole="button" style={styles.addButton} onPress={openAdd}><Text style={styles.addButtonText}>+ Add</Text></Pressable>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Search and filter</Text>
          <TextInput
            accessibilityLabel="Search transactions"
            style={styles.input}
            value={filters.search}
            onChangeText={(value) => setFilters((current) => ({ ...current, search: value }))}
            placeholder="Search merchant or note"
          />
          <Text style={styles.inputLabel}>Account</Text>
          <View style={styles.optionRow}>
            <Pressable style={[styles.optionButton, !filters.account && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, account: '' }))}><Text style={styles.optionText}>All</Text></Pressable>
            {accounts.map((option) => <Pressable key={option.id} style={[styles.optionButton, filters.account === String(option.id) && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, account: String(option.id) }))}><Text style={styles.optionText}>{option.name}</Text></Pressable>)}
          </View>
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.optionRow}>
            <Pressable style={[styles.optionButton, !filters.category && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, category: '' }))}><Text style={styles.optionText}>All</Text></Pressable>
            {lookupCategories.map((option) => <Pressable key={option.id} style={[styles.optionButton, filters.category === String(option.id) && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, category: String(option.id) }))}><Text style={styles.optionText}>{option.name}</Text></Pressable>)}
          </View>
          <Text style={styles.inputLabel}>Type</Text>
          <View style={styles.optionRow}>{(['', 'expense', 'income', 'transfer'] as const).map((option) => <Pressable key={option || 'all'} style={[styles.optionButton, filters.transactionType === option && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, transactionType: option }))}><Text style={styles.optionText}>{option ? option[0].toUpperCase() + option.slice(1) : 'All'}</Text></Pressable>)}</View>
          <View style={styles.filterColumns}>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>Start date</Text><TextInput style={styles.input} value={filters.startDate} onChangeText={(value) => { setFilters((current) => ({ ...current, startDate: value })); setFilterErrors((current) => ({ ...current, startDate: undefined })); }} placeholder="YYYY-MM-DD" />{filterErrors.startDate ? <Text style={styles.fieldError}>{filterErrors.startDate}</Text> : null}</View>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>End date</Text><TextInput style={styles.input} value={filters.endDate} onChangeText={(value) => { setFilters((current) => ({ ...current, endDate: value })); setFilterErrors((current) => ({ ...current, endDate: undefined })); }} placeholder="YYYY-MM-DD" />{filterErrors.endDate ? <Text style={styles.fieldError}>{filterErrors.endDate}</Text> : null}</View>
          </View>
          <View style={styles.filterColumns}>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>Minimum amount (minor units)</Text><TextInput style={styles.input} value={filters.minAmountMinor} onChangeText={(value) => { setFilters((current) => ({ ...current, minAmountMinor: value })); setFilterErrors((current) => ({ ...current, minAmountMinor: undefined, maxAmountMinor: undefined })); }} placeholder="2500" keyboardType="number-pad" />{filterErrors.minAmountMinor ? <Text style={styles.fieldError}>{filterErrors.minAmountMinor}</Text> : null}</View>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>Maximum amount (minor units)</Text><TextInput style={styles.input} value={filters.maxAmountMinor} onChangeText={(value) => { setFilters((current) => ({ ...current, maxAmountMinor: value })); setFilterErrors((current) => ({ ...current, maxAmountMinor: undefined })); }} placeholder="10000" keyboardType="number-pad" />{filterErrors.maxAmountMinor ? <Text style={styles.fieldError}>{filterErrors.maxAmountMinor}</Text> : null}</View>
          </View>
          <View style={styles.filterActions}>
            <Pressable accessibilityRole="button" style={[styles.primaryButton, isRefreshing && styles.buttonDisabled]} onPress={applyFilters} disabled={isRefreshing}>{isRefreshing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Apply filters</Text>}</Pressable>
            <Pressable accessibilityRole="button" style={styles.clearButton} onPress={clearFilters} disabled={isRefreshing}><Text style={styles.clearButtonText}>Clear</Text></Pressable>
          </View>
        </View>

        {isInitialLoading ? <View style={styles.loadingState}><ActivityIndicator accessibilityLabel="Loading transactions" /><Text style={styles.stateText}>Loading transactions…</Text></View> : null}
        {loadError ? <View style={styles.errorState}><Text style={styles.errorText}>{loadError}</Text><Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void loadTransactions(true)} disabled={isRefreshing}><Text style={styles.retryButtonText}>{isRefreshing ? 'Retrying…' : 'Retry'}</Text></Pressable></View> : null}

        <View style={styles.summaryCard}>
          <View><Text style={styles.summaryLabel}>Net Income</Text><Text style={styles.summaryValue}>{formatCurrency(totals.income - totals.expenses)}</Text></View>
          <View style={styles.summaryDivider} />
          <View><Text style={styles.summaryLabel}>Expenses</Text><Text style={[styles.summaryValue, styles.expenseText]}>{formatCurrency(totals.expenses)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Recent transactions</Text>
        {!isInitialLoading && !loadError && transactions.slice(0, 10).map((transaction) => (
          <Pressable accessibilityRole="button" key={transaction.id} style={({ pressed }) => [styles.transactionCard, pressed && styles.pressed]} onPress={() => setSelectedTransaction(transaction)}>
            <View style={styles.transactionIcon}><Text style={styles.transactionIconText}>{transaction.kind === 'income' ? '+' : '−'}</Text></View>
            <View style={styles.transactionInfo}><Text style={styles.merchant}>{transaction.merchant}</Text><Text style={styles.transactionMeta}>{transaction.category} · {transaction.date}</Text></View>
            <Text style={[styles.transactionAmount, transaction.kind === 'income' && styles.incomeText]}>{transaction.kind === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
          </Pressable>
        ))}
        {!isInitialLoading && !loadError && transactions.length === 0 && <Text style={styles.emptyState}>No transactions match the current filters.</Text>}
        {!isInitialLoading && !loadError && transactions.length > 0 && (
          <Pressable accessibilityRole="button" style={styles.historyButton} onPress={() => setIsHistoryVisible(true)}>
            <Text style={styles.historyButtonText}>Full Transaction History</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={isAddVisible || selectedTransaction !== null || isHistoryVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>{isAddVisible ? 'Add Transaction' : selectedTransaction ? 'Transaction Details' : 'Full Transaction History'}</Text><Pressable accessibilityRole="button" onPress={closeModal}><Text style={styles.closeText}>Close</Text></Pressable></View>

              {selectedTransaction ? (
                <ScrollView
                  style={styles.detailsScrollView}
                  contentContainerStyle={styles.detailsContent}
                  showsVerticalScrollIndicator={false}>
                  <View style={styles.detailHero}><Text style={styles.detailMerchant}>{selectedTransaction.merchant}</Text><Text style={[styles.detailAmount, selectedTransaction.kind === 'income' && styles.incomeText]}>{selectedTransaction.kind === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}</Text></View>
                  <DetailRow label="Category" value={selectedTransaction.category} /><DetailRow label="Account" value={selectedTransaction.account} /><DetailRow label="Date" value={selectedTransaction.date} /><DetailRow label="Type" value={selectedTransaction.kind === 'income' ? 'Income' : 'Expense'} />
                  {selectedTransaction.notes ? <DetailRow label="Notes" value={selectedTransaction.notes} /> : null}
                </ScrollView>
              ) : isHistoryVisible ? (
                <ScrollView style={styles.historyScrollView} contentContainerStyle={styles.historyContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.historyTableHeader}><Text style={[styles.historyHeaderText, styles.historyDateColumn]}>Date</Text><Text style={[styles.historyHeaderText, styles.historyTitleColumn]}>Transaction</Text><Text style={[styles.historyHeaderText, styles.historyAmountColumn]}>Amount</Text></View>
                  {transactions.map((transaction) => (
                    <View key={transaction.id} style={styles.historyTableRow}>
                      <Text style={[styles.historyDate, styles.historyDateColumn]} numberOfLines={1}>{transaction.date}</Text>
                      <Text style={styles.historyTitle} numberOfLines={1}>{transaction.merchant}</Text>
                      <Text style={[styles.historyAmount, styles.historyAmountColumn, transaction.kind === 'income' && styles.incomeText]}>{transaction.kind === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Description</Text><TextInput style={styles.input} value={merchant} onChangeText={(value) => { setMerchant(value); setFieldErrors((current) => ({ ...current, merchant: undefined })); }} placeholder="e.g. Coffee shop" />{fieldErrors.merchant ? <Text style={styles.fieldError}>{fieldErrors.merchant}</Text> : null}
                  <Text style={styles.inputLabel}>Amount (minor units)</Text><TextInput style={styles.input} value={amount} onChangeText={(value) => { setAmount(value); setFieldErrors((current) => ({ ...current, amountMinor: undefined })); }} placeholder="e.g. 1250" keyboardType="number-pad" />{fieldErrors.amountMinor ? <Text style={styles.fieldError}>{fieldErrors.amountMinor}</Text> : null}
                  <Text style={styles.inputLabel}>Date</Text><TextInput style={styles.input} value={date} onChangeText={(value) => { setDate(value); setFieldErrors((current) => ({ ...current, occurredOn: undefined })); }} placeholder="YYYY-MM-DD" />{fieldErrors.occurredOn ? <Text style={styles.fieldError}>{fieldErrors.occurredOn}</Text> : null}
                  <Text style={styles.inputLabel}>Type</Text>
                  <View style={styles.optionRow}>{(['expense', 'income', 'transfer'] as TransactionKind[]).map((option) => <Pressable key={option} style={[styles.optionButton, kind === option && styles.selectedOption]} onPress={() => { setKind(option); setFieldErrors((current) => ({ ...current, category: undefined, transferAccount: undefined })); }}><Text style={[styles.optionText, kind === option && styles.selectedOptionText]}>{option[0].toUpperCase() + option.slice(1)}</Text></Pressable>)}</View>
                  {kind !== 'transfer' ? <><Text style={styles.inputLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{categories.filter((option) => kind === 'income' ? option === 'Income' : option !== 'Income').map((option) => <Pressable key={option} style={[styles.categoryButton, category === option && styles.selectedOption]} onPress={() => { setCategory(option); setFieldErrors((current) => ({ ...current, category: undefined })); }}><Text style={[styles.optionText, category === option && styles.selectedOptionText]}>{option}</Text></Pressable>)}</ScrollView>{fieldErrors.category ? <Text style={styles.fieldError}>{fieldErrors.category}</Text> : null}</> : <><Text style={styles.inputLabel}>Destination account</Text><View style={styles.optionRow}>{['Checking Account', 'Savings Account', 'Credit Card'].filter((option) => option !== account).map((option) => <Pressable key={option} style={[styles.accountButton, transferAccount === option && styles.selectedOption]} onPress={() => { setTransferAccount(option); setFieldErrors((current) => ({ ...current, transferAccount: undefined })); }}><Text style={[styles.optionText, transferAccount === option && styles.selectedOptionText]}>{option.replace(' Account', '')}</Text></Pressable>)}</View>{fieldErrors.transferAccount ? <Text style={styles.fieldError}>{fieldErrors.transferAccount}</Text> : null}</>}
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

function formatCurrency(value: number) { return `$${(Math.abs(value) / 100).toFixed(2)}`; }
function formatToday() { return new Date().toISOString().slice(0, 10); }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' }, container: { padding: 24, paddingBottom: 48 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' }, subtitle: { marginTop: 4, color: '#64748b' }, addButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8 }, addButtonText: { color: '#fff', fontWeight: 'bold' },
  summaryCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 28 }, summaryLabel: { color: '#64748b', fontSize: 13, marginBottom: 5 }, summaryValue: { color: '#15803d', fontSize: 21, fontWeight: 'bold' }, expenseText: { color: '#dc2626' }, summaryDivider: { width: 1, height: 42, backgroundColor: '#bfdbfe', marginHorizontal: 28 }, sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }, transactionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' }, pressed: { opacity: 0.7 }, transactionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, transactionIconText: { color: '#475569', fontSize: 22, fontWeight: '600' }, transactionInfo: { flex: 1 }, merchant: { color: '#0f172a', fontSize: 16, fontWeight: '600' }, transactionMeta: { color: '#64748b', fontSize: 13, marginTop: 5 }, transactionAmount: { color: '#dc2626', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }, incomeText: { color: '#15803d' }, emptyState: { color: '#64748b', textAlign: 'center', paddingVertical: 32 }, historyButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 }, historyButtonText: { color: '#2563eb', fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(15, 23, 42, 0.45)' }, keyboardContainer: { width: '100%' }, modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, maxHeight: '90%', minHeight: 373 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' }, closeText: { color: '#2563eb', fontWeight: '600' }, detailsScrollView: { flexGrow: 0 }, detailsContent: { paddingBottom: 12 }, historyScrollView: { flexGrow: 0 }, historyContent: { paddingBottom: 12 }, historyTableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' }, historyHeaderText: { color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }, historyTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, historyDateColumn: { width: 82 }, historyTitleColumn: { flex: 1, marginRight: 16 }, historyDate: { color: '#64748b', fontSize: 12 }, historyTitle: { color: '#0f172a', fontWeight: '600', flex: 1, marginRight: 16 }, historyAmountColumn: { width: 78, textAlign: 'right' }, historyAmount: { color: '#dc2626', fontWeight: '700' }, detailHero: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 18, marginBottom: 12 }, detailMerchant: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }, detailAmount: { color: '#dc2626', fontSize: 28, fontWeight: 'bold' }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, detailLabel: { color: '#64748b' }, detailValue: { color: '#0f172a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  inputLabel: { color: '#334155', fontWeight: '600', marginBottom: 6, marginTop: 12 }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, color: '#0f172a', backgroundColor: '#fff' }, notesInput: { minHeight: 76, textAlignVertical: 'top' }, optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, categoryRow: { gap: 8, paddingVertical: 2 }, optionButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }, categoryButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }, accountButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }, selectedOption: { backgroundColor: '#dbeafe', borderColor: '#2563eb' }, optionText: { color: '#475569' }, selectedOptionText: { color: '#1d4ed8', fontWeight: '600' }, primaryButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 12 }, primaryButtonText: { color: '#fff', fontWeight: 'bold' },
  fieldError: { color: '#b91c1c', marginTop: 4 },
  filterCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  filterTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  filterColumns: { flexDirection: 'row', gap: 10 },
  filterColumn: { flex: 1 },
  filterActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearButton: { padding: 14, marginTop: 24 },
  clearButtonText: { color: '#2563eb', fontWeight: '700' },
  loadingState: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  stateText: { color: '#64748b' },
  errorState: { alignItems: 'center', padding: 16, marginBottom: 16, backgroundColor: '#fef2f2', borderRadius: 10 },
  errorText: { color: '#b91c1c', textAlign: 'center' },
  retryButton: { borderWidth: 1, borderColor: '#b91c1c', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10 },
  retryButtonText: { color: '#b91c1c', fontWeight: '700' },
  buttonDisabled: { opacity: 0.65 },
});
// view transactions
// add transactions
// transaction details
