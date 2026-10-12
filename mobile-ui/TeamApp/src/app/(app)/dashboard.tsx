import { View, Text, StyleSheet } from "react-native";

export default function DashboardScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dashboard</Text>

            <Text>Total Balance</Text>
            <Text style={styles.balance}>$10,550.75</Text>

            <Text style={styles.sectionTitle}>Recent Transactions</Text>

            <Text>Walmart: -$72.31</Text>
            <Text>Paycheck: +$1,850.00</Text>
            <Text>Spotify: -$11.99</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },

    title: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 24,
    },

    balance: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 24,
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
    },
});