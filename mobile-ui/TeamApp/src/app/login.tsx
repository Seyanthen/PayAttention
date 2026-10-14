import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

import { login } from "@/services/api";

export default function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    async function handleLogin() {
        if (!username.trim() || !password) {
            setMessage("Enter a username and password.");
            return;
        }

        try {
            await login(username.trim(), password);
            router.replace("/(app)/dashboard" as any);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Login failed.");
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <Text>Welcome to our app!</Text>

            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <Pressable style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Log In</Text>
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
    },

    title: {
        fontSize: 32,
        fontWeight: "bold",
    },

    input: {
        borderWidth: 1,
        padding: 12,
        marginTop: 12,
        borderRadius: 8,
    },

    button: {
        padding: 14,
        marginTop: 16,
        borderRadius: 8,
        alignItems: "center",
        backgroundColor: "#2563eb",
    },

    buttonText: {
        color: "white",
        fontWeight: "bold",
    },

    message: {
        marginTop: 12,
    },
});
