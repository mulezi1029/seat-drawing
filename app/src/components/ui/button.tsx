/**
 * @file button.tsx
 * @description 按钮组件 - 可复用的按钮UI组件，支持多种样式、大小和状态
 *
 * 功能特性:
 * - 支持6种按钮变体: default(默认), destructive(危险), outline(轮廓), secondary(次要), ghost(幽灵), link(链接)
 * - 支持3种大小: default(默认), sm(小), lg(大), icon(图标), icon-sm(小图标), icon-lg(大图标)
 * - 集成Radix UI的Slot组件，支持多态渲染(as child模式)
 * - 自动管理SVG图标大小和样式
 * - 完整的键盘交互和焦点管理
 * - 支持禁用状态和ARIA无效状态
 * - 支持class名称合并和自定义样式
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 按钮样式变体定义
 * 使用CVA (Class Variance Authority)库管理样式变体，提供类型安全的变体组合
 *
 * 基础样式包含:
 * - 布局: flex items-center justify-center gap-2 (水平居中布局，间隔2px)
 * - 文本: whitespace-nowrap text-sm font-medium (防止换行，小文本，中等字重)
 * - 动画: transition-all (所有属性平滑过渡)
 * - 禁用状态: disabled:pointer-events-none disabled:opacity-50 (禁用时无法交互且透明度50%)
 * - SVG图标处理: [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 (SVG无交互，默认4x4大小)
 * - 焦点管理: focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] (焦点时显示ring)
 * - ARIA无效: aria-invalid:ring-destructive/20 aria-invalid:border-destructive (无效状态为红色)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    // 按钮变体 - 6种视觉样式
    variants: {
      variant: {
        // 默认样式: 蓝色背景，白色文字
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // 危险/破坏性操作: 红色背景，hover更深
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // 轮廓样式: 边框背景，浅色hover
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        // 次要样式: 次要颜色背景
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // 幽灵样式: 透明背景，hover显示背景
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        // 链接样式: 纯文本，带下划线
        link: "text-primary underline-offset-4 hover:underline",
      },
      // 按钮大小 - 6种规格
      size: {
        // 默认大小: 9px高度，3px内边距
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        // 小尺寸: 8px高度，2.5px内边距，圆角较小
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        // 大尺寸: 10px高度，6px内边距
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        // 图标按钮: 9x9的正方形
        icon: "size-9",
        // 小图标按钮: 8x8的正方形
        "icon-sm": "size-8",
        // 大图标按钮: 10x10的正方形
        "icon-lg": "size-10",
      },
    },
    // 默认变体组合
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button 按钮组件
 *
 * @param {string} [className] - 附加的CSS class名称，将与变体样式合并
 * @param {string} [variant] - 按钮样式变体: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
 * @param {string} [size] - 按钮大小: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
 * @param {boolean} [asChild=false] - 是否使用Slot组件进行多态渲染，允许将按钮样式应用到其他元素
 * @param {React.ComponentProps<"button">} props - 标准HTML button元素的所有属性
 *
 * @example
 * // 默认按钮
 * <Button>点击我</Button>
 *
 * // 危险按钮
 * <Button variant="destructive">删除</Button>
 *
 * // 图标按钮
 * <Button size="icon"><PlusIcon /></Button>
 *
 * // 作为链接使用
 * <Button asChild><a href="/about">关于</a></Button>
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  // 选择渲染的组件: 如果asChild为true，使用Slot允许多态渲染；否则使用原生button元素
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // 合并CVA生成的样式和传入的className
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
