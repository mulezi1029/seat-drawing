/**
 * @file input.tsx
 * @description 输入框组件 - 可复用的文本输入UI组件
 *
 * 功能特性:
 * - 标准HTML input元素的包装
 * - 支持所有标准input类型(text, email, password, number等)
 * - Tailwind CSS样式化，包括焦点、禁用、错误状态
 * - 文件上传支持
 * - 自适应响应式设计
 * - ARIA无效状态支持
 * - 深色模式支持
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input 输入框组件
 *
 * @param {string} [type] - input元素的type属性 (默认: 'text')
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"input">} props - 标准HTML input元素的所有属性
 *
 * @example
 * // 基础文本输入
 * <Input placeholder="输入名字" />
 *
 * // 邮箱输入
 * <Input type="email" placeholder="输入邮箱" />
 *
 * // 密码输入
 * <Input type="password" placeholder="输入密码" />
 *
 * // 数字输入
 * <Input type="number" placeholder="输入数字" />
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 文件上传样式: 文本颜色
        "file:text-foreground placeholder:text-muted-foreground",
        // 文本选中样式: 蓝色背景，白色文字
        "selection:bg-primary selection:text-primary-foreground",
        // 深色模式: 输入框背景透明化
        "dark:bg-input/30",
        // 输入框基础样式: 边框、高度、宽度、圆角、背景
        "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow]",
        // 默认轮廓状态
        "outline-none",
        // 文件输入样式: inline-flex, 内部高度、边框、背景、字体等
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // 禁用状态: 无法交互，不可点击，半透明
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // 焦点可见状态: 蓝色边框和3px ring光晕效果
        "md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // ARIA无效状态: 红色border和red ring光晕
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
