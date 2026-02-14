/**
 * @file label.tsx
 * @description 标签组件 - 表单标签，通常与输入框配合使用
 *
 * 功能特性:
 * - 基于Radix UI Label Primitive构建
 * - 支持关联表单元素
 * - 自动禁用状态管理
 * - 完整的键盘和无障碍支持
 * - 支持自定义样式
 */

"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

/**
 * Label 标签组件
 * 用于为表单输入元素提供描述性标签
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof LabelPrimitive.Root>} props - Radix UI Label的所有属性
 *
 * @example
 * // 基础用法
 * <div>
 *   <Label htmlFor="email">邮箱</Label>
 *   <Input id="email" type="email" />
 * </div>
 *
 * // 禁用状态
 * <Label htmlFor="disabled">禁用字段</Label>
 * <Input id="disabled" disabled />
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // 布局: flex行布局，垂直居中，间隔2px
        "flex items-center gap-2",
        // 文本样式: 小文本，中等字重，无法选择
        "text-sm leading-none font-medium select-none",
        // 禁用状态: 当所在组data-disabled=true时，无法交互且半透明
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        // 关联表单元素禁用: 当相邻peer-disabled时无法点击且半透明
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
