/**
 * @file accordion.tsx
 * @description 折叠菜单组件 - 可展开/折叠的内容区域
 *
 * 功能特性:
 * - 提供4个子组件: Accordion, AccordionItem, AccordionTrigger, AccordionContent
 * - 基于Radix UI Accordion组件
 * - 支持单选模式(radio)和多选模式(multiple)
 * - 完整的键盘交互: 箭头键、Home、End导航
 * - 自动滑入/滑出动画
 * - 内置Chevron图标，选中时旋转180度
 * - 完整的ARIA支持
 * - 响应式边框: 仅底部项显示边框
 *
 * 组件结构:
 * <Accordion type="single" collapsible>
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>标题1</AccordionTrigger>
 *     <AccordionContent>内容1</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 *
 * @example
 * <Accordion type="single" defaultValue="item-1">
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>Is it accessible?</AccordionTrigger>
 *     <AccordionContent>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 */

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Accordion 折叠菜单容器
 * 管理多个AccordionItem，处理展开/收起的协调逻辑
 *
 * @param {React.ComponentProps<typeof AccordionPrimitive.Root>} props - Radix UI Accordion Root的所有属性
 *
 * @example
 * <Accordion type="single" collapsible>
 *   ...items...
 * </Accordion>
 */
function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

/**
 * AccordionItem 折叠菜单项
 * 单个可折叠的项目，包含触发器和内容
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof AccordionPrimitive.Item>} props - Radix UI Accordion Item的所有属性
 *
 * @example
 * <AccordionItem value="item-1">
 *   <AccordionTrigger>标题</AccordionTrigger>
 *   <AccordionContent>内容</AccordionContent>
 * </AccordionItem>
 */
function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        // 边框: 添加下边框，但最后一个项除外
        "border-b last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * AccordionTrigger 折叠菜单触发器
 * 可点击的按钮，用于切换内容的显示/隐藏
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ReactNode} [children] - 按钮内容
 * @param {React.ComponentProps<typeof AccordionPrimitive.Trigger>} props - Radix UI Accordion Trigger的所有属性
 *
 * @example
 * <AccordionTrigger>展开/收起标题</AccordionTrigger>
 */
function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          // 布局: flex布局，占满宽度，项目起始对齐，间隔4px
          "flex flex-1 items-start justify-between gap-4",
          // 尺寸和间距: 垂直4px内边距，文本样式
          "rounded-md py-4 text-left text-sm font-medium",
          // 交互: 平滑过渡，hover下划线，禁用状态
          "transition-all outline-none hover:underline",
          // 焦点: 显示ring，禁用时无法交互
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:opacity-50",
          // 图标动画: 当data-state=open时，SVG旋转180度
          "[&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        {/* 下拉箭头图标，选中时旋转180度，带有平滑过渡 */}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/**
 * AccordionContent 折叠菜单内容区域
 * 展开时显示的内容区域，支持动画展开/收起
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ReactNode} [children] - 内容区域的子元素
 * @param {React.ComponentProps<typeof AccordionPrimitive.Content>} props - Radix UI Accordion Content的所有属性
 *
 * @example
 * <AccordionContent>内容文本</AccordionContent>
 */
function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      {/* 内容容器: 顶部0, 底部4px内边距，垂直居中 */}
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
