/**
 * @file card.tsx
 * @description 卡片组件 - 可复用的卡片容器及其子组件
 *
 * 功能特性:
 * - 提供7个子组件: Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter
 * - 使用Container Queries实现响应式布局
 * - 支持自动行布局和栅栏布局
 * - 完整的间距和对齐管理
 * - 支持边界线分隔(border-t, border-b)
 *
 * 组件结构:
 * <Card>
 *   <CardHeader>
 *     <CardTitle>标题</CardTitle>
 *     <CardDescription>描述</CardDescription>
 *     <CardAction>操作按钮</CardAction>
 *   </CardHeader>
 *   <CardContent>内容</CardContent>
 *   <CardFooter>底部</CardFooter>
 * </Card>
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card 卡片容器组件
 * 基础卡片容器，定义整体外观和布局
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // 背景和文字颜色: 卡片特定的颜色
        "bg-card text-card-foreground",
        // 布局: flex column布局，间隔6px
        "flex flex-col gap-6",
        // 外观: 圆角、边框、阴影
        "rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardHeader 卡片头部组件
 * 卡片的头部区域，通常包含标题和描述，支持右侧操作按钮
 * 使用Container Query实现响应式布局
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Container Query上下文: 用于响应式布局
        "@container/card-header",
        // 网格布局: 自动行，最小内容高度，2行起始
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6",
        // 当存在card-action元素时，切换为2列布局(1fr_auto)
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        // 边界线样式: border-b下方有边界时，底部padding为6px
        "[.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardTitle 卡片标题组件
 * 卡片的标题文本
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

/**
 * CardDescription 卡片描述组件
 * 卡片的描述文本，通常比标题文本更小和更浅色
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

/**
 * CardAction 卡片操作按钮区域组件
 * 卡片右上角的操作按钮区域，通常用于放置编辑、删除等按钮
 * 位置固定在CardHeader的右上角
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        // 栅栏定位: 第2列开始，跨越2行(从第1行开始)
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardContent 卡片内容区域组件
 * 卡片的主要内容区域
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

/**
 * CardFooter 卡片底部组件
 * 卡片的底部区域，通常包含按钮或额外信息
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // 布局: flex行布局，垂直居中
        "flex items-center px-6",
        // 边界线样式: border-t上方有边界时，顶部padding为6px
        "[.border-t]:pt-6",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
