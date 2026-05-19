import axios from "axios";
import CryptoJS from "crypto-js";
import { RealTimeData } from "../types";
import { getCredentials } from "../utils/storage";

const BASE_URL = "https://www.foxesscloud.com";
const API_PATH = "/op/v0/device/real/query";

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 60000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoffDelay = (retryCount: number): number => {
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
  const jitter = Math.random() * 10000;
  return exponentialDelay + jitter;
};

// 从存储获取当前凭证
const getApiCredentials = async () => {
  const creds = await getCredentials();
  if (!creds || !creds.apiKey || !creds.deviceSn) {
    throw new Error("Missing API credentials. Please complete setup.");
  }
  return creds;
};

const generateSignature = (path: string, apiKey: string, timestamp: number): string => {
  const signatureRaw = String.raw`${path}\r\n${apiKey}\r\n${timestamp}`;
  return CryptoJS.MD5(signatureRaw).toString();
};

const createHeaders = (path: string, apiKey: string) => {
  const timestamp = Date.now();
  return {
    "Content-Type": "application/json",
    token: apiKey,
    timestamp: timestamp.toString(),
    signature: generateSignature(path, apiKey, timestamp),
    lang: "en",
  };
};

export const fetchRealTimeData = async (retryCount = 0): Promise<RealTimeData> => {
  const { apiKey, deviceSn } = await getApiCredentials();

  try {
    console.log(`[API] 📡 Fetching... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    const response = await axios.post(
      `${BASE_URL}${API_PATH}`,
      {
        sn: deviceSn,
        variables: [
          "pvPower", "loadsPower", "batDischargePower", "batChargePower",
          "SoC", "meterPower", "batStatusV2"
        ],
      },
      { headers: createHeaders(API_PATH, apiKey), timeout: 15000 }
    );

    const data = response.data;
    if (data.errno !== 0) {
      throw { errno: data.errno, message: data.msg };
    }

    console.log('[API] ✅ Success');
    const result = data.result[0];
    const datas: any[] = result.datas || [];

    const findVal = (varName: string): number | string => {
      const item = datas.find((d: any) => d.variable === varName);
      return item?.value ?? 0;
    };

    const pvPower = Number(findVal("pvPower")) || 0;
    const loadsPower = Number(findVal("loadsPower")) || 0;
    const SoC = Number(findVal("SoC")) || 0;
    const meterPower = Number(findVal("meterPower")) || 0;
    const batStatusV2 = String(findVal("batStatusV2") || "");
    const batDischargePower = Number(findVal("batDischargePower")) || 0;
    const batChargePower = Number(findVal("batChargePower")) || 0;

    let batteryPower = 0;
    if (batStatusV2.toLowerCase() === 'discharge') {
      batteryPower = -batDischargePower;
    } else if (batStatusV2.toLowerCase() === 'charge') {
      batteryPower = batChargePower;
    } else if (batDischargePower > 0) {
      batteryPower = -batDischargePower;
    } else if (batChargePower > 0) {
      batteryPower = batChargePower;
    }

    return {
      pvPower,
      loadsPower,
      batteryPower,
      SoC,
      meterPower,
      batStatus: batStatusV2,
    };
  } catch (error: any) {
    const errno = error?.errno || error?.response?.data?.errno;
    const isRateLimited = errno === 40402;

    if (isRateLimited && retryCount < MAX_RETRIES) {
      const waitTime = calculateBackoffDelay(retryCount);
      console.warn(`[API] ⚠️ Rate limited. Waiting ${Math.round(waitTime/1000)}s...`);
      await sleep(waitTime);
      return fetchRealTimeData(retryCount + 1);
    }

    const errorMsg = errno ? `API Error ${errno}: ${error.message}` : error.message;
    console.error(`[API] ❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
};