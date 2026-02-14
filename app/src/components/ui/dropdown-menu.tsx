/**
 * @file dropdown-menu.tsx
 * @description 下拉菜单组件 - 用于显示一个可切换的菜单列表
 *
 * 功能特性:
 * - 提供14个子组件: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent等
 * - 基于Radix UI DropdownMenu的高级实现
 * - 支持普通项、复选项、单选项
 * - 支持菜单分组、分隔符、标签和快捷键显示
 * - 支持嵌套子菜单(SubMenu)
 * - 完整的键盘导航: 箭头键、Enter、Escape等
 * - 自动口位(popper)定位和碰撞处理
 * - 平滑的进出动画
 * - 支持disabled状态
 * - 完整的ARIA支持
 * - 暗黑模式适配
 *
 * 组件结构:
 * <DropdownMenu>
 *   <DropdownMenuTrigger>打开菜单</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuLabel>标签</DropdownMenuLabel>
 *     <DropdownMenuItem>项目</DropdownMenuItem>
 *     <DropdownMenuSeparator />
 *     <DropdownMenuCheckboxItem>复选项</DropdownMenuCheckboxItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger>打开</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>Edit</DropdownMenuItem>
 *     <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * DropdownMenu 下拉菜单容器
 * 管理菜单的打开/关闭状态和事件
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Root>} props - Radix UI DropdownMenu Root的所有属性
 *
 * @example
 * <DropdownMenu>
 *   ...
 * </DropdownMenu>
 */
function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

/**
 * DropdownMenuPortal 下拉菜单传送门
 * 用于将菜单内容传送到文档的其他部分，通常是document.body
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Portal>} props - Radix UI DropdownMenu Portal的所有属性
 */
function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

/**
 * DropdownMenuTrigger 下拉菜单触发器
 * 点击打开菜单的按钮，通常与某个控件(如Button)关联
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>} props - Radix UI DropdownMenu Trigger的所有属性
 *
 * @example
 * <DropdownMenuTrigger asChild>
 *   <Button>打开菜单</Button>
 * </DropdownMenuTrigger>
 */
function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

/**
 * DropdownMenuContent 下拉菜单内容区域
 * 显示菜单项的容器，支持动画和定位
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {number} [sideOffset=4] - 菜单与触发器的距离(像素)
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Content>} props - Radix UI DropdownMenu Content的所有属性
 *
 * @example
 * <DropdownMenuContent align="start">
 *   ...menu items...
 * </DropdownMenuContent>
 */
function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          // 布局: popover背景和文字颜色，z轴最高
          "bg-popover text-popover-foreground z-50",
          // 尺寸: 最大高度为可用空间，最小宽度8rem
          "max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem]",
          // 定位: 使用Radix变量进行动态定位
          "origin-(--radix-dropdown-menu-content-transform-origin)",
          // 外观: 圆角、边框、阴影、内边距1px
          "rounded-md border p-1 shadow-md",
          // 内容: 自动隐藏横向滚动条，纵向可滚动
          "overflow-x-hidden overflow-y-auto",
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
    </DropdownMenuPrimitive.Portal>
  )
}

/**
 * DropdownMenuGroup 下拉菜单分组
 * 用于将菜单项分组显示
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Group>} props - Radix UI DropdownMenu Group的所有属性
 *
 * @example
 * <DropdownMenuGroup>
 *   <DropdownMenuLabel>编辑</DropdownMenuLabel>
 *   <DropdownMenuItem>复制</DropdownMenuItem>
 * </DropdownMenuGroup>
 */
function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

