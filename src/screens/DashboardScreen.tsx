import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, RefreshControl,
  ScrollView, ActivityIndicator, AppState, AppStateStatus,
} from "react-native";
import { fetchRealTimeData } from "../services/foxessApi";
import { RealTimeData } from "../types";
import { saveCache, loadCache } from "../utils/storage";

// 自动选择功率单位：< 10 W 时显示 W，否则显示 kW
const formatPower = (kW: number): string => {
  const abs = Math.abs(kW);
  if (abs < 0.01) {
    return `${(kW * 1000).toFixed(0)} W`;
  }
  return `${kW.toFixed(2)} kW`;
};

const DashboardScreen: React.FC = () => {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchCount, setFetchCount] = useState(0);
  const [manualRefreshPending, setManualRefreshPending] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const loadData = useCallback(async () => {
    if (refreshing) return;
    setError(null);
    try {
      const result = await fetchRealTimeData();
      setData(result);
      setLastUpdated(new Date());
      setFetchCount(cnt => cnt + 1);
      saveCache(result);
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      setError(msg.includes("40402") ? "API rate limited, retrying later..." : msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // 轮询：5 分钟
  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    console.log('[Dashboard] ⏱️ Starting 90sec polling');
    intervalRef.current = setInterval(loadData, 60000);
  }, [loadData]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // 前后台切换
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        loadData();
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        stopPolling();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [loadData, startPolling, stopPolling]);

  // 初始化加载
  useEffect(() => {
    loadCache().then(cached => { if (cached) setData(cached); });
    loadData();
    startPolling();
    return () => stopPolling();
  }, []);

  // 下拉刷新（30秒防抖）
  const onRefresh = useCallback(() => {
    if (manualRefreshPending) return;
    setManualRefreshPending(true);
    setRefreshing(true);
    loadData().finally(() => {
      setTimeout(() => setManualRefreshPending(false), 30000);
    });
  }, [loadData, manualRefreshPending]);

  if (loading && !data) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00A86B" /><Text style={styles.loadingText}>Connecting...</Text></View>;
  }

  // 计算电网状态
  const gridPower = data?.meterPower ?? 0;
  const gridStatus = gridPower >= 0 ? "IMPORTING市电输入" : "EXPORTING市电输出";

  // 电池状态文字，将 "Discharge" 转为 "DISCHARGING"，“Charge” -> "CHARGING"
  const rawBatStatus = data?.batStatus || "";
  let batteryStatusText: string;
  if (rawBatStatus.toLowerCase() === "discharge") {
    batteryStatusText = "DISCHARGING放电";
  } else if (rawBatStatus.toLowerCase() === "charge") {
    batteryStatusText = "CHARGING充电";
  } else {
    batteryStatusText = (data?.batteryPower ?? 0) >= 0 ? "CHARGING充电" : "DISCHARGING放电";
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" colors={["#00A86B"]} />}
      >
        {error && <View style={styles.errorBanner}><Text style={styles.errorBannerText}>⚠ {error}</Text></View>}

        {/* SOLAR */}
        <View style={[styles.card, styles.solarCard]}>
          <Text style={styles.cardTitle}>SOLAR太阳能</Text>
          <Text style={styles.cardValue}>{formatPower(data?.pvPower ?? 0)}</Text>
        </View>

        {/* GRID */}
        <View style={[styles.card, styles.gridCard]}>
          <Text style={styles.cardTitle}>GRID {gridStatus}</Text>
          <Text style={styles.cardValue}>{formatPower(gridPower)}</Text>
          <Text style={styles.soc}>TOTAL总计</Text>
        </View>

        {/* BATTERY */}
        <View style={[styles.card, styles.batteryCard]}>
          <Text style={styles.cardTitle}>BATTERY电池</Text>
          <Text style={styles.cardValue}>{formatPower(data?.batteryPower ?? 0)}</Text>
          <Text style={styles.soc}>
            {batteryStatusText} | {data?.SoC.toFixed(0)}%
          </Text>
        </View>

        {/* HOME */}
        <View style={[styles.card, styles.homeCard]}>
          <Text style={styles.cardTitle}>HOME家</Text>
          <Text style={styles.cardValue}>{formatPower(data?.loadsPower ?? 0)}</Text>
        </View>

        {lastUpdated && <Text style={styles.updateText}>Updated: {lastUpdated.toLocaleTimeString()}</Text>}
        <Text style={styles.debugText}>Refresh count: {fetchCount}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#0D1117" },
  center: { flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#0D1117" },
  loadingText: { color:"#9CA3AF", marginTop:12, fontSize:16 },
  scrollContent: { padding:16 },
  card: { borderRadius:20, padding:24, marginBottom:16, alignItems:"center", elevation:8, shadowColor:"#000", shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:6 },
  solarCard: { backgroundColor:"#F59E0B" },
  gridCard: { backgroundColor:"#3B82F6" },
  batteryCard: { backgroundColor:"#10B981" },
  homeCard: { backgroundColor:"#6366F1" },
  cardTitle: { fontSize:18, fontWeight:"600", color:"#FFF", opacity:0.9, marginBottom:8, letterSpacing:1 },
  cardValue: { fontSize:52, fontWeight:"bold", color:"#FFF" },
  soc: { fontSize:18, color:"#FFF", marginTop:8, fontWeight:"500" },
  errorBanner: { backgroundColor:"#EF4444", paddingVertical:8, paddingHorizontal:16, borderRadius:8, marginBottom:12 },
  errorBannerText: { color:"#FFF", textAlign:"center", fontSize:14 },
  updateText: { color:"#6B7280", fontSize:14, textAlign:"center", marginTop:8 },
  debugText: { color:"#4B5563", fontSize:12, textAlign:"center", marginTop:4 },
});

export default DashboardScreen;