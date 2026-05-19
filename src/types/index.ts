export interface RealTimeData {
  pvPower: number;          // 光伏总功率 (kW)
  loadsPower: number;       // 负载功率 (kW)
  batteryPower: number;     // 电池功率 (kW)，正=充电，负=放电
  SoC: number;              // 电池剩余容量 (%)
  meterPower: number;       // 电网功率 (kW)，正=进口，负=出口
  batStatus: string;        // 电池状态文字，如 "Discharge", "Charge", "Idle" 等
  gridStatus?: string;      // 电网状态，由前端计算（IMPORTING / EXPORTING）
}

export interface ApiResponse<T> {
  errno: number;
  msg: string;
  result: T;
}