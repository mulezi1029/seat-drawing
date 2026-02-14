/**
 * @file dialog.tsx
 * @description 对话框组件 - 模态对话框及其子组件集合
 *
 * 功能特性:
 * - 基于Radix UI Dialog Primitive构建
 * - 包含10个相关组件：Dialog, DialogTrigger, DialogPortal, DialogClose, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
 * - 模态行为，防止背景交互
 * - 动画进出效果
 * - 自动焦点管理
 * - 完整的键盘导航支持(ESC关闭等)
 * - 无障碍属性支持
 *
 * 组件结构:
 * <Dialog>
 *   <DialogTrigger>打开对话框</DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>对话框标题</DialogTitle>
 *       <DialogDescription>对话框描述</DialogDescription>
 *     </DialogHeader>
 *     <div>内容</div>
 *     <DialogFooter>
 *       <Button>确定</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 */

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Dialog 对话框根组件
 * 用于包装所有对话框相关的子组件
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Root>} props - Radix UI Dialog Root的所有属性
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/**
 * DialogTrigger 对话框触发器组件
 * 点击此元素以打开对话框
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Trigger>} props - Radix UI Dialog Trigger的所有属性
 */
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/**
 * DialogPortal 对话框门户组件
 * 使用Portal将对话框渲染到DOM树的不同位置，通常是body末尾
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Portal>} props - Radix UI Dialog Portal的所有属性
 */
function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/**
 * DialogClose 对话框关闭按钮组件
 * 用于关闭对话框，通常用作X按钮或取消按钮
 *
 * @param {React.ComponentProps<typeof DialogPrimitive.Close>} props - Radix UI Dialog Close的所有属性
 */
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/**
 * DialogOverlay 对话框背景蒙层组件
 * 半透明黑色背景，用于阻止用户与背景内容交互
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof DialogPrimitive.Overlay>} props - Radix UI Dialog Overlay的所有属性
 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // 动画: 打开时淡入，关闭时淡出
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        // 定位: 固定位置，覆盖整个屏幕，z-index最高
        "fixed inset-0 z-50",
        // 外观: 半透明黑色(50% opacity)
        "bg-black/50",
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogContent 对话框内容容器组件
 * 对话框的主要内容区域，包含所有内容和自动关闭按钮
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ReactNode} [children] - 对话框内容
 * @param {boolean} [showCloseButton=true] - 是否显示右上角的关闭按钮
 * @param {React.ComponentProps<typeof DialogPrimitive.Content>} props - Radix UI Dialog Content的所有属性
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      {/* 背景蒙层 */}
      <DialogOverlay />
      {/* 对话框内容 */}
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // 背景: 白色背景
          "bg-background",
          // 动画: 打开时淡入+放大，关闭时淡出+缩小
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          // 定位: 固定位置，屏幕中央(上50%，左50%)，z-index高
          "fixed top-[50%] left-[50%] z-50",
          // 大小: 全宽(最大减去2rem)，最大宽度sm(640px)
          "grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {/* 自动关闭按钮 */}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            {/* X图标 */}
            <XIcon />
            {/* 屏幕阅读器标签 */}
            <span className="sr-only">关闭</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/**
 * DialogHeader 对话框头部组件
 * 对话框的头部区域，通常包含标题和描述
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        // 布局: flex列布局，间隔2px，文本居中(平板上改为左对齐)
        "flex flex-col gap-2 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogFooter 对话框底部组件
 * 对话框的底部区域，通常包含操作按钮
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<"div">} props - 标准div元素的所有属性
 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // 布局: 移动端为列倒序布局(取消按钮在上，确定在下)，平板端为行布局右对齐
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogTitle 对话框标题组件
 * 对话框的标题文本
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof DialogPrimitive.Title>} props - Radix UI Dialog Title的所有属性
 */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

/**
 * DialogDescription 对话框描述组件
 * 对话框的描述文本，补充说明对话框内容
 *
 * @param {string} [className] - 附加的CSS class名称
 * @param {React.ComponentProps<typeof DialogPrimitive.Description>} props - Radix UI Dialog Description的所有属性
 */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