/**
 * DropdownMenuItem 下拉菜单项
 * 单个菜单项，支持两种变体: default(默认)和destructive(危险)
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {boolean} [inset] - 是否添加左内间距(用于与其他项对齐)
 * @param {"default" | "destructive"} [variant="default"] - 菜单项变体
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Item>} props - Radix UI DropdownMenu Item的所有属性
 *
 * @example
 * <DropdownMenuItem>编辑</DropdownMenuItem>
 * <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
 */
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        // 布局: flex行布局，相对定位，间隔2px，圆角
        "relative flex cursor-default items-center gap-2 rounded-sm",
        // 尺寸: 文本小，内边距2px(横)1.5px(纵)
        "px-2 py-1.5 text-sm",
        // 外观: 无选择，无outline焦点
        "outline-hidden select-none",
        // 焦点: 焦点时背景为accent颜色
        "focus:bg-accent focus:text-accent-foreground",
        // inset变体: 添加左padding使项对齐
        "data-[inset]:pl-8",
        // 禁用状态: 无交互且半透明
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // destructive变体: 文字和焦点颜色为红色
        "data-[variant=destructive]:text-destructive",
        "data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20",
        "data-[variant=destructive]:focus:text-destructive",
        // destructive SVG图标处理
        "data-[variant=destructive]:*:[svg]:!text-destructive",
        // SVG图标处理: 文本颜色为muted，灰色图标
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

/**
 * DropdownMenuCheckboxItem 下拉菜单复选项
 * 支持复选状态的菜单项，左侧显示复选框
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ReactNode} [children] - 复选项内容
 * @param {boolean} [checked] - 复选状态
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>} props - Radix UI DropdownMenu CheckboxItem的所有属性
 *
 * @example
 * <DropdownMenuCheckboxItem checked={isEnabled} onCheckedChange={setIsEnabled}>
 *   启用功能
 * </DropdownMenuCheckboxItem>
 */
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        // 布局: flex行布局，相对定位，间隔2px
        "relative flex cursor-default items-center gap-2 rounded-sm",
        // 尺寸: 文本小，纵向内边距1.5px，横向1.5px/2px
        "py-1.5 pr-2 pl-8 text-sm",
        // 外观: 无选择，无outline焦点
        "outline-hidden select-none",
        // 焦点: 焦点时背景为accent颜色
        "focus:bg-accent focus:text-accent-foreground",
        // 禁用: 无交互且半透明
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // SVG图标处理
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      {/* 复选框指示符: 左边3.5x3.5的正方形区域，显示复选图标 */}
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

/**
 * DropdownMenuRadioGroup 下拉菜单单选组
 * 用于包含多个单选项的容器
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>} props - Radix UI DropdownMenu RadioGroup的所有属性
 *
 * @example
 * <DropdownMenuRadioGroup value="option1">
 *   <DropdownMenuRadioItem value="option1">选项1</DropdownMenuRadioItem>
 *   <DropdownMenuRadioItem value="option2">选项2</DropdownMenuRadioItem>
 * </DropdownMenuRadioGroup>
 */
function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

/**
 * DropdownMenuRadioItem 下拉菜单单选项
 * 单个单选项，左侧显示单选按钮
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ReactNode} [children] - 单选项内容
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>} props - Radix UI DropdownMenu RadioItem的所有属性
 *
 * @example
 * <DropdownMenuRadioItem value="option1">选项1</DropdownMenuRadioItem>
 */
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        // 布局: flex行布局，相对定位，间隔2px
        "relative flex cursor-default items-center gap-2 rounded-sm",
        // 尺寸: 文本小，纵向内边距1.5px，横向1.5px/2px
        "py-1.5 pr-2 pl-8 text-sm",
        // 外观: 无选择，无outline焦点
        "outline-hidden select-none",
        // 焦点: 焦点时背景为accent颜色
        "focus:bg-accent focus:text-accent-foreground",
        // 禁用: 无交互且半透明
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // SVG图标处理
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {/* 单选按钮指示符: 左边3.5x3.5的圆形区域，显示填充圆 */}
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

