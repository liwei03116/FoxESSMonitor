import React, { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { saveCredentials } from "../utils/storage";

interface SetupScreenProps {
  onComplete: () => void; // 完成设置后回调
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [apiKey, setApiKey] = useState("");
  const [deviceSn, setDeviceSn] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const key = apiKey.trim();
    const sn = deviceSn.trim();

    if (!key || !sn) {
      Alert.alert("Validation", "Please fill in both API Key and Device SN.");
      return;
    }

    setSaving(true);
    try {
      await saveCredentials(key, sn);
      Alert.alert("Success", "Credentials saved successfully.", [
        { text: "OK", onPress: onComplete },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save credentials. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.inner}>
          <Text style={styles.title}>FoxESS Monitor Setup</Text>
          <Text style={styles.subtitle}>
            Please enter your FoxESS Cloud API credentials.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your API Key"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Device Serial Number (SN)</Text>
            <TextInput
              style={styles.input}
              value={deviceSn}
              onChangeText={setDeviceSn}
              placeholder="Enter your device SN"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? "Saving..." : "Save & Continue"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#D1D5DB",
    fontSize: 15,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  button: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#065F46",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});

export default SetupScreen;