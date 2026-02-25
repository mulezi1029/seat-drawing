/**
 * Renderer 接口定义
 *
 * 定义渲染器的基本接口，用于将场景图渲染到画布。
 * 支持不同的渲染后端（SVG、Canvas、WebGL等）。
 */

import type { SceneGraph } from '@/scene/SceneGraph';
import type { ViewportState } from '@/types';

/**
 * 渲染器接口
 */
export interface Renderer {
  /**
   * 渲染场景（数据变化时调用，低频）
   * @param scene 场景图
   * @param viewport 视口状态
   */
  render(scene: SceneGraph, viewport: ViewportState): void;

  /**
   * 更新视口变换（平移/缩放时调用，高频）
   * 性能优化：只更新 transform，不重新渲染数据
   * @param viewport 视口状态
   */
  updateViewport(viewport: ViewportState): void;

  /**
   * 设置渲染容器
   * @param container HTML容器元素
   */
  setContainer(container: HTMLElement): void;

  /**
   * 销毁渲染器，清理资源
   */
  destroy(): void;

  /**
   * 调整渲染器大小
   * @param width 新宽度
   * @param height 新高度
   */
  resize(width: number, height: number): void;
}

/**
 * 渲染选项
 */
export interface RenderOptions {
  /** 背景颜色 */
  backgroundColor: string;
  /** 是否抗锯齿 */
  antialias?: boolean;
  /** 性能模式 */
  performanceMode?: 'quality' | 'balanced' | 'performance';
}

/**
 * 渲染统计信息
 */
export interface RenderStats {
  /** 帧率 */
  fps: number;
  /** 渲染耗时（毫秒） */
  renderTime: number;
  /** 绘制的元素数量 */
  elementCount: number;
  /** 绘制的顶点数量 */
  vertexCount: number;
}
