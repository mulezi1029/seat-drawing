/**
 * @file textarea.tsx
 * @description 文本域组件 - 可复用的多行文本输入UI组件
 *
 * 功能特性:
 * - 标准HTML textarea元素的包装
 * - Tailwind CSS样式化
 * - 自适应高度 (field-sizing-content)
 * - 焦点、禁用、错误状态支持
 * - ARIA无效状态支持
 * - 深色模式支持
 * - 最小高度16px
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea 文本域组件
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"textarea">} props - 标准HTML textarea元素的所有属性
 *
 * @example
 * // 基础文本域
 * <Textarea placeholder="输入多行文本" />
 *
 * // 禁用状态
 * <Textarea disabled />
 *
 * // 自定义行数
 * <Textarea rows={5} />
 *
 * // 无效状态
 * <Textarea aria-invalid="true" />
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // 边框和背景: 边框颜色、半透明深色背景
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
        // ARIA无效状态
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "dark:bg-input/30",
        // 布局和大小: flex行、自适应高度、最小16px、全宽、圆角、边框、padding
        "flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow]",
        // 轮廓和焦点: 无轮廓、3px ring光晕
        "outline-none focus-visible:ring-[3px]",
        // 禁用状态: 无法交互、不可点击、半透明
        "disabled:cursor-not-allowed disabled:opacity-50",
        // 响应式: 平板端为小文本
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
