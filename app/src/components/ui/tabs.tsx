/**
 * @file tabs.tsx
 * @description 选项卡组件 - 用于在多个内容面板间切换
 *
 * 功能特性:
 * - 提供4个子组件: Tabs, TabsList, TabsTrigger, TabsContent
 * - 基于Radix UI Tabs组件的高级实现
 * - 支持水平(默认)和垂直方向
 * - 完整的键盘导航: 箭头键导航标签，Enter/Space激活
 * - 自动激活标签切换
 * - 内置激活状态指示: 背景色和阴影变化
 * - 完整的ARIA支持和焦点管理
 * - 暗黑模式适配
 *
 * 组件结构:
 * <Tabs defaultValue="tab1">
 *   <TabsList>
 *     <TabsTrigger value="tab1">标签1</TabsTrigger>
 *     <TabsTrigger value="tab2">标签2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">内容1</TabsContent>
 *   <TabsContent value="tab2">内容2</TabsContent>
 * </Tabs>
 *
 * @example
 * <Tabs defaultValue="account">
 *   <TabsList>
 *     <TabsTrigger value="account">Account</TabsTrigger>
 *     <TabsTrigger value="password">Password</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="account">Account settings form</TabsContent>
 *   <TabsContent value="password">Change password form</TabsContent>
 * </Tabs>
 */

"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

/**
 * Tabs 选项卡容器
 * 管理多个TabsTrigger和TabsContent的协调，处理标签切换
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof TabsPrimitive.Root>} props - Radix UI Tabs Root的所有属性
 *
 * @example
 * <Tabs defaultValue="tab1">
 *   ...
 * </Tabs>
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn(
        // 布局: flex列布局，间隔2px
        "flex flex-col gap-2",
        className
      )}
      {...props}
    />
  )
}

/**
 * TabsList 标签列表
 * 包含多个TabsTrigger的容器，通常显示为带背景的导航栏
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof TabsPrimitive.List>} props - Radix UI Tabs List的所有属性
 *
 * @example
 * <TabsList>
 *   <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *   <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 * </TabsList>
 */
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // 布局: 内联flex，水平居中，高度9px，宽度自适应
        "inline-flex h-9 w-fit items-center justify-center rounded-lg",
        // 外观: 灰色背景，灰色文字
        "bg-muted text-muted-foreground",
        // 内间距: 3px用于激活指示器的空间
        "p-[3px]",
        className
      )}
      {...props}
    />
  )
}

/**
 * TabsTrigger 标签触发器
 * 单个选项卡标签，点击切换对应的内容面板
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof TabsPrimitive.Trigger>} props - Radix UI Tabs Trigger的所有属性
 *
 * @example
 * <TabsTrigger value="tab1">标签1</TabsTrigger>
 */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // 布局: flex布局，占满高度，水平居中，间隔1.5px
        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5",
        // 尺寸: 文本小，中等字重，无换行
        "rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap",
        // 文字颜色: 默认前景色，激活时背景改变
        "text-foreground dark:text-muted-foreground",
        // 激活状态: 背景色为卡片背景，暗黑模式使用输入框背景
        "data-[state=active]:bg-background dark:data-[state=active]:bg-input/30 dark:data-[state=active]:border-input dark:data-[state=active]:text-foreground",
        // 焦点: 显示ring
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1",
        // 激活指示: 显示阴影，禁用状态
        "data-[state=active]:shadow-sm disabled:pointer-events-none disabled:opacity-50",
        // 过渡动画
        "transition-[color,box-shadow]",
        // SVG图标处理: 无交互，自动缩小
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

/**
 * TabsContent 选项卡内容区域
 * 对应激活标签的内容面板
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof TabsPrimitive.Content>} props - Radix UI Tabs Content的所有属性
 *
 * @example
 * <TabsContent value="tab1">标签1的内容</TabsContent>
 */
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        // 布局: 占满剩余空间，无outline焦点
        "flex-1 outline-none",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
