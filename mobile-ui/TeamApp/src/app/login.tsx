import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";

import { getApiErrorMessage, login } from "@/services/api";
import { enableMockAuthentication } from "@/services/auth";
import { required } from "@/services/validation";

export default function LoginScreen() {
    const isMounted = useRef(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => () => {
        isMounted.current = false;
    }, []);

    function handleTestingBypass() {
        if (enableMockAuthentication()) {
            router.replace("/(app)/dashboard" as any);
        }
    }

    async function handleLogin() {
        if (isLoading) {
            return;
        }

        const nextErrors = {
            username: required(username, "Username"),
            password: required(password, "Password"),
        };
        if (nextErrors.username || nextErrors.password) {
            setFieldErrors(nextErrors);
            setMessage("Please correct the highlighted fields.");
            return;
        }

        setFieldErrors({});
        setMessage("");
        setIsLoading(true);

        try {
            await login(username.trim(), password);
            if (isMounted.current) {
                router.replace("/(app)/dashboard" as any);
            }
        } catch (error) {
            if (isMounted.current) {
                setMessage(getApiErrorMessage(error, "Login failed. Please try again."));
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
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
                onChange={(event) => {
                    setUsername(event.nativeEvent.text);
                    setFieldErrors((current) => ({ ...current, username: undefined }));
                }}
                autoCapitalize="none"
                editable={!isLoading}
            />
            {fieldErrors.username ? <Text style={styles.fieldError}>{fieldErrors.username}</Text> : null}
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChange={(event) => {
                    setPassword(event.nativeEvent.text);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
                autoCapitalize="none"
                editable={!isLoading}
            />
            {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}

            <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Log In</Text>
                )}
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            {__DEV__ ? (
                <Pressable style={styles.button} onPress={handleTestingBypass}>
                    <Text style={styles.buttonText}>Testing Bypass</Text>
                </Pressable>
            ) : null}

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

    buttonDisabled: {
        opacity: 0.7,
    },

    message: {
        marginTop: 12,
    },

    fieldError: {
        marginTop: 4,
        color: "#b91c1c",
    },
});
