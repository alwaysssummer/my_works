export interface FloatingMemo {
  id: string;
  text: string;
  position: { x: number; y: number }; // 화면 비율(%) 기반
  color: "yellow" | "blue" | "green" | "pink";
  minimized: boolean;
  createdAt: string; // ISO string
}
