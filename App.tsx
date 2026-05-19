import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import DashboardScreen from "./src/screens/DashboardScreen";
import SetupScreen from "./src/screens/SetupScreen";
import { getCredentials } from "./src/utils/storage";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    // 检查是否已有凭证
    const checkCredentials = async () => {
      try {
        const creds = await getCredentials();
        if (creds && creds.apiKey && creds.deviceSn) {
          setIsSetupComplete(true);
        }
      } catch (error) {
        console.error("Failed to load credentials:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkCredentials();
  }, []);

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {isSetupComplete ? (
        <DashboardScreen />
      ) : (
        <SetupScreen onComplete={handleSetupComplete} />
      )}
    </SafeAreaProvider>
  );
}