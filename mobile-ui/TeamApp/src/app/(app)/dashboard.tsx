import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { logout } from "@/services/auth";

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

    useEffect(() => () => {
        isMounted.current = false;
    }, []);

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Dashboard</Text>
                    {/* <Text style={styles.subtitle}>A clear view of your money</Text> */}
                </View>

                <View style={styles.balanceCard}>
                    <Text style={styles.cardLabel}>Total Balance</Text>
                    <Text style={styles.balance}>$8,452</Text>
                </View>

                <View style={styles.monthlyCard}>
                    <View style={styles.monthHeader}>
                        <Text style={styles.monthTitle}>September</Text>
                        <Text style={styles.monthCaption}>Monthly overview</Text>
                    </View>
                    <SummaryRow label="Income" amount="$3,400" amountStyle={styles.incomeText} />
                    <SummaryRow label="Expenses" amount="$2,175" amountStyle={styles.expenseText} />
                    <View style={styles.divider} />
                    <SummaryRow label="Net" amount="+$1,225" amountStyle={styles.netText} />
                </View>

                <View style={styles.chartCard} accessibilityLabel="Spending by category chart">
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Spending by category</Text>
                        <Text style={styles.chartCaption}>September expenses</Text>
                    </View>
                    {spendingCategories.map((category) => (
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
                        {monthlySpending.map((entry) => (
                            <View key={entry.month} style={styles.trendColumn}>
                                <Text style={styles.trendAmount}>${(entry.amount / 1000).toFixed(1)}k</Text>
                                <View style={styles.trendBarTrack}>
                                    <View style={[styles.trendBar, { height: `${(entry.amount / 2310) * 100}%` }]} />
                                </View>
                                <Text style={styles.trendMonth}>{entry.month}</Text>
                            </View>
                        ))}
                    </View>
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
        </SafeAreaView>
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
    message: { color: "#b91c1c", marginTop: 16 },
    logoutButton: { alignItems: "center", borderColor: "#b91c1c", borderRadius: 8, borderWidth: 1, marginTop: 32, padding: 14 },
    logoutButtonText: { color: "#b91c1c", fontWeight: "bold" },
    buttonDisabled: { opacity: 0.7 },
});
