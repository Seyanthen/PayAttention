import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { authenticatedFetch, authenticatedGet, getApiErrorMessage } from '@/services/api';
import { parseDollarAmountToMinorUnits, validateTransaction, validateTransactionFilters, type ValidationErrors } from '@/services/validation';
import { addGoalContribution, getGoals, subscribeToGoals } from '@/services/goal-store';
import { addLocalTransaction, getLocalTransactions, removeLocalTransaction } from '@/services/transaction-store';
import type { Transaction, TransactionKind } from '@/services/transaction-types';
import { AndroidScreenSafeArea } from '@/components/android-screen-safe-area';
import { addBudgetSpent, getActiveBudgetMonth, getBudgets, subscribeToBudgets } from '@/services/budget-store';

type ApiTransaction = {
  id: number;
  account: number;
  category: number | null;
  transaction_type: TransactionKind;
  amount_minor: number;
  occurred_on: string;
  merchant: string;
  note: string;
  created_at?: string;
};

type Lookup = { id: number; name: string; category_type?: 'expense' | 'income' };

type TransactionFilters = {
  search: string;
  account: string;
  category: string;
  transactionType: '' | TransactionKind;
  startDate: string;
  endDate: string;
  minAmountDollars: string;
  maxAmountDollars: string;
};

const initialTransactions: Transaction[] = [];

export default function TransactionsScreen() {
  const isMounted = useRef(true);
  const goals = useSyncExternalStore(subscribeToGoals, getGoals, getGoals);
  const budgets = useSyncExternalStore(subscribeToBudgets, getBudgets, getBudgets);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [accounts, setAccounts] = useState<Lookup[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({ search: '', account: '', category: '', transactionType: '', startDate: '', endDate: '', minAmountDollars: '', maxAmountDollars: '' });
  const [filterErrors, setFilterErrors] = useState<ValidationErrors>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isImportExportVisible, setIsImportExportVisible] = useState(false);
  const [importExportStartDate, setImportExportStartDate] = useState('');
  const [importExportEndDate, setImportExportEndDate] = useState('');
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
      categoryId: row.category === null ? undefined : String(row.category),
      account: accountRows.find((item) => item.id === row.account)?.name ?? `Account ${row.account}`,
      date: row.occurred_on,
      timestamp: row.created_at ?? row.occurred_on,
      notes: row.note,
      kind: row.transaction_type,
    };
  }

  function queryFor(nextFilters = filters) {
    const query = new URLSearchParams();
    if (nextFilters.search.trim()) query.set('search', nextFilters.search.trim());
    if (nextFilters.account) query.set('account', nextFilters.account);
    if (nextFilters.category && nextFilters.transactionType !== 'goal' && /^\d+$/.test(nextFilters.category)) query.set('category', nextFilters.category);
    if (nextFilters.transactionType && nextFilters.transactionType !== 'goal') query.set('transaction_type', nextFilters.transactionType);
    if (nextFilters.startDate.trim()) query.set('start_date', nextFilters.startDate.trim());
    if (nextFilters.endDate.trim()) query.set('end_date', nextFilters.endDate.trim());
    const minAmount = parseDollarAmountToMinorUnits(nextFilters.minAmountDollars, true);
    const maxAmount = parseDollarAmountToMinorUnits(nextFilters.maxAmountDollars, true);
    if (minAmount !== undefined) query.set('min_amount_minor', String(minAmount));
    if (maxAmount !== undefined) query.set('max_amount_minor', String(maxAmount));
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
      const serverTransactions = (transactionRows as ApiTransaction[]).map((row) => transactionFromApi(row, typedAccounts, typedCategories));
      setTransactions((current) => {
        const matchingLocalTransactions = getLocalTransactions().filter((transaction) => matchesFilters(transaction, nextFilters));
        const merged = sortTransactions([...serverTransactions, ...matchingLocalTransactions]);
        if (nextFilters.transactionType === 'goal' || (nextFilters.category && !/^\d+$/.test(nextFilters.category))) return merged.filter((transaction) => matchesFilters(transaction, nextFilters));
        if (nextFilters.transactionType) return sortTransactions(serverTransactions);
        return merged;
      });
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
    const timer = setTimeout(() => {
      void loadTransactions(false);
    }, 0);
    return () => clearTimeout(timer);
    // This is intentionally a one-time initial fetch; later fetches use explicit user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    const nextErrors = validateTransactionFilters(filters);
    setFilterErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) void loadTransactions(true);
  };

  const clearFilters = () => {
    const cleared: TransactionFilters = { search: '', account: '', category: '', transactionType: '', startDate: '', endDate: '', minAmountDollars: '', maxAmountDollars: '' };
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

  const budgetCategoryOptions = useMemo(() => Object.values(budgets).flat().reduce<{ id: string; name: string }[]>((options, budget) => {
    if (!options.some((option) => option.name.toLowerCase() === budget.name.toLowerCase())) options.push({ id: budget.name, name: budget.name });
    return options;
  }, []), [budgets]);

  const addCategoryOptions = useMemo(() => {
    if (kind === 'goal') return goals.map((goal) => ({ id: goal.id, name: goal.name }));
    return kind === 'income' ? [{ id: 'Other', name: 'Other' }] : [...budgetCategoryOptions, { id: 'Other', name: 'Other' }];
  }, [budgetCategoryOptions, goals, kind]);

  const openAdd = () => {
    setMerchant(''); setAmount(''); setCategory('Other'); setAccount('Checking Account'); setKind('expense'); setDate(formatToday()); setNotes(''); setTransferAccount(''); setFieldErrors({}); setIsAddVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setIsAddVisible(false);
    setIsImportExportVisible(false);
    setSelectedTransaction(null);
    setIsHistoryVisible(false);
  };

  const saveTransaction = () => {
    const nextErrors = validateTransaction({
      merchant,
      amountDollars: amount,
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
    const amountMinor = parseDollarAmountToMinorUnits(amount);
    if (amountMinor === undefined) return;
    if (kind === 'goal') {
      const goal = goals.find((item) => item.id === category);
      if (!goal) {
        setFieldErrors({ category: 'Select a savings goal.' });
        return;
      }
      addGoalContribution(goal.id, amountMinor);
    }
    if (kind === 'expense' && category !== 'Other') addBudgetSpent(getActiveBudgetMonth(), category, amountMinor);
    const newTransaction: Transaction = { id: Date.now(), merchant: merchant.trim(), amount: amountMinor, category: kind === 'goal' ? goals.find((item) => item.id === category)?.name ?? category : category, categoryId: kind === 'goal' ? category : undefined, account, date: date.trim(), timestamp: new Date().toISOString(), notes: notes.trim(), kind };
    addLocalTransaction(newTransaction);
    setTransactions((current) => sortTransactions([newTransaction, ...current]));
    closeModal();
  };

  const deleteSelectedTransaction = () => {
    if (!selectedTransaction) return;
    const transaction = selectedTransaction;
    Alert.alert('Delete transaction?', `Delete “${transaction.merchant}” from your transactions?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void performDelete(transaction) },
    ]);
  };

  const performDelete = async (transaction: Transaction) => {
    try {
      const isLocal = getLocalTransactions().some((item) => item.id === transaction.id);
      if (isLocal) {
        removeLocalTransaction(transaction.id);
        if (transaction.kind === 'expense' && transaction.category !== 'Other') addBudgetSpent(getActiveBudgetMonth(), transaction.category, -transaction.amount);
        if (transaction.kind === 'goal' && transaction.categoryId) {
          addGoalContribution(transaction.categoryId, -transaction.amount);
        }
      } else {
        await authenticatedFetch(`/transactions/${transaction.id}/`, { method: 'DELETE' });
      }
      setTransactions((current) => current.filter((item) => item.id !== transaction.id));
      closeModal();
    } catch (error) {
      Alert.alert('Delete transaction', getApiErrorMessage(error, 'Unable to delete this transaction. Please try again.'));
    }
  };

  const importTransactions = () => {
    setIsImportExportVisible(false);
    Alert.alert('Import transactions', 'Transaction import is not available yet.');
  };

  const exportTransactions = async () => {
    setIsImportExportVisible(false);
    if (transactions.length === 0) {
      Alert.alert('Export transactions', 'There are no transactions to export.');
      return;
    }

    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ['Date', 'Merchant', 'Amount (minor units)', 'Category', 'Account', 'Type', 'Notes'].join(','),
      ...transactions.map((transaction) => [
        transaction.date,
        transaction.merchant,
        transaction.amount,
        transaction.category,
        transaction.account,
        transaction.kind,
        transaction.notes,
      ].map(escapeCsv).join(',')),
    ].join('\n');

    try {
      await Share.share({ message: csv, title: 'Transactions.csv' });
    } catch {
      Alert.alert('Export transactions', 'Unable to share the transaction export.');
    }
  };

  const openImportExport = () => setIsImportExportVisible(true);

  return (
    <AndroidScreenSafeArea style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Transactions</Text>
            <Text style={styles.subtitle}>Track your income and spending</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Add transaction" style={styles.addButton} onPress={openAdd}><Text style={styles.addButtonText}>+ Add</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Import or export transactions" style={styles.secondaryHeaderButton} onPress={openImportExport}><SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={20} tintColor="#2563eb" /></Pressable>
          </View>
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
          <Text style={styles.inputLabel}>Type</Text>
          <View style={styles.optionRow}>{(['', 'expense', 'income', 'transfer', 'goal'] as const).map((option) => <Pressable key={option || 'all'} style={[styles.optionButton, filters.transactionType === option && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, transactionType: option, category: '' }))}><Text style={styles.optionText}>{option ? option[0].toUpperCase() + option.slice(1) : 'All'}</Text></Pressable>)}</View>
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.optionRow}>
            <Pressable style={[styles.optionButton, !filters.category && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, category: '' }))}><Text style={styles.optionText}>All</Text></Pressable>
            {(filters.transactionType === 'goal' ? goals.map((goal) => ({ id: goal.id, name: goal.name })) : [...budgetCategoryOptions, { id: 'Other', name: 'Other' }]).map((option) => <Pressable key={option.id} style={[styles.optionButton, filters.category === String(option.id) && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, category: String(option.id) }))}><Text style={styles.optionText}>{option.name}</Text></Pressable>)}
          </View>
          <Text style={styles.inputLabel}>Account</Text>
          <View style={styles.optionRow}>
            <Pressable style={[styles.optionButton, !filters.account && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, account: '' }))}><Text style={styles.optionText}>All</Text></Pressable>
            {accounts.map((option) => <Pressable key={option.id} style={[styles.optionButton, filters.account === String(option.id) && styles.selectedOption]} onPress={() => setFilters((current) => ({ ...current, account: String(option.id) }))}><Text style={styles.optionText}>{option.name}</Text></Pressable>)}
          </View>
          <View style={styles.filterColumns}>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>Start date</Text><TextInput style={styles.input} value={filters.startDate} onChangeText={(value) => { setFilters((current) => ({ ...current, startDate: value })); setFilterErrors((current) => ({ ...current, startDate: undefined })); }} placeholder="YYYY-MM-DD" />{filterErrors.startDate ? <Text style={styles.fieldError}>{filterErrors.startDate}</Text> : null}</View>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>End date</Text><TextInput style={styles.input} value={filters.endDate} onChangeText={(value) => { setFilters((current) => ({ ...current, endDate: value })); setFilterErrors((current) => ({ ...current, endDate: undefined })); }} placeholder="YYYY-MM-DD" />{filterErrors.endDate ? <Text style={styles.fieldError}>{filterErrors.endDate}</Text> : null}</View>
          </View>
          <View style={styles.filterColumns}>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>Minimum amount in US dollars</Text><TextInput style={styles.input} value={filters.minAmountDollars} onChangeText={(value) => { setFilters((current) => ({ ...current, minAmountDollars: value })); setFilterErrors((current) => ({ ...current, minAmountDollars: undefined, maxAmountDollars: undefined })); }} placeholder="$0.00" keyboardType="decimal-pad" />{filterErrors.minAmountDollars ? <Text style={styles.fieldError}>{filterErrors.minAmountDollars}</Text> : null}</View>
            <View style={styles.filterColumn}><Text style={styles.inputLabel}>Maximum amount in US dollars</Text><TextInput style={styles.input} value={filters.maxAmountDollars} onChangeText={(value) => { setFilters((current) => ({ ...current, maxAmountDollars: value })); setFilterErrors((current) => ({ ...current, maxAmountDollars: undefined })); }} placeholder="$0.00" keyboardType="decimal-pad" />{filterErrors.maxAmountDollars ? <Text style={styles.fieldError}>{filterErrors.maxAmountDollars}</Text> : null}</View>
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
                  <DetailRow label="Category" value={selectedTransaction.category} /><DetailRow label="Account" value={selectedTransaction.account} /><DetailRow label="Date" value={selectedTransaction.date} /><DetailRow label="Type" value={selectedTransaction.kind[0].toUpperCase() + selectedTransaction.kind.slice(1)} />
                  {selectedTransaction.notes ? <DetailRow label="Notes" value={selectedTransaction.notes} /> : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${selectedTransaction.merchant}`} style={styles.deleteTransactionButton} onPress={deleteSelectedTransaction}><Text style={styles.deleteTransactionText}>Delete transaction</Text></Pressable>
                </ScrollView>
              ) : isHistoryVisible ? (
                <ScrollView style={styles.historyScrollView} contentContainerStyle={styles.historyContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.historyTableHeader}><Text style={[styles.historyHeaderText, styles.historyDateColumn]}>Date</Text><Text style={[styles.historyHeaderText, styles.historyTitleColumn]}>Transaction</Text><Text style={[styles.historyHeaderText, styles.historyAmountColumn]}>Amount</Text></View>
                  {transactions.map((transaction) => (
                    <Pressable key={transaction.id} accessibilityRole="button" accessibilityLabel={`View ${transaction.merchant}`} style={({ pressed }) => [styles.historyTableRow, pressed && styles.pressed]} onPress={() => setSelectedTransaction(transaction)}>
                      <Text style={[styles.historyDate, styles.historyDateColumn]} numberOfLines={1}>{transaction.date}</Text>
                      <Text style={styles.historyTitle} numberOfLines={1}>{transaction.merchant}</Text>
                      <Text style={[styles.historyAmount, styles.historyAmountColumn, transaction.kind === 'income' && styles.incomeText]}>{transaction.kind === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Description</Text><TextInput style={styles.input} value={merchant} onChangeText={(value) => { setMerchant(value); setFieldErrors((current) => ({ ...current, merchant: undefined })); }} placeholder="e.g. Coffee shop" />{fieldErrors.merchant ? <Text style={styles.fieldError}>{fieldErrors.merchant}</Text> : null}
                  <Text style={styles.inputLabel}>Amount in US dollars</Text><TextInput style={styles.input} value={amount} onChangeText={(value) => { setAmount(value); setFieldErrors((current) => ({ ...current, amountMinor: undefined })); }} placeholder="$0.00" keyboardType="decimal-pad" />{fieldErrors.amountMinor ? <Text style={styles.fieldError}>{fieldErrors.amountMinor}</Text> : null}
                  <Text style={styles.inputLabel}>Date</Text><TextInput style={styles.input} value={date} onChangeText={(value) => { setDate(value); setFieldErrors((current) => ({ ...current, occurredOn: undefined })); }} placeholder="YYYY-MM-DD" />{fieldErrors.occurredOn ? <Text style={styles.fieldError}>{fieldErrors.occurredOn}</Text> : null}
                  <Text style={styles.inputLabel}>Type</Text>
                  <View style={styles.optionRow}>{(['expense', 'income', 'transfer', 'goal'] as TransactionKind[]).map((option) => <Pressable key={option} style={[styles.optionButton, kind === option && styles.selectedOption]} onPress={() => { setKind(option); setCategory(option === 'goal' ? '' : option === 'income' ? 'Income' : 'Other'); setFieldErrors((current) => ({ ...current, category: undefined, transferAccount: undefined })); }}><Text style={[styles.optionText, kind === option && styles.selectedOptionText]}>{option[0].toUpperCase() + option.slice(1)}</Text></Pressable>)}</View>
                  {kind !== 'transfer' ? <><Text style={styles.inputLabel}>{kind === 'goal' ? 'Savings goal' : 'Category'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{addCategoryOptions.map((option) => <Pressable key={option.id} style={[styles.categoryButton, category === option.id && styles.selectedOption]} onPress={() => { setCategory(option.id); setFieldErrors((current) => ({ ...current, category: undefined })); }}><Text style={[styles.optionText, category === option.id && styles.selectedOptionText]}>{option.name}</Text></Pressable>)}</ScrollView>{fieldErrors.category ? <Text style={styles.fieldError}>{fieldErrors.category}</Text> : null}</> : <><Text style={styles.inputLabel}>Destination account</Text><View style={styles.optionRow}>{['Checking Account', 'Savings Account', 'Credit Card'].filter((option) => option !== account).map((option) => <Pressable key={option} style={[styles.accountButton, transferAccount === option && styles.selectedOption]} onPress={() => { setTransferAccount(option); setFieldErrors((current) => ({ ...current, transferAccount: undefined })); }}><Text style={[styles.optionText, transferAccount === option && styles.selectedOptionText]}>{option.replace(' Account', '')}</Text></Pressable>)}</View>{fieldErrors.transferAccount ? <Text style={styles.fieldError}>{fieldErrors.transferAccount}</Text> : null}</>}
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
      <Modal visible={isImportExportVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.choiceModalCard}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Transactions</Text><Pressable accessibilityRole="button" onPress={closeModal}><Text style={styles.closeText}>Close</Text></Pressable></View>
            <View style={styles.choiceDateColumns}>
              <View style={styles.filterColumn}>
                <Text style={styles.inputLabel}>Start date</Text>
                <TextInput accessibilityLabel="Import and export start date" style={styles.input} value={importExportStartDate} onChangeText={setImportExportStartDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={styles.filterColumn}>
                <Text style={styles.inputLabel}>End date</Text>
                <TextInput accessibilityLabel="Import and export end date" style={styles.input} value={importExportEndDate} onChangeText={setImportExportEndDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={importTransactions}><Text style={styles.primaryButtonText}>Import transactions</Text></Pressable>
            <Pressable accessibilityRole="button" style={styles.secondaryChoiceButton} onPress={() => void exportTransactions()}><Text style={styles.secondaryHeaderButtonText}>Export transactions</Text></Pressable>
          </View>
        </View>
      </Modal>
    </AndroidScreenSafeArea>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function formatCurrency(value: number) { return `$${(Math.abs(value) / 100).toFixed(2)}`; }
function formatToday() { return new Date().toISOString().slice(0, 10); }
function sortTransactions(items: Transaction[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date) || (b.timestamp ?? '').localeCompare(a.timestamp ?? '') || b.id - a.id);
}

function matchesFilters(transaction: Transaction, filters: TransactionFilters) {
  if (filters.transactionType && transaction.kind !== filters.transactionType) return false;
  if (filters.category && transaction.categoryId !== filters.category && transaction.category.toLowerCase() !== filters.category.toLowerCase()) return false;
  if (filters.search.trim()) {
    const search = filters.search.trim().toLowerCase();
    if (![transaction.merchant, transaction.category, transaction.notes].some((value) => value.toLowerCase().includes(search))) return false;
  }
  if (filters.startDate && transaction.date < filters.startDate) return false;
  if (filters.endDate && transaction.date > filters.endDate) return false;
  const minAmount = parseDollarAmountToMinorUnits(filters.minAmountDollars, true);
  const maxAmount = parseDollarAmountToMinorUnits(filters.maxAmountDollars, true);
  if (minAmount !== undefined && transaction.amount < minAmount) return false;
  if (maxAmount !== undefined && transaction.amount > maxAmount) return false;
  return true;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' }, container: { padding: 24, paddingBottom: 48 }, header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }, title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' }, subtitle: { marginTop: 4, color: '#64748b' }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 }, secondaryHeaderButton: { borderWidth: 1, borderColor: '#2563eb', paddingHorizontal: 11, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }, secondaryHeaderButtonText: { color: '#2563eb', fontWeight: '700' }, addButton: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 8, alignItems: 'center' }, addButtonText: { color: '#fff', fontWeight: 'bold' },
  summaryCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 28 }, summaryLabel: { color: '#64748b', fontSize: 13, marginBottom: 5 }, summaryValue: { color: '#15803d', fontSize: 21, fontWeight: 'bold' }, expenseText: { color: '#dc2626' }, summaryDivider: { width: 1, height: 42, backgroundColor: '#bfdbfe', marginHorizontal: 28 }, sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }, transactionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' }, pressed: { opacity: 0.7 }, transactionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, transactionIconText: { color: '#475569', fontSize: 22, fontWeight: '600' }, transactionInfo: { flex: 1 }, merchant: { color: '#0f172a', fontSize: 16, fontWeight: '600' }, transactionMeta: { color: '#64748b', fontSize: 13, marginTop: 5 }, transactionAmount: { color: '#dc2626', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }, incomeText: { color: '#15803d' }, emptyState: { color: '#64748b', textAlign: 'center', paddingVertical: 32 }, historyButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 }, historyButtonText: { color: '#2563eb', fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(15, 23, 42, 0.45)' }, keyboardContainer: { width: '100%' }, modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, maxHeight: '90%', minHeight: 373 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' }, closeText: { color: '#2563eb', fontWeight: '600' }, detailsScrollView: { flexGrow: 0 }, detailsContent: { paddingBottom: 12 }, historyScrollView: { flexGrow: 0 }, historyContent: { paddingBottom: 12 }, historyTableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' }, historyHeaderText: { color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }, historyTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, historyDateColumn: { width: 82 }, historyTitleColumn: { flex: 1, marginRight: 16 }, historyDate: { color: '#64748b', fontSize: 12 }, historyTitle: { color: '#0f172a', fontWeight: '600', flex: 1, marginRight: 16 }, historyAmountColumn: { width: 78, textAlign: 'right' }, historyAmount: { color: '#dc2626', fontWeight: '700' }, detailHero: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 18, marginBottom: 12 }, detailMerchant: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }, detailAmount: { color: '#dc2626', fontSize: 28, fontWeight: 'bold' }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, detailLabel: { color: '#64748b' }, detailValue: { color: '#0f172a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  inputLabel: { color: '#334155', fontWeight: '600', marginBottom: 6, marginTop: 12 }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, color: '#0f172a', backgroundColor: '#fff' }, notesInput: { minHeight: 76, textAlignVertical: 'top' }, optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, categoryRow: { gap: 8, paddingVertical: 2 }, optionButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }, categoryButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }, accountButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }, selectedOption: { backgroundColor: '#dbeafe', borderColor: '#2563eb' }, optionText: { color: '#475569' }, selectedOptionText: { color: '#1d4ed8', fontWeight: '600' }, primaryButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 12 }, primaryButtonText: { color: '#fff', fontWeight: 'bold' },
  fieldError: { color: '#b91c1c', marginTop: 4 },
  deleteTransactionButton: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 20 }, deleteTransactionText: { color: '#dc2626', fontWeight: '700' },
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
  choiceModalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  choiceModalText: { color: '#475569', fontSize: 16, marginBottom: 4 },
  choiceDateColumns: { flexDirection: 'row', gap: 10 },
  secondaryChoiceButton: { borderWidth: 1, borderColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.65 },
});
// view transactions
// add transactions
// transaction details
