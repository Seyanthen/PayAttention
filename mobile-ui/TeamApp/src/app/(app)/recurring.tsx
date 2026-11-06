import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createRecurringTransaction, deleteRecurringTransaction, getApiErrorMessage, getRecurringTransactions, type RecurringTransaction, updateRecurringTransaction } from '@/services/api';

const today = () => new Date().toISOString().slice(0, 10);
const money = (minor: number) => `${minor < 0 ? '-' : ''}$${(Math.abs(minor) / 100).toFixed(2)}`;

export default function RecurringTransactionsScreen() {
  const mounted = useRef(true);
  const [rows, setRows] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>('monthly');
  const [next, setNext] = useState(today());

  useEffect(() => { void load(); return () => { mounted.current = false; }; }, []);

  async function load() {
    setLoading(true); setError('');
    try { const result = await getRecurringTransactions(); if (mounted.current) setRows(result); }
    catch (err) { if (mounted.current) setError(getApiErrorMessage(err, 'Unable to load recurring transactions.')); }
    finally { if (mounted.current) setLoading(false); }
  }

  function openCreate() { setEditing(null); setFormVisible(true); setName(''); setAmount(''); setType('expense'); setFrequency('monthly'); setNext(today()); setError(''); }
  function openEdit(row: RecurringTransaction) { setEditing(row); setFormVisible(true); setName(row.name); setAmount(String(row.amount_minor)); setType(row.transaction_type); setFrequency(row.frequency); setNext(row.next_occurrence); setError(''); }
  function close() { if (!saving) setFormVisible(false); }

  async function save() {
    const amountMinor = Number(amount.trim());
    if (!name.trim() || !Number.isInteger(amountMinor) || amountMinor < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(next)) { setError('Enter a name, a positive amount in cents, and a valid date (YYYY-MM-DD).'); return; }
    setSaving(true); setError('');
    try {
      if (editing) await updateRecurringTransaction(editing.id, { name: name.trim(), amount_minor: amountMinor, transaction_type: type, frequency, next_occurrence: next });
      else await createRecurringTransaction({ name: name.trim(), amount_minor: amountMinor, transaction_type: type, frequency, next_occurrence: next });
      close(); await load();
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to save recurring transaction.')); }
    finally { setSaving(false); }
  }

  async function remove(row: RecurringTransaction) { setSaving(true); try { await deleteRecurringTransaction(row.id); await load(); } catch (err) { setError(getApiErrorMessage(err, 'Unable to delete recurring transaction.')); } finally { setSaving(false); } }

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}><View><Text style={styles.title}>Recurring Transactions</Text><Text style={styles.subtitle}>Plan upcoming income and expenses</Text></View><Pressable style={styles.primaryButton} onPress={openCreate}><Text style={styles.primaryText}>Add</Text></Pressable></View>
    {loading ? <View style={styles.state}><ActivityIndicator /><Text>Loading recurring transactions...</Text></View> : null}
    {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Retry</Text></Pressable></View> : null}
    {!loading && !error && rows.length === 0 ? <Text style={styles.empty}>No recurring transactions yet.</Text> : null}
    {!error && rows.map((row) => <View key={row.id} style={styles.card}><Pressable onPress={() => openEdit(row)} style={styles.row}><View style={styles.info}><Text style={styles.name}>{row.name}</Text><Text style={styles.meta}>{row.frequency} • Next: {row.next_occurrence}</Text></View><Text style={[styles.amount, row.transaction_type === 'income' ? styles.income : styles.expense]}>{row.transaction_type === 'income' ? '+' : '-'}{money(row.amount_minor)}</Text></Pressable><View style={styles.actions}><Pressable onPress={() => openEdit(row)}><Text style={styles.action}>Edit</Text></Pressable><Pressable onPress={() => void remove(row)} disabled={saving}><Text style={styles.delete}>Delete</Text></Pressable></View></View>)}
  </ScrollView>
  <Modal visible={formVisible} transparent animationType="slide"><View style={styles.backdrop}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{editing ? 'Edit recurring transaction' : 'Add recurring transaction'}</Text><Pressable onPress={close}><Text>Close</Text></Pressable></View><TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} /><TextInput style={styles.input} placeholder="Amount in cents" keyboardType="number-pad" value={amount} onChangeText={setAmount} /><TextInput style={styles.input} placeholder="Next date (YYYY-MM-DD)" value={next} onChangeText={setNext} /><View style={styles.options}>{(['expense', 'income'] as const).map((item) => <Pressable key={item} style={[styles.option, type === item && styles.selected]} onPress={() => setType(item)}><Text>{item}</Text></Pressable>)}</View><View style={styles.options}>{(['weekly', 'biweekly', 'monthly'] as const).map((item) => <Pressable key={item} style={[styles.option, frequency === item && styles.selected]} onPress={() => setFrequency(item)}><Text>{item}</Text></Pressable>)}</View><Pressable style={styles.save} onPress={() => void save()} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}</Pressable></View></View></Modal></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: '#f8fafc' }, container: { padding: 24, paddingBottom: 48 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }, title: { color: '#0f172a', fontSize: 28, fontWeight: 'bold' }, subtitle: { color: '#64748b', marginTop: 4 }, primaryButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }, primaryText: { color: '#fff', fontWeight: '700' }, card: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 16 }, row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, info: { flex: 1 }, name: { color: '#0f172a', fontSize: 16, fontWeight: '700' }, meta: { color: '#64748b', marginTop: 5 }, amount: { fontWeight: '700' }, income: { color: '#15803d' }, expense: { color: '#dc2626' }, actions: { borderTopColor: '#e2e8f0', borderTopWidth: 1, flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 10 }, action: { color: '#2563eb', fontWeight: '600' }, delete: { color: '#b91c1c', fontWeight: '600' }, state: { alignItems: 'center', gap: 10, padding: 24 }, empty: { color: '#64748b', padding: 24, textAlign: 'center' }, error: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 14 }, errorText: { color: '#991b1b' }, retry: { color: '#1d4ed8', fontWeight: '700', marginTop: 8 }, backdrop: { backgroundColor: '#0008', flex: 1, justifyContent: 'flex-end' }, modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12, padding: 24 }, modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: '700' }, input: { borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, padding: 12 }, options: { flexDirection: 'row', gap: 8 }, option: { borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, padding: 10 }, selected: { backgroundColor: '#dbeafe', borderColor: '#2563eb' }, save: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 8, padding: 14 }, saveText: { color: '#fff', fontWeight: '700' } });
