/**
 * @file checkbox.tsx
 * @description 复选框组件 - 可复用的复选框UI组件
 *
 * 功能特性:
 * - 基于Radix UI Checkbox Primitive构建
 * - 支持选中、未选中、不确定三种状态
 * - 完整的键盘交互(Space键切换)
 * - 自动焦点管理
 * - 支持禁用状态
 * - ARIA无效状态支持
 * - 深色模式支持
 */

"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Checkbox 复选框组件
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof CheckboxPrimitive.Root>} props - Radix UI Checkbox Root的所有属性
 *
 * @example
 * // 基础复选框
 * <Checkbox id="terms" />
 * <label htmlFor="terms">我同意条款</label>
 *
 * // 禁用状态
 * <Checkbox disabled />
 *
 * // 默认选中
 * <Checkbox defaultChecked />
 *
 * // 不确定状态
 * <Checkbox ref={ref} />
 * // ref.current.indeterminate = true
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // 对等(peer)样式: 与关联的label互相影响
        "peer",
        // 边框和背景: 边框颜色、深色模式下背景半透明
        "border-input dark:bg-input/30",
        // 选中状态: 蓝色背景，白色文字，蓝色边框
        "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary",
        // 焦点可见: 蓝色边框和ring光晕
        "focus-visible:border-ring focus-visible:ring-ring/50",
        // ARIA无效状态: 红色ring和border
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // 大小: 4x4正方形，缩小不扩大
        "size-4 shrink-0 rounded-[4px]",
        // 其他: 边框、阴影、过渡、无轮廓、禁用状态
        "border shadow-xs transition-shadow outline-none",
        "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {/* 复选框指示器: 显示复选标记 */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        {/* Check图标 */}
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
