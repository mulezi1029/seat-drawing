/**
 * @file switch.tsx
 * @description 开关组件 - 用于切换两种状态的表单控件
 *
 * 功能特性:
 * - 基于Radix UI Switch组件的高级化实现
 * - 完整的状态管理: checked(选中)/unchecked(未选中)
 * - 支持禁用状态和键盘交互
 * - 自动化的可视化状态指示(圆形滑块动画)
 * - 完全的可访问性支持(ARIA)
 * - 暗黑模式适配
 *
 * 组件构成:
 * - Root: 主要容器，管理开关状态
 * - Thumb: 圆形滑块，通过平移动画指示状态
 *
 * @example
 * <Switch defaultChecked />
 * <Switch disabled />
 * <Switch onCheckedChange={(checked) => console.log(checked)} />
 */

"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Switch 开关组件
 * 一个可切换的表单控件，用于在两种状态之间进行选择
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof SwitchPrimitive.Root>} props - Radix UI Switch Root的所有属性
 *
 * @example
 * <Switch />
 * <Switch defaultChecked />
 * <Switch disabled />
 * <Switch aria-label="启用通知" />
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // 布局: 内联flex布局，垂直居中，宽度8x，高度1.15rem
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs",
        // 状态样式: checked为主颜色背景，unchecked为输入框背景色
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        // 暗黑模式: unchecked时使用较浅的输入框背景
        "dark:data-[state=unchecked]:bg-input/80",
        // 焦点和交互: 显示外ring，禁用时减少不透明度
        "focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        // 禁用状态: 禁用时无法交互且半透明
        "transition-all disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // 布局: 4x4的圆形滑块，不接收事件
          "pointer-events-none block size-4 rounded-full ring-0",
          // 背景颜色: 亮色模式下为背景色
          "bg-background",
          // 暗黑模式: unchecked时为前景色，checked时为主颜色前景
          "dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground",
          // 动画: 平滑的平移过渡，checked时向右移动约6px(100%-2px)
          "transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
