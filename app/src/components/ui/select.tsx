/**
 * @file select.tsx
 * @description 选择框组件 - 可复用的下拉菜单选择UI组件
 *
 * 功能特性:
 * - 基于Radix UI Select Primitive构建
 * - 提供10个相关组件: Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton
 * - 支持分组、滚动、搜索等高级功能
 * - 完整的键盘导航(上下箭头、Enter选择、ESC关闭)
 * - 自动对齐和定位
 * - 支持禁用状态
 * - ARIA标签和描述支持
 *
 * 组件结构:
 * <Select value={value} onValueChange={setValue}>
 *   <SelectTrigger>
 *     <SelectValue placeholder="选择一个选项" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectGroup>
 *       <SelectLabel>分组1</SelectLabel>
 *       <SelectItem value="opt1">选项1</SelectItem>
 *     </SelectGroup>
 *   </SelectContent>
 * </Select>
 */

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Select 选择框根组件
 * 用于包装所有选择框相关的子组件
 *
 * @param {React.ComponentProps<typeof SelectPrimitive.Root>} props - Radix UI Select Root的所有属性
 */
function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

/**
 * SelectGroup 选择框分组组件
 * 用于对选项进行分组
 *
 * @param {React.ComponentProps<typeof SelectPrimitive.Group>} props - Radix UI Select Group的所有属性
 */
function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

/**
 * SelectValue 选择值显示组件
 * 显示选中的值，可以设置占位符
 *
 * @param {React.ComponentProps<typeof SelectPrimitive.Value>} props - Radix UI Select Value的所有属性
 */
function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

/**
 * SelectTrigger 选择触发器组件
 * 打开/关闭下拉菜单的按钮
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {'default' | 'sm'} [size='default'] - 大小变体
 * @param {React.ReactNode} [children] - 触发器内容
 * @param {React.ComponentProps<typeof SelectPrimitive.Trigger>} props - Radix UI Select Trigger的所有属性
 */
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // 边框和背景: 边框颜色、半透明深色背景、hover时改变
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
        // ARIA无效状态
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "dark:bg-input/30 dark:hover:bg-input/50",
        // 布局: flex行布局，水平间隔2px，fit宽度，圆角、边框、padding、阴影
        "flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow]",
        // 轮廓和焦点
        "outline-none focus-visible:ring-[3px]",
        // 禁用状态
        "disabled:cursor-not-allowed disabled:opacity-50",
        // 大小变体
        "data-[size=default]:h-9 data-[size=sm]:h-8",
        // SelectValue样式
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        // SVG图标样式
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      {/* 下拉箭头 */}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

/**
 * SelectContent 选择框内容组件
 * 下拉菜单容器，包含所有选项
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ReactNode} [children] - 下拉菜单内容
 * @param {'item-aligned' | 'popper'} [position='item-aligned'] - 定位策略
 * @param {'start' | 'center' | 'end'} [align='center'] - 对齐方式
 * @param {React.ComponentProps<typeof SelectPrimitive.Content>} props - Radix UI Select Content的所有属性
 */
function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          // 背景和文字颜色
          "bg-popover text-popover-foreground",
          // 动画: 打开时淡入+放大，关闭时淡出+缩小
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          // 滑入动画根据side不同
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          // 定位和大小: 相对定位，最大高度(自动计算)，最小宽度8rem，origin和z-index
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin)",
          // 外观: 圆角、边框、阴影、溢出处理
          "overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          // Popper定位时的translate调整
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        {/* 向上滚动按钮 */}
        <SelectScrollUpButton />
        {/* 菜单项容器 */}
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            // Popper定位时的高度和宽度变量
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        {/* 向下滚动按钮 */}
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

/**
 * SelectLabel 选择框标签组件
 * 分组标签
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof SelectPrimitive.Label>} props - Radix UI Select Label的所有属性
 */
function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "text-muted-foreground px-2 py-1.5 text-xs",
        className
      )}
      {...props}
    />
  )
}

/**
 * SelectItem 选择框选项组件
 * 下拉菜单中的每一项
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ReactNode} [children] - 选项内容
 * @param {React.ComponentProps<typeof SelectPrimitive.Item>} props - Radix UI Select Item的所有属性
 */
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // 焦点和悬停
        "focus:bg-accent focus:text-accent-foreground",
        // SVG文字颜色
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        // 布局: flex行布局，间隔2px，相对定位，全宽，光标指针
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none",
        // 禁用状态
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // SVG图标样式
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // 最后一个span子元素: flex布局，间隔2px
        "*:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      {/* 选中指示符 */}
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      {/* 选项文本 */}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

/**
 * SelectSeparator 选择框分隔符组件
 * 分隔不同的选项组
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof SelectPrimitive.Separator>} props - Radix UI Select Separator的所有属性
 */
function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "bg-border pointer-events-none -mx-1 my-1 h-px",
        className
      )}
      {...props}
    />
  )
}

/**
 * SelectScrollUpButton 选择框向上滚动按钮组件
 * 菜单项列表顶部滚动按钮
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>} props - Radix UI Select ScrollUpButton的所有属性
 */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

/**
 * SelectScrollDownButton 选择框向下滚动按钮组件
 * 菜单项列表底部滚动按钮
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>} props - Radix UI Select ScrollDownButton的所有属性
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
