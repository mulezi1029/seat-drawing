/**
 * @file toggle.tsx
 * @description 切换按钮组件 - 可复用的开关式按钮UI组件
 *
 * 功能特性:
 * - 基于Radix UI Toggle Primitive构建
 * - 支持2种变体: default(默认), outline(轮廓)
 * - 支持3种大小: default(默认), sm(小), lg(大)
 * - 按下时改变状态和样式
 * - 完整的键盘交互(Space键)
 * - 自动焦点管理
 * - 支持禁用状态
 * - ARIA pressed属性支持
 */

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 切换按钮样式变体定义
 * 使用CVA库管理样式变体
 *
 * 基础样式包含:
 * - 布局: inline-flex, 居中对齐, 间隔2px
 * - 文本: 小文本, 中等字重, 防止换行
 * - 交互: hover时背景改变, 禁用时无交互
 * - 按下状态: data-[state=on]:bg-accent (按下时显示accent背景)
 * - SVG图标处理: 4x4默认大小, 无交互
 * - 焦点管理: ring光晕效果
 */
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    // 切换按钮变体 - 2种视觉样式
    variants: {
      variant: {
        // 默认样式: 透明背景
        default: "bg-transparent",
        // 轮廓样式: 边框、透明背景、阴影、hover时改变背景
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
      },
      // 切换按钮大小 - 3种规格
      size: {
        // 默认大小: 9px高度，左右padding 2px，最小宽度9px
        default: "h-9 px-2 min-w-9",
        // 小尺寸: 8px高度，左右padding 1.5px，最小宽度8px
        sm: "h-8 px-1.5 min-w-8",
        // 大尺寸: 10px高度，左右padding 2.5px，最小宽度10px
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Toggle 切换按钮组件
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {string} [variant] - 切换按钮变体: 'default' | 'outline'
 * @param {string} [size] - 切换按钮大小: 'default' | 'sm' | 'lg'
 * @param {React.ComponentProps<typeof TogglePrimitive.Root>} props - Radix UI Toggle Root的所有属性
 *
 * @example
 * // 默认切换按钮
 * <Toggle>
 *   <BoldIcon />
 * </Toggle>
 *
 * // 带文本的切换按钮
 * <Toggle>
 *   <BoldIcon />
 *   加粗
 * </Toggle>
 *
 * // 轮廓样式
 * <Toggle variant="outline" size="lg">
 *   <ItalicIcon />
 * </Toggle>
 *
 * // 默认按下状态
 * <Toggle defaultPressed>
 *   <UnderlineIcon />
 * </Toggle>
 */
function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
