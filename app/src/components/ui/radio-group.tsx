/**
 * @file radio-group.tsx
 * @description 单选按钮组组件 - 用于从多个互斥选项中选择一个
 *
 * 功能特性:
 * - 提供2个子组件: RadioGroup, RadioGroupItem
 * - 基于Radix UI RadioGroup的高级实现
 * - 支持键盘导航: 上/下箭头在选项间移动，Enter确认
 * - 内置圆形指示器(使用Circle图标)
 * - 完整的ARIA支持和焦点管理
 * - 支持禁用状态和必填验证
 * - 暗黑模式适配
 * - 自动布局: 选项垂直堆叠，间距3px
 *
 * 组件结构:
 * <RadioGroup>
 *   <RadioGroupItem value="option1" id="opt1" />
 *   <Label htmlFor="opt1">选项1</Label>
 *   <RadioGroupItem value="option2" id="opt2" />
 *   <Label htmlFor="opt2">选项2</Label>
 * </RadioGroup>
 *
 * @example
 * <RadioGroup defaultValue="option1">
 *   <RadioGroupItem value="option1" id="opt1" />
 *   <Label htmlFor="opt1">选项1</Label>
 * </RadioGroup>
 */

"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * RadioGroup 单选按钮组容器
 * 管理多个RadioGroupItem的容器，自动处理互斥选择
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof RadioGroupPrimitive.Root>} props - Radix UI RadioGroup Root的所有属性
 *
 * @example
 * <RadioGroup defaultValue="option1" onValueChange={handleChange}>
 *   ...options...
 * </RadioGroup>
 */
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn(
        // 布局: 网格布局，垂直排列选项，间距3px
        "grid gap-3",
        className
      )}
      {...props}
    />
  )
}

/**
 * RadioGroupItem 单选按钮项
 * 单个单选按钮，显示为4x4的圆形，内部有选中时的填充圆点
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof RadioGroupPrimitive.Item>} props - Radix UI RadioGroup Item的所有属性
 *
 * @example
 * <RadioGroupItem value="option1" id="opt1" />
 */
function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // 尺寸: 4x4的正方形，纵横比1:1
        "aspect-square size-4 shrink-0",
        // 外观: 圆形边框，阴影，边界颜色
        "rounded-full border shadow-xs border-input",
        // 选中态: 主颜色为圆点填充颜色
        "text-primary",
        // 焦点: 显示ring，暗黑模式特殊处理
        "focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        // 验证: 无效状态为红色ring和边框
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // 暗黑模式: 输入框背景调整
        "dark:bg-input/30",
        // 禁用状态和过渡
        "transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        {/* 圆形指示器：选中时显示，使用CircleIcon填充和绝对定位 */}
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
