/**
 * @file alert.tsx
 * @description 警告/提示框组件 - 可复用的提示消息UI组件
 *
 * 功能特性:
 * - 提供3个子组件: Alert, AlertTitle, AlertDescription
 * - 支持2种变体: default(默认), destructive(危险)
 * - 自动图标布局管理
 * - ARIA role="alert"无障碍属性
 * - 支持自定义样式
 *
 * 组件结构:
 * <Alert variant="destructive">
 *   <AlertIcon />
 *   <AlertTitle>错误</AlertTitle>
 *   <AlertDescription>出了一些问题</AlertDescription>
 * </Alert>
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 警告框样式变体定义
 * 使用CVA库管理样式变体
 */
const alertVariants = cva(
  // 基础样式
  "relative w-full rounded-lg border px-4 py-3 text-sm",
  // 栅栏布局: 有svg时显示图标和内容两列，无svg时仅显示内容
  "grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr]",
  "has-[>svg]:gap-x-3 gap-y-0.5 items-start",
  // SVG图标样式
  "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    // 警告框变体 - 2种视觉样式
    variants: {
      variant: {
        // 默认样式: 卡片背景和文字颜色
        default: "bg-card text-card-foreground",
        // 危险样式: 红色文字、卡片背景、描述文字更暗
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Alert 警告框组件
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {string} [variant] - 警告框变体: 'default' | 'destructive'
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 *
 * @example
 * // 默认警告框
 * <Alert>
 *   <InfoIcon />
 *   <AlertTitle>信息</AlertTitle>
 *   <AlertDescription>这是一条信息</AlertDescription>
 * </Alert>
 *
 * // 危险警告框
 * <Alert variant="destructive">
 *   <AlertCircleIcon />
 *   <AlertTitle>错误</AlertTitle>
 *   <AlertDescription>发生了错误</AlertDescription>
 * </Alert>
 */
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

/**
 * AlertTitle 警告框标题组件
 * 警告框的标题文本
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        // 定位: 第2列(图标后)，行首，最小高度4px
        "col-start-2 line-clamp-1 min-h-4",
        // 文本: 中等字重、紧密字间
        "font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

/**
 * AlertDescription 警告框描述组件
 * 警告框的描述文本，通常比标题更详细
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        // 文字颜色: 柔和文字颜色
        "text-muted-foreground",
        // 定位: 第2列，栅栏布局，左对齐，间隔1px
        "col-start-2 grid justify-items-start gap-1 text-sm",
        // 段落样式: 宽松行高
        "[&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
