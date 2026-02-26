/**
 * 数据导入导出工具
 * 
 * 提供场馆座位数据的导入导出功能
 */

import type { Section } from '@/types';

/**
 * 导出数据格式
 */
export interface ExportData {
  /** 版本号 */
  version: string;
  /** 导出时间 */
  timestamp: string;
  /** 场馆名称 */
  venueName: string;
  /** 背景图 URL */
  backgroundImage: string | null;
  /** 区域数据 */
  sections: Section[];
  /** 元数据 */
  metadata: {
    totalSections: number;
    totalSeats: number;
    createdAt: string;
    modifiedAt: string;
  };
}

/**
 * 导出场馆数据为 JSON
 * 
 * @param sections 区域数据
 * @param backgroundImage 背景图 URL
 * @param venueName 场馆名称
 * @returns 导出数据对象
 */
export function exportVenueData(
  sections: Section[],
  backgroundImage: string | null,
  venueName: string = 'Untitled Venue'
): ExportData {
  const totalSeats = sections.reduce((sum, section) => sum + (section.seats?.length || 0), 0);
  const now = new Date().toISOString();

  return {
    version: '1.0.0',
    timestamp: now,
    venueName,
    backgroundImage,
    sections,
    metadata: {
      totalSections: sections.length,
      totalSeats,
      createdAt: now,
      modifiedAt: now,
    },
  };
}

/**
 * 下载 JSON 文件
 * 
 * @param data 数据对象
 * @param filename 文件名
 */
export function downloadJSON(data: ExportData, filename: string = 'venue-data.json'): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * 导出场馆数据并下载
 * 
 * @param sections 区域数据
 * @param backgroundImage 背景图 URL
 * @param venueName 场馆名称
 */
export function exportAndDownload(
  sections: Section[],
  backgroundImage: string | null,
  venueName?: string
): void {
  const data = exportVenueData(sections, backgroundImage, venueName);
  const filename = `${venueName || 'venue'}-${Date.now()}.json`;
  downloadJSON(data, filename);
}

/**
 * 验证导入数据格式
 * 
 * @param data 待验证的数据
 * @returns 是否为有效的导出数据
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Partial<ExportData>;

  return (
    typeof obj.version === 'string' &&
    typeof obj.timestamp === 'string' &&
    typeof obj.venueName === 'string' &&
    Array.isArray(obj.sections) &&
    typeof obj.metadata === 'object' &&
    obj.metadata !== null
  );
}

/**
 * 解析导入的 JSON 文件
 * 
 * @param file 文件对象
 * @returns Promise<导出数据>
 */
export async function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (!validateImportData(data)) {
          reject(new Error('无效的数据格式'));
          return;
        }

        resolve(data);
      } catch (error) {
        reject(new Error('JSON 解析失败: ' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file);
  });
}

/**
 * 导入场馆数据
 * 
 * @param file JSON 文件
 * @returns Promise<导入的数据>
 */
export async function importVenueData(file: File): Promise<{
  sections: Section[];
  backgroundImage: string | null;
  venueName: string;
  metadata: ExportData['metadata'];
}> {
  const data = await parseImportFile(file);

  return {
    sections: data.sections,
    backgroundImage: data.backgroundImage,
    venueName: data.venueName,
    metadata: data.metadata,
  };
}

/**
 * 导出为可读的文本摘要
 * 
 * @param data 导出数据
 * @returns 文本摘要
 */
export function generateSummary(data: ExportData): string {
  const lines = [
    `场馆名称: ${data.venueName}`,
    `导出时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}`,
    `版本: ${data.version}`,
    '',
    `区域数量: ${data.metadata.totalSections}`,
    `座位总数: ${data.metadata.totalSeats}`,
    '',
    '区域详情:',
  ];

  data.sections.forEach((section, index) => {
    const seatCount = section.seats?.length || 0;
    const calibrated = section.calibrationData?.isCalibrated ? '已校准' : '未校准';
    lines.push(`  ${index + 1}. ${section.name} - ${seatCount} 个座位 (${calibrated})`);
  });

  return lines.join('\n');
}
