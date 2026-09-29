import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

import { router } from "expo-router";

export default function LoginScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <Text>Welcome to our app!</Text>

            <TextInput style={styles.input} placeholder="Email"></TextInput>
            <TextInput style={styles.input} placeholder="Password" secureTextEntry></TextInput>

            <Pressable style={styles.button} onPress={() => router.push("/dashboard")}>
                <Text style={styles.buttonText}>Log In</Text>
            </Pressable>
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
});