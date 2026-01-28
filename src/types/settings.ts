// 시간표 설정
export interface ScheduleSettings {
  defaultDuration: number; // 기본 수업 시간 (분)
  startHour: number; // 시간표 시작 (예: 14)
  endHour: number; // 시간표 종료 (예: 22)
  durationOptions: number[]; // 선택 가능한 수업 시간 [30, 40, 50, 60]
}

export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  defaultDuration: 50,
  startHour: 9,
  endHour: 24,
  durationOptions: [30, 40, 50, 60],
};
