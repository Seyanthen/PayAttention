import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { formatMinorUnitsAsDollars, parseDollarAmountToMinorUnits, required, validatePositiveDollarAmount } from '@/services/validation';
import { AndroidScreenSafeArea } from '@/components/android-screen-safe-area';
import { ApiAccount, createAccount, deleteAccount as deleteAccountRequest, getAccounts, getApiErrorMessage, updateAccount } from '@/services/api';
import { addAccount, getAccounts as getSharedAccounts, hasPersistedAccounts, removeAccount, replaceAccount, replaceAccounts, subscribeToAccounts, type SharedAccount } from '@/services/account-store';

type ModalMode = 'details' | 'edit' | 'add';

export default function AccountsScreen() {
  const accounts = useSyncExternalStore(subscribeToAccounts, getSharedAccounts, getSharedAccounts);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const isMounted = useRef(true);
  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('details');
  const [name, setName] = useState('');
  const [type, setType] = useState('Checking');
  const [balance, setBalance] = useState('');
  const [balanceIsNegative, setBalanceIsNegative] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; balance?: string }>({});

  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await getAccounts();
        if (!isMounted.current) return;
        if (!hasPersistedAccounts()) replaceAccounts(rows.filter((row) => !row.is_archived).map(accountFromApi));
      } catch (error) {
        // Keep the existing hard-coded accounts available for testing bypass and offline use.
        if (isMounted.current) setLoadError(getApiErrorMessage(error, 'Unable to load accounts.'));
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };
    void load();
  }, []);

  const openDetails = (account: SharedAccount) => {
    setSelectedAccount(account);
    setModalMode('details');
  };

  const openEdit = (account: SharedAccount) => {
    setSelectedAccount(account);
    setName(account.name);
    setType(account.type);
    setBalance(formatMinorUnitsAsDollars(Math.abs(account.balance)).slice(1));
    setBalanceIsNegative(account.balance < 0);
    setFieldErrors({});
    setModalMode('edit');
  };

  const openAdd = () => {
    setSelectedAccount(null);
    setName('');
    setType('Checking');
    setBalance('');
    setBalanceIsNegative(false);
    setFieldErrors({});
    setModalMode('add');
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setSelectedAccount(null);
    setModalMode('details');
  };

  const deleteAccount = () => {
    if (!selectedAccount) return;

    Alert.alert(
      'Delete account?',
      `This will remove ${selectedAccount.name} from your accounts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (selectedAccount.persisted) await deleteAccountRequest(selectedAccount.id);
              removeAccount(selectedAccount.id);
              closeModal();
            } catch (error) {
              Alert.alert('Unable to delete account', getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  const saveAccount = async () => {
    const nextErrors = {
      name: required(name, 'Account name'),
      balance: validatePositiveDollarAmount(balance, 'Balance'),
    };
    if (nextErrors.name || nextErrors.balance) {
      setFieldErrors(nextErrors);
      return;
    }

    const absoluteBalance = parseDollarAmountToMinorUnits(balance);
    if (absoluteBalance === undefined) return;
    const parsedBalance = balanceIsNegative ? -absoluteBalance : absoluteBalance;

    const payload = {
      name: name.trim() || 'New Account',
      account_type: accountTypeForApi(type),
      opening_balance_minor: parsedBalance,
    } as const;

    try {
      const saved = modalMode === 'edit' && selectedAccount?.persisted
        ? await updateAccount(selectedAccount.id, payload)
        : await createAccount(payload);
      if (modalMode === 'edit' && selectedAccount) replaceAccount(accountFromApi(saved));
      else addAccount(accountFromApi(saved));
      closeModal();
    } catch (error) {
      Alert.alert('Unable to save account', getApiErrorMessage(error));
    }
  };

  const modalTitle = modalMode === 'add' ? 'Add Account' : modalMode === 'edit' ? 'Edit Account' : 'Account Details';

  return (
    <AndroidScreenSafeArea style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Accounts</Text>
            <Text style={styles.subtitle}>Manage your linked accounts</Text>
          </View>
          <Pressable style={styles.addButton} onPress={openAdd}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        {isLoading ? <ActivityIndicator color="#2563eb" /> : null}
        {loadError ? <Text style={styles.loadError}>{loadError}</Text> : null}
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}
            onPress={() => openDetails(account)}>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountMeta}>{account.type} •••• {account.last4}</Text>
            </View>
            <View style={styles.accountActions}>
              <Text style={[styles.balance, account.balance < 0 && styles.negativeBalance]}>
                {formatCurrency(account.balance)}
              </Text>
              <Pressable style={styles.editButton} onPress={() => openEdit(account)}>
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}

        <Text style={styles.hint}>Tap an account to view its details.</Text>
      </ScrollView>

      <Modal
        visible={selectedAccount !== null || modalMode === 'add'}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <View style={styles.modalHeaderActions}>
                  {/* The keyboard-aware modal moves the form up, so a header Done button is not needed. */}
                  {/* <Pressable onPress={dismissAmountKeyboard}>
                    <Text style={styles.doneText}>Done</Text>
                  </Pressable> */}
                  <Pressable onPress={closeModal}>
                    <Text style={styles.closeText}>Close</Text>
                  </Pressable>
                </View>
              </View>

            {modalMode === 'details' && selectedAccount ? (
              <View>
                <Text style={styles.detailLabel}>Account name</Text>
                <Text style={styles.detailValue}>{selectedAccount.name}</Text>
                <Text style={styles.detailLabel}>Account type</Text>
                <Text style={styles.detailValue}>{selectedAccount.type}</Text>
                <Text style={styles.detailLabel}>Account number</Text>
                <Text style={styles.detailValue}>•••• {selectedAccount.last4}</Text>
                <Text style={styles.detailLabel}>Balance</Text>
                <Text style={styles.detailBalance}>{formatCurrency(selectedAccount.balance)}</Text>

                <Pressable style={styles.primaryButton} onPress={() => openEdit(selectedAccount)}>
                  <Text style={styles.primaryButtonText}>Edit Account</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.inputLabel}>Account name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  onChange={(event) => {
                    setName(event.nativeEvent.text);
                    setFieldErrors((current) => ({ ...current, name: undefined }));
                  }}
                  placeholder="e.g. Emergency Fund"
                />
                {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

                <Text style={styles.inputLabel}>Account type</Text>
                <View style={styles.typeOptions}>
                  {['Checking', 'Savings', 'Credit'].map((accountType) => (
                    <Pressable
                      key={accountType}
                      style={[styles.typeButton, type === accountType && styles.selectedTypeButton]}
                      onPress={() => setType(accountType)}>
                      <Text style={[styles.typeButtonText, type === accountType && styles.selectedTypeButtonText]}>
                        {accountType}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Current balance in US dollars</Text>
                <TextInput
                  style={styles.input}
                  value={balance}
                  onChangeText={setBalance}
                  onChange={(event) => {
                    setBalance(event.nativeEvent.text);
                    setFieldErrors((current) => ({ ...current, balance: undefined }));
                  }}
                  placeholder="$0.00"
                  keyboardType="decimal-pad"
                  blurOnSubmit
                />
                {fieldErrors.balance ? <Text style={styles.fieldError}>{fieldErrors.balance}</Text> : null}

                <Pressable
                  style={[styles.signButton, balanceIsNegative && styles.negativeSignButton]}
                  onPress={() => setBalanceIsNegative((isNegative) => !isNegative)}>
                  <Text style={[styles.signButtonText, balanceIsNegative && styles.negativeSignButtonText]}>
                    {balanceIsNegative ? 'Negative balance' : 'Positive balance'}
                  </Text>
                </Pressable>

                <Pressable style={styles.primaryButton} onPress={saveAccount}>
                  <Text style={styles.primaryButtonText}>
                    {modalMode === 'add' ? 'Add Account' : 'Save Changes'}
                  </Text>
                </Pressable>

                {modalMode === 'edit' && (
                  <Pressable style={styles.deleteButton} onPress={deleteAccount}>
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                  </Pressable>
                )}
              </View>
            )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </AndroidScreenSafeArea>
  );
}

function formatCurrency(value: number) {
  return `${value < 0 ? '-' : ''}${formatMinorUnitsAsDollars(Math.abs(value))}`;
}

function accountFromApi(account: ApiAccount): SharedAccount {
  return {
    id: account.id,
    name: account.name,
    type: accountTypeFromApi(account.account_type),
    balance: account.balance_minor ?? account.opening_balance_minor,
    last4: '0000',
    persisted: true,
  };
}

function accountTypeFromApi(type: ApiAccount['account_type']): string {
  return type === 'cash' ? 'Cash' : type[0].toUpperCase() + type.slice(1);
}

function accountTypeForApi(type: string): ApiAccount['account_type'] {
  const normalized = type.toLowerCase();
  return normalized === 'checking' || normalized === 'savings' || normalized === 'credit' ? normalized : 'other';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { marginTop: 4, color: '#64748b' },
  addButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  accountCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0' },
  pressed: { opacity: 0.7 },
  accountInfo: { flex: 1 },
  accountName: { color: '#0f172a', fontSize: 17, fontWeight: '600' },
  accountMeta: { color: '#64748b', marginTop: 6 },
  accountActions: { alignItems: 'flex-end', gap: 8 },
  balance: { color: '#15803d', fontSize: 16, fontWeight: 'bold' },
  negativeBalance: { color: '#dc2626' },
  editButton: { paddingHorizontal: 10, paddingVertical: 5 },
  editButtonText: { color: '#2563eb', fontWeight: '600' },
  hint: { textAlign: 'center', color: '#64748b', marginTop: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  keyboardContainer: { width: '100%' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, minHeight: 360 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  doneText: { color: '#15803d', fontWeight: '700' },
  closeText: { color: '#2563eb', fontWeight: '600' },
  detailLabel: { color: '#64748b', marginTop: 12, marginBottom: 4 },
  detailValue: { color: '#0f172a', fontSize: 17 },
  detailBalance: { color: '#15803d', fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  inputLabel: { color: '#334155', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, color: '#0f172a' },
  signButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10 },
  negativeSignButton: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
  signButtonText: { color: '#475569', fontWeight: '600' },
  negativeSignButtonText: { color: '#b91c1c' },
  typeOptions: { flexDirection: 'row', gap: 8 },
  typeButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
  selectedTypeButton: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  typeButtonText: { color: '#475569' },
  selectedTypeButtonText: { color: '#1d4ed8', fontWeight: '600' },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  primaryButtonText: { color: '#fff', fontWeight: 'bold' },
  deleteButton: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  deleteButtonText: { color: '#dc2626', fontWeight: 'bold' },
  fieldError: { color: '#b91c1c', marginTop: 4 },
  loadError: { color: '#b45309', marginBottom: 12 },
});
