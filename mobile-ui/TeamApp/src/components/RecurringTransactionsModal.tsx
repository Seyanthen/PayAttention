import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    createRecurringTransaction,
    deleteRecurringTransaction,
    getApiErrorMessage,
    getRecurringTransactions,
    type RecurringTransaction,
    updateRecurringTransaction,
} from "@/services/api";

type ModalMode = "list" | "create";

type RecurringTransactionsModalProps = {
    visible: boolean;
    initialMode?: ModalMode;
    onClose: () => void;
    onChanged?: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const money = (minor: number) => `$${(Math.abs(minor) / 100).toFixed(2)}`;

export default function RecurringTransactionsModal({
    visible,
    initialMode = "list",
    onClose,
    onChanged,
}: RecurringTransactionsModalProps) {
    const mounted = useRef(true);
    const [mode, setMode] = useState<ModalMode>(initialMode);
    const [rows, setRows] = useState<RecurringTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState<RecurringTransaction | null>(null);
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"income" | "expense">("expense");
    const [frequency, setFrequency] = useState<RecurringTransaction["frequency"]>("monthly");
    const [next, setNext] = useState(today());

    useEffect(() => () => {
        mounted.current = false;
    }, []);

    useEffect(() => {
        if (!visible) return undefined;
        const timer = setTimeout(() => {
            setMode(initialMode);
            setEditing(null);
            setError("");
            if (initialMode === "create") resetForm();
            void load();
        }, 0);
        return () => clearTimeout(timer);
    }, [initialMode, visible]);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const result = await getRecurringTransactions(true);
            if (mounted.current) setRows(result);
        } catch (err) {
            if (mounted.current) setError(getApiErrorMessage(err, "Unable to load recurring transactions."));
        } finally {
            if (mounted.current) setLoading(false);
        }
    }

    function resetForm() {
        setName("");
        setAmount("");
        setType("expense");
        setFrequency("monthly");
        setNext(today());
    }

    function openCreate() {
        setEditing(null);
        resetForm();
        setError("");
        setMode("create");
    }

    function openEdit(row: RecurringTransaction) {
        setEditing(row);
        setName(row.name);
        setAmount(String(row.amount_minor));
        setType(row.transaction_type);
        setFrequency(row.frequency);
        setNext(row.next_occurrence);
        setError("");
        setMode("create");
    }

    function closeForm() {
        if (!saving) {
            setEditing(null);
            setError("");
            setMode("list");
        }
    }

    async function save() {
        const amountMinor = Number(amount.trim());
        if (!name.trim() || !Number.isInteger(amountMinor) || amountMinor < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
            setError("Enter a name, a positive amount in cents, and a valid date (YYYY-MM-DD).");
            return;
        }

        setSaving(true);
        setError("");
        try {
            if (editing) {
                await updateRecurringTransaction(editing.id, {
                    name: name.trim(),
                    amount_minor: amountMinor,
                    transaction_type: type,
                    frequency,
                    next_occurrence: next,
                });
            } else {
                await createRecurringTransaction({
                    name: name.trim(),
                    amount_minor: amountMinor,
                    transaction_type: type,
                    frequency,
                    next_occurrence: next,
                });
            }
            setMode("list");
            await load();
            onChanged?.();
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to save recurring transaction."));
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(row: RecurringTransaction) {
        setSaving(true);
        setError("");
        try {
            await updateRecurringTransaction(row.id, { is_active: !row.is_active });
            await load();
            onChanged?.();
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to update recurring transaction."));
        } finally {
            setSaving(false);
        }
    }

    async function remove(row: RecurringTransaction) {
        setSaving(true);
        setError("");
        try {
            await deleteRecurringTransaction(row.id);
            await load();
            onChanged?.();
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to delete recurring transaction."));
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
            <SafeAreaView style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View style={styles.headerCopy}>
                            <Text style={styles.title}>Recurring Transactions</Text>
                            <Text style={styles.subtitle}>{mode === "create" ? (editing ? "Edit scheduled activity" : "Add scheduled activity") : "Manage upcoming income and expenses"}</Text>
                        </View>
                        <Pressable onPress={onClose} disabled={saving} accessibilityRole="button">
                            <Text style={styles.close}>Close</Text>
                        </Pressable>
                    </View>

                    {mode === "list" ? (
                        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                            {loading ? <View style={styles.state}><ActivityIndicator /><Text>Loading recurring transactions...</Text></View> : null}
                            {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Retry</Text></Pressable></View> : null}
                            {!loading && !error && rows.length === 0 ? <Text style={styles.empty}>No recurring transactions yet.</Text> : null}
                            {!error && rows.map((row) => (
                                <View key={row.id} style={[styles.card, !row.is_active && styles.inactiveCard]}>
                                    <Pressable onPress={() => openEdit(row)} style={styles.row}>
                                        <View style={styles.info}>
                                            <Text style={styles.name}>{row.name}</Text>
                                            <Text style={styles.meta}>{row.frequency} · Next: {row.next_occurrence}</Text>
                                            <Text style={row.is_active ? styles.active : styles.inactive}>{row.is_active ? "Active" : "Inactive"}</Text>
                                        </View>
                                        <Text style={[styles.amount, row.transaction_type === "income" ? styles.income : styles.expense]}>{row.transaction_type === "income" ? "+" : "-"}{money(row.amount_minor)}</Text>
                                    </Pressable>
                                    <View style={styles.actions}>
                                        <Pressable onPress={() => void toggleActive(row)} disabled={saving}><Text style={styles.action}>{row.is_active ? "Deactivate" : "Reactivate"}</Text></Pressable>
                                        <Pressable onPress={() => openEdit(row)} disabled={saving}><Text style={styles.action}>Edit</Text></Pressable>
                                        <Pressable onPress={() => void remove(row)} disabled={saving}><Text style={styles.delete}>Delete</Text></Pressable>
                                    </View>
                                </View>
                            ))}
                            <Pressable style={styles.addButton} onPress={openCreate} disabled={saving}><Text style={styles.addButtonText}>Add recurring transaction</Text></Pressable>
                        </ScrollView>
                    ) : (
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
                            {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
                            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
                            <TextInput style={styles.input} placeholder="Amount in cents" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
                            <TextInput style={styles.input} placeholder="Next date (YYYY-MM-DD)" value={next} onChangeText={setNext} />
                            <Text style={styles.label}>Transaction type</Text>
                            <View style={styles.options}>{(["expense", "income"] as const).map((item) => <Pressable key={item} style={[styles.option, type === item && styles.selected]} onPress={() => setType(item)}><Text>{item}</Text></Pressable>)}</View>
                            <Text style={styles.label}>Frequency</Text>
                            <View style={styles.options}>{(["weekly", "biweekly", "monthly"] as const).map((item) => <Pressable key={item} style={[styles.option, frequency === item && styles.selected]} onPress={() => setFrequency(item)}><Text>{item}</Text></Pressable>)}</View>
                            <View style={styles.formActions}>
                                <Pressable style={styles.cancelButton} onPress={closeForm} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                                <Pressable style={styles.saveButton} onPress={() => void save()} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}</Pressable>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { backgroundColor: "#0008", flex: 1, justifyContent: "flex-end" },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "92%", padding: 24 },
    header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
    headerCopy: { flex: 1, paddingRight: 16 },
    title: { color: "#0f172a", fontSize: 23, fontWeight: "700" },
    subtitle: { color: "#64748b", marginTop: 4 },
    close: { color: "#2563eb", fontWeight: "700", paddingVertical: 4 },
    list: { flexGrow: 0 },
    listContent: { paddingBottom: 12 },
    state: { alignItems: "center", gap: 10, padding: 24 },
    empty: { color: "#64748b", padding: 24, textAlign: "center" },
    error: { backgroundColor: "#fee2e2", borderRadius: 10, padding: 14 },
    errorText: { color: "#991b1b" },
    retry: { color: "#1d4ed8", fontWeight: "700", marginTop: 8 },
    card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 16 },
    inactiveCard: { opacity: 0.72 },
    row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    info: { flex: 1 },
    name: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
    meta: { color: "#64748b", marginTop: 5 },
    active: { color: "#15803d", fontSize: 12, fontWeight: "700", marginTop: 5 },
    inactive: { color: "#64748b", fontSize: 12, fontWeight: "700", marginTop: 5 },
    amount: { fontWeight: "700" },
    income: { color: "#15803d" },
    expense: { color: "#dc2626" },
    actions: { borderTopColor: "#e2e8f0", borderTopWidth: 1, flexDirection: "row", gap: 20, marginTop: 12, paddingTop: 10 },
    action: { color: "#2563eb", fontWeight: "600" },
    delete: { color: "#b91c1c", fontWeight: "600" },
    addButton: { alignItems: "center", backgroundColor: "#2563eb", borderRadius: 8, marginTop: 4, padding: 13 },
    addButtonText: { color: "#fff", fontWeight: "700" },
    form: { gap: 12, paddingBottom: 12 },
    label: { color: "#475569", fontSize: 13, fontWeight: "600", marginTop: 4 },
    input: { borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, padding: 12 },
    options: { flexDirection: "row", gap: 8 },
    option: { borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, padding: 10 },
    selected: { backgroundColor: "#dbeafe", borderColor: "#2563eb" },
    formActions: { flexDirection: "row", gap: 10, marginTop: 6 },
    cancelButton: { alignItems: "center", borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, flex: 1, padding: 14 },
    cancelText: { color: "#475569", fontWeight: "700" },
    saveButton: { alignItems: "center", backgroundColor: "#2563eb", borderRadius: 8, flex: 1, padding: 14 },
    saveText: { color: "#fff", fontWeight: "700" },
});
