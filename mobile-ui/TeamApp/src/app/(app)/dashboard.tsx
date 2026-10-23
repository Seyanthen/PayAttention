import { useState } from "react";
import { router } from "expo-router";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";

import { logout } from "@/services/auth";

export default function DashboardScreen() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [message, setMessage] = useState("");

    async function handleLogout() {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);
        setMessage("");
        try {
            await logout();
            router.replace("/login");
        } catch {
            setMessage("We couldn't complete logout. Please try again.");
        } finally {
            setIsLoggingOut(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dashboard</Text>

            <Text>Total Balance</Text>
            <Text style={styles.balance}>$10,550.75</Text>

            <Text style={styles.sectionTitle}>Recent Transactions</Text>

            <Text>Walmart: -$72.31</Text>
            <Text>Paycheck: +$1,850.00</Text>
            <Text>Spotify: -$11.99</Text>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable
                style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
                onPress={handleLogout}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoggingOut, busy: isLoggingOut }}
            >
                {isLoggingOut ? (
                    <ActivityIndicator color="#b91c1c" />
                ) : (
                    <Text style={styles.logoutButtonText}>Log out</Text>
                )}
            </Pressable>
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

    message: {
        marginTop: 12,
        color: "#b91c1c",
    },

    logoutButton: {
        padding: 14,
        marginTop: 32,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#b91c1c",
    },

    logoutButtonText: {
        color: "#b91c1c",
        fontWeight: "bold",
    },

    buttonDisabled: {
        opacity: 0.7,
    },
});
