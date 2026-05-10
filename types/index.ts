// types/index.ts

export interface BoundingBox {
  y: number;      // Y轴百分比
  x: number;      // X轴百分比
  height: number; // 高度百分比
  width: number;  // 宽度百分比
}

export interface CorrectionDetail {
  id: number;
  type: 'error' | 'highlight' | 'suggestion';
  question_text: string;
  process_analysis: string;
  bounding_box: [number, number, number, number]; // [y, x, h, w]
}

export interface GradingResult {
  summary: {
    total_score: number;
    correct_count: number;
    wrong_count: number;
    total_detected_questions?: number;
    weak_points?: string[]; // 👈 新增：AI 提取的薄弱知识点标签
  };
  correction_details: CorrectionDetail[];
  teacher_comment: string;
  radar_analysis: {
    [key: string]: number;
  };
  billing?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: string;
  };
}

export interface AISettings {
  provider: string;
  model: string;
  apiKey: string;
}

export interface UploadedImage {
  data: string;     // Base64 数据
  mimeType: string;
  preview: string;  // 本地预览 URL
}
