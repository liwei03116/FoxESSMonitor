import AsyncStorage from "@react-native-async-storage/async-storage";

const CRED_KEY = "foxess_credentials";
const CACHE_KEY = "foxess_last_data";

// ---------- 凭证管理 ----------
export const saveCredentials = async (apiKey: string, deviceSn: string) => {
  await AsyncStorage.setItem(
    CRED_KEY,
    JSON.stringify({ apiKey, deviceSn })
  );
};

export const getCredentials = async (): Promise<{
  apiKey: string;
  deviceSn: string;
} | null> => {
  const raw = await AsyncStorage.getItem(CRED_KEY);
  return raw ? JSON.parse(raw) : null;
};

// ---------- 实时数据缓存 ----------
export const saveCache = async (data: any) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Cache save failed:", e);
  }
};

export const loadCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Cache load failed:", e);
  }
};