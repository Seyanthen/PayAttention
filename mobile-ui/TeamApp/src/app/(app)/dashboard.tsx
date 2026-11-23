import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { isMockAuthenticated, logout } from "@/services/auth";
import { getApiErrorMessage, getCurrentMonthSummary, getMonthlyReport, getRecurringTransactions, type FinancialSummary, type RecurringTransaction } from "@/services/api";
import RecurringTransactionsModal from "@/components/RecurringTransactionsModal";
import { AndroidScreenSafeArea } from '@/components/android-screen-safe-area';

const spendingCategories = [
    { name: "Housing", percentage: 42, color: "#2563eb" },
    { name: "Food", percentage: 21, color: "#14b8a6" },
    { name: "Transportation", percentage: 14, color: "#f59e0b" },
    { name: "Entertainment", percentage: 12, color: "#8b5cf6" },
    { name: "Other", percentage: 11, color: "#94a3b8" },
];

const monthlySpending = [
    { month: "Apr", amount: 1620 },
    { month: "May", amount: 1940 },
    { month: "Jun", amount: 1780 },
    { month: "Jul", amount: 2040 },
    { month: "Aug", amount: 2310 },
    { month: "Sep", amount: 2175 },
];

export default function DashboardScreen() {
    const isMounted = useRef(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [message, setMessage] = useState("");
    const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
    const [recurringLoading, setRecurringLoading] = useState(true);
    const [recurringError, setRecurringError] = useState("");
    const [recurringModalVisible, setRecurringModalVisible] = useState(false);
    const [recurringModalMode, setRecurringModalMode] = useState<"list" | "create">("list");
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [monthlySpendingData, setMonthlySpendingData] = useState(monthlySpending);
    const [spendingCategoriesData, setSpendingCategoriesData] = useState(spendingCategories);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState("");

    const loadSummary = useCallback(async () => {
        if (isMockAuthenticated()) {
            setSummaryLoading(false);
            return;
        }

        setSummaryLoading(true); setSummaryError("");
        try {
            const current = await getCurrentMonthSummary();
            if (!isMounted.current) return;
            setSummary(current);
            setSpendingCategoriesData(toCategoryData(current));
            try {
                const end = new Date();
                const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
                const monthly = await getMonthlyReport(formatDate(start), formatDate(end));
                if (isMounted.current) setMonthlySpendingData(monthly.months.map((month) => ({ month: formatMonth(month.month), amount: month.expenses_minor })));
            } catch {
                // The primary balance and current-month metrics remain usable if the trend report is unavailable.
            }
        } catch (error) {
            if (isMounted.current) setSummaryError(getApiErrorMessage(error, "Unable to load dashboard data."));
        } finally {
            if (isMounted.current) setSummaryLoading(false);
        }
    }, []);

    async function loadRecurring() {
        setRecurringLoading(true); setRecurringError("");
        try { setRecurring((await getRecurringTransactions()).slice(0, 4)); }
        catch (error) { setRecurringError(getApiErrorMessage(error, "Unable to load recurring transactions.")); }
        finally { setRecurringLoading(false); }
    }

    useEffect(() => () => {
        isMounted.current = false;
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { void loadRecurring(); }, 0);
        return () => clearTimeout(timer);
    }, []);

    useFocusEffect(useCallback(() => {
        const timer = setTimeout(() => { void loadSummary(); }, 0);
        return () => clearTimeout(timer);
    }, [loadSummary]));

    async function handleLogout() {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        setMessage("");
        try {
            await logout();
            if (isMounted.current) router.replace("/login");
        } catch {
            if (isMounted.current) setMessage("We couldn't complete logout. Please try again.");
        } finally {
            if (isMounted.current) setIsLoggingOut(false);
        }
    }

    function openRecurringModal(mode: "list" | "create") {
        setRecurringModalMode(mode);
        setRecurringModalVisible(true);
    }

    return (
        <AndroidScreenSafeArea style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Dashboard</Text>
                    {/* <Text style={styles.subtitle}>A clear view of your money</Text> */}
                </View>

                <View style={styles.balanceCard}>
                    <Text style={styles.cardLabel}>Total Balance</Text>
                    <Text style={styles.balance}>{summaryLoading ? "Loading…" : formatCurrency(summary?.total_balance_minor ?? 845200)}</Text>
                </View>

                <View style={styles.monthlyCard}>
                    <View style={styles.monthHeader}>
                        <Text style={styles.monthTitle}>{summary ? formatMonthTitle(summary.period_start) : "September"}</Text>
                        <Text style={styles.monthCaption}>Monthly overview</Text>
                    </View>
                    <SummaryRow label="Income" amount={formatCurrency(summary?.total_income_minor ?? 340000)} amountStyle={styles.incomeText} />
                    <SummaryRow label="Expenses" amount={formatCurrency(summary?.total_expenses_minor ?? 217500)} amountStyle={styles.expenseText} />
                    <View style={styles.divider} />
                    <SummaryRow label="Net" amount={formatCurrency(summary?.monthly_cash_flow_minor ?? 122500, true)} amountStyle={styles.netText} />
                </View>

                {summaryError ? <Text style={styles.message}>{summaryError}</Text> : null}

                <View style={styles.chartCard} accessibilityLabel="Spending by category chart">
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Spending by category</Text>
                        <Text style={styles.chartCaption}>September expenses</Text>
                    </View>
                    {spendingCategoriesData.map((category) => (
                        <View key={category.name} style={styles.categoryRow}>
                            <View style={styles.categoryLabelRow}>
                                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                                <Text style={styles.categoryName}>{category.name}</Text>
                                <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                            </View>
                            <View style={styles.categoryTrack}>
                                <View style={[styles.categoryBar, { backgroundColor: category.color, width: `${category.percentage}%` }]} />
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.chartCard} accessibilityLabel="Monthly spending trends chart">
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Monthly spending trends</Text>
                        <Text style={styles.chartCaption}>Total expenses</Text>
                    </View>
                    <View style={styles.trendChart}>
                    {monthlySpendingData.map((entry) => (
                            <View key={entry.month} style={styles.trendColumn}>
                                <Text style={styles.trendAmount}>{formatCompactCurrency(entry.amount)}</Text>
                                <View style={styles.trendBarTrack}>
                                <View style={[styles.trendBar, { height: `${Math.max(...monthlySpendingData.map((item) => item.amount), 1) ? (entry.amount / Math.max(...monthlySpendingData.map((item) => item.amount), 1)) * 100 : 0}%` }]} />
                                </View>
                                <Text style={styles.trendMonth}>{entry.month}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.recurringCard} accessibilityLabel="Recurring Transactions">
                    <View style={styles.chartHeader}><Text style={styles.chartTitle}>Recurring Transactions</Text><Text style={styles.chartCaption}>Upcoming scheduled activity</Text></View>
                    {recurringLoading ? <ActivityIndicator accessibilityLabel="Loading recurring transactions" /> : null}
                    {recurringError ? <View><Text style={styles.message}>{recurringError}</Text><Pressable onPress={() => void loadRecurring()}><Text style={styles.linkText}>Retry</Text></Pressable></View> : null}
                    {!recurringLoading && !recurringError && recurring.length === 0 ? <Text style={styles.emptyText}>No recurring transactions yet.</Text> : null}
                    {!recurringLoading && !recurringError && recurring.map((row) => <View key={row.id} style={styles.recurringRow}><View style={styles.recurringInfo}><Text style={styles.recurringName}>{row.name}</Text><Text style={styles.recurringMeta}>{row.frequency} · Next: {row.next_occurrence}</Text></View><Text style={[styles.recurringAmount, row.transaction_type === "income" ? styles.incomeText : styles.expenseText]}>{row.transaction_type === "income" ? "+" : "-"}${(row.amount_minor / 100).toFixed(2)}</Text></View>)}
                    <View style={styles.recurringActions}><Pressable style={styles.secondaryButton} onPress={() => openRecurringModal("list")}><Text style={styles.secondaryButtonText}>show more</Text></Pressable><Pressable style={styles.primarySmallButton} onPress={() => openRecurringModal("create")}><Text style={styles.primarySmallButtonText}>add recurring transaction</Text></Pressable></View>
                </View>

                {message ? <Text style={styles.message}>{message}</Text> : null}

                <Pressable
                    style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isLoggingOut, busy: isLoggingOut }}
                >
                    {isLoggingOut ? <ActivityIndicator color="#b91c1c" /> : <Text style={styles.logoutButtonText}>Log out</Text>}
                </Pressable>
            </ScrollView>
            <RecurringTransactionsModal
                visible={recurringModalVisible}
                initialMode={recurringModalMode}
                onClose={() => setRecurringModalVisible(false)}
                onChanged={() => void loadRecurring()}
            />
        </AndroidScreenSafeArea>
    );
}

function SummaryRow({ label, amount, amountStyle }: { label: string; amount: string; amountStyle: object }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={[styles.summaryAmount, amountStyle]}>{amount}</Text>
        </View>
    );
}

function formatCurrency(minor: number, includePlus = false) {
    const dollars = Math.abs(minor / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return `${minor < 0 ? "-" : includePlus && minor > 0 ? "+" : ""}${dollars}`;
}

function formatCompactCurrency(minor: number) {
    return `$${(minor / 100000).toFixed(1)}k`;
}

function formatDate(value: Date) {
    return value.toISOString().slice(0, 10);
}

function formatMonth(value: string) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" });
}

function formatMonthTitle(value: string) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

function toCategoryData(value: FinancialSummary) {
    const colors = ["#2563eb", "#14b8a6", "#f59e0b", "#8b5cf6", "#94a3b8"];
    const total = value.total_expenses_minor || 1;
    return value.by_category.map((category, index) => ({
        name: category.category_name || "Uncategorized",
        percentage: Math.round(((category.total_minor ?? category.total_expenses_minor ?? 0) / total) * 100),
        color: colors[index % colors.length],
    }));
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#f8fafc" },
    container: { padding: 24, paddingBottom: 48 },
    header: { marginBottom: 24 },
    title: { color: "#0f172a", fontSize: 32, fontWeight: "bold" },
    subtitle: { color: "#64748b", marginTop: 4 },
    balanceCard: {
        backgroundColor: "#2563eb",
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#1d4ed8",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 4,
    },
    cardLabel: { color: "#dbeafe", fontSize: 14, fontWeight: "600", marginBottom: 8 },
    balance: { color: "#ffffff", fontSize: 36, fontWeight: "bold", letterSpacing: 0.3 },
    monthlyCard: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 16, borderWidth: 1, padding: 20 },
    monthHeader: { marginBottom: 16 },
    monthTitle: { color: "#0f172a", fontSize: 21, fontWeight: "bold" },
    monthCaption: { color: "#64748b", fontSize: 13, marginTop: 3 },
    summaryRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
    summaryLabel: { color: "#475569", fontSize: 16 },
    summaryAmount: { fontSize: 16, fontWeight: "700" },
    incomeText: { color: "#15803d" },
    expenseText: { color: "#dc2626" },
    netText: { color: "#1d4ed8", fontSize: 18 },
    divider: { backgroundColor: "#e2e8f0", height: 1, marginVertical: 2 },
    chartCard: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 16, borderWidth: 1, marginTop: 20, padding: 20 },
    chartHeader: { marginBottom: 18 },
    chartTitle: { color: "#0f172a", fontSize: 18, fontWeight: "bold" },
    chartCaption: { color: "#64748b", fontSize: 13, marginTop: 4 },
    categoryRow: { marginBottom: 14 },
    categoryLabelRow: { alignItems: "center", flexDirection: "row", marginBottom: 7 },
    categoryDot: { borderRadius: 5, height: 10, marginRight: 8, width: 10 },
    categoryName: { color: "#475569", flex: 1, fontSize: 14 },
    categoryPercentage: { color: "#0f172a", fontSize: 14, fontWeight: "700" },
    categoryTrack: { backgroundColor: "#e2e8f0", borderRadius: 4, height: 8, overflow: "hidden" },
    categoryBar: { borderRadius: 4, height: "100%" },
    trendChart: { alignItems: "flex-end", flexDirection: "row", height: 178, justifyContent: "space-between" },
    trendColumn: { alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" },
    trendAmount: { color: "#64748b", fontSize: 11, marginBottom: 6 },
    trendBarTrack: { alignItems: "center", backgroundColor: "#eff6ff", borderRadius: 6, height: 112, justifyContent: "flex-end", overflow: "hidden", width: 24 },
    trendBar: { backgroundColor: "#2563eb", borderRadius: 6, minHeight: 8, width: "100%" },
    trendMonth: { color: "#64748b", fontSize: 12, marginTop: 8 },
    recurringCard: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 16, borderWidth: 1, marginTop: 20, padding: 20 },
    recurringRow: { alignItems: "center", borderBottomColor: "#f1f5f9", borderBottomWidth: 1, flexDirection: "row", paddingVertical: 12 },
    recurringInfo: { flex: 1 },
    recurringName: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
    recurringMeta: { color: "#64748b", fontSize: 12, marginTop: 4 },
    recurringAmount: { fontSize: 15, fontWeight: "700" },
    emptyText: { color: "#64748b", paddingVertical: 12 },
    linkText: { color: "#1d4ed8", fontWeight: "700", marginTop: 8 },
    recurringActions: { flexDirection: "row", gap: 8, marginTop: 16 },
    secondaryButton: { alignItems: "center", borderColor: "#2563eb", borderRadius: 8, borderWidth: 1, flex: 1, padding: 10 },
    secondaryButtonText: { color: "#2563eb", fontWeight: "700" },
    primarySmallButton: { alignItems: "center", backgroundColor: "#2563eb", borderRadius: 8, flex: 1, padding: 10 },
    primarySmallButtonText: { color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" },
    message: { color: "#b91c1c", marginTop: 16 },
    logoutButton: { alignItems: "center", borderColor: "#b91c1c", borderRadius: 8, borderWidth: 1, marginTop: 32, padding: 14 },
    logoutButtonText: { color: "#b91c1c", fontWeight: "bold" },
    buttonDisabled: { opacity: 0.7 },
});
