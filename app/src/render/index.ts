/**
 * Render 模块
 *
 * 提供场景渲染功能，支持 SVG 渲染器。
 */

// 渲染器接口和类型
export type { Renderer, RenderOptions, RenderStats } from './Renderer';

// SVG 渲染器
export { SVGRenderer } from './SVGRenderer';
export type { SVGRendererConfig } from './SVGRenderer';

// 叠加层渲染器
export { OverlayRenderer, createOverlayRenderer } from './OverlayRenderer';
export type { OverlayRendererConfig } from './OverlayRenderer';

// SVG 辅助工具
export * from './SVGHelper';
