/**
 * @file popover.tsx
 * @description 弹出框组件 - 用于显示悬浮在另一个元素上的内容
 *
 * 功能特性:
 * - 提供4个子组件: Popover, PopoverTrigger, PopoverContent, PopoverAnchor
 * - 基于Radix UI Popover组件的高级实现
 * - 支持灵活的定位: 可设置对齐方式(start、center、end)
 * - 自动碰撞处理和定位调整
 * - 平滑的弹入/弹出动画(缩放、淡入淡出)
 * - 支持点击外部关闭
 * - 完整的键盘交互: Escape关闭
 * - 完整的ARIA支持和焦点管理
 * - 暗黑模式适配
 * - 固定宽度(18rem)，可自定义
 *
 * 组件结构:
 * <Popover>
 *   <PopoverTrigger>打开弹出框</PopoverTrigger>
 *   <PopoverContent>
 *     弹出框内容
 *   </PopoverContent>
 * </Popover>
 *
 * @example
 * <Popover>
 *   <PopoverTrigger asChild>
 *     <Button>打开</Button>
 *   </PopoverTrigger>
 *   <PopoverContent>
 *     <div>弹出框内容</div>
 *   </PopoverContent>
 * </Popover>
 */

"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

/**
 * Popover 弹出框容器
 * 管理弹出框的打开/关闭状态和事件
 *
 * @param {React.ComponentProps<typeof PopoverPrimitive.Root>} props - Radix UI Popover Root的所有属性
 *
 * @example
 * <Popover open={isOpen} onOpenChange={setIsOpen}>
 *   ...
 * </Popover>
 */
function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

/**
 * PopoverTrigger 弹出框触发器
 * 点击打开弹出框的按钮，通常与某个控件(如Button)关联
 *
 * @param {React.ComponentProps<typeof PopoverPrimitive.Trigger>} props - Radix UI Popover Trigger的所有属性
 *
 * @example
 * <PopoverTrigger asChild>
 *   <Button>打开弹出框</Button>
 * </PopoverTrigger>
 */
function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

/**
 * PopoverContent 弹出框内容区域
 * 显示弹出框的容器，支持动画和定位
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {"start" | "center" | "end"} [align="center"] - 水平对齐方式
 * @param {number} [sideOffset=4] - 弹出框与触发器的距离(像素)
 * @param {React.ComponentProps<typeof PopoverPrimitive.Content>} props - Radix UI Popover Content的所有属性
 *
 * @example
 * <PopoverContent align="start" sideOffset={8}>
 *   <div>弹出框内容</div>
 * </PopoverContent>
 */
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          // 布局: popover背景和文字颜色，z轴最高
          "bg-popover text-popover-foreground z-50",
          // 尺寸: 固定宽度18rem(288px)
          "w-72",
          // 定位: 使用Radix变量进行动态定位
          "origin-(--radix-popover-content-transform-origin)",
          // 外观: 圆角、边框、阴影、内间距4px
          "rounded-md border p-4 shadow-md",
          // 焦点: 无outline焦点
          "outline-hidden",
          // 动画: 进出动画，缩放和淡入淡出
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          // 方向特定的滑入动画
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

/**
 * PopoverAnchor 弹出框锚点
 * 用于设置弹出框的定位参考点，通常与trigger不同时使用
 *
 * @param {React.ComponentProps<typeof PopoverPrimitive.Anchor>} props - Radix UI Popover Anchor的所有属性
 *
 * @example
 * <Popover>
 *   <PopoverAnchor asChild>
 *     <div>定位参考点</div>
 *   </PopoverAnchor>
 *   <PopoverContent>内容</PopoverContent>
 * </Popover>
 */
function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