/**
 * DropdownMenuLabel 下拉菜单标签
 * 菜单的分组标签或区域标题
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {boolean} [inset] - 是否添加左内间距(用于与其他项对齐)
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Label>} props - Radix UI DropdownMenu Label的所有属性
 *
 * @example
 * <DropdownMenuLabel>编辑选项</DropdownMenuLabel>
 */
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        // 尺寸: 文本小，中等字重
        "px-2 py-1.5 text-sm font-medium",
        // inset变体: 添加左padding使标签对齐
        "data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

/**
 * DropdownMenuSeparator 下拉菜单分隔符
 * 菜单项间的分隔线
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Separator>} props - Radix UI DropdownMenu Separator的所有属性
 *
 * @example
 * <DropdownMenuSeparator />
 */
function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(
        // 外观: 边框颜色的1px高线条
        "bg-border h-px",
        // 间距: 上下1px，左右-1px(向外扩展到边框)
        "-mx-1 my-1",
        className
      )}
      {...props}
    />
  )
}

/**
 * DropdownMenuShortcut 下拉菜单快捷键显示
 * 菜单项右侧的快捷键提示文本
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"span">} props - 标准span元素的所有属性
 *
 * @example
 * <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
 */
function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        // 文字: muted颜色，超小字体，字母间距宽
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  )
}

/**
 * DropdownMenuSub 下拉菜单子菜单
 * 用于嵌套菜单(在菜单内打开另一个菜单)的容器
 *
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.Sub>} props - Radix UI DropdownMenu Sub的所有属性
 *
 * @example
 * <DropdownMenuSub>
 *   <DropdownMenuSubTrigger>子菜单</DropdownMenuSubTrigger>
 *   <DropdownMenuSubContent>
 *     <DropdownMenuItem>嵌套项</DropdownMenuItem>
 *   </DropdownMenuSubContent>
 * </DropdownMenuSub>
 */
function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

/**
 * DropdownMenuSubTrigger 下拉菜单子菜单触发器
 * 打开嵌套菜单的菜单项，右侧显示ChevronRight箭头
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {boolean} [inset] - 是否添加左内间距
 * @param {React.ReactNode} [children] - 触发器内容
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>} props - Radix UI DropdownMenu SubTrigger的所有属性
 *
 * @example
 * <DropdownMenuSubTrigger>打开子菜单</DropdownMenuSubTrigger>
 */
function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        // 布局: flex行布局，间隔2px，圆角
        "flex cursor-default items-center gap-2 rounded-sm",
        // 尺寸: 文本小，内边距2px(横)1.5px(纵)
        "px-2 py-1.5 text-sm",
        // 外观: 无选择，无outline焦点
        "outline-hidden select-none",
        // 焦点和打开状态: 背景为accent颜色
        "focus:bg-accent focus:text-accent-foreground",
        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        // inset变体: 添加左padding
        "data-[inset]:pl-8",
        // SVG图标处理: 灰色muted图标
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      {/* 右箭头指示子菜单: 左边距auto使其靠右 */}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

/**
 * DropdownMenuSubContent 下拉菜单子菜单内容
 * 嵌套菜单的内容区域
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>} props - Radix UI DropdownMenu SubContent的所有属性
 *
 * @example
 * <DropdownMenuSubContent>
 *   <DropdownMenuItem>嵌套项1</DropdownMenuItem>
 *   <DropdownMenuItem>嵌套项2</DropdownMenuItem>
 * </DropdownMenuSubContent>
 */
function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        // 布局: popover背景和文字颜色，z轴最高
        "bg-popover text-popover-foreground z-50",
        // 尺寸: 最小宽度8rem
        "min-w-[8rem]",
        // 定位: 使用Radix变量进行动态定位
        "origin-(--radix-dropdown-menu-content-transform-origin)",
        // 外观: 圆角、边框、阴影(更大)、内边距1px
        "rounded-md border p-1 shadow-lg",
        // 内容: 隐藏横向滚动条
        "overflow-hidden",
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
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
