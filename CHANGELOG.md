# 更新日志

## [2026-02-26 v1.6.1] 修复背景图导出问题

### 🐛 Bug 修复

#### 背景图使用 Blob URL 导致导入失败

**问题描述**：
1. 上传背景图后可以正常显示
2. 导出数据，JSON 中 `backgroundImage` 为 `blob:http://...` 格式
3. 重新导入数据后，背景图无法显示

**问题示例**：
```json
{
  "backgroundImage": "blob:http://localhost:5173/a1b2c3d4-e5f6-7890"
}
```

**根本原因**：

使用 `URL.createObjectURL(file)` 创建的 Blob URL 只在当前浏览器会话中有效：
- ❌ 刷新页面后失效
- ❌ 无法跨设备使用
- ❌ 导出后无法使用

**解决方案**：

将文件转换为 Data URL（base64 编码）：

```typescript
// 修复前
const url = URL.createObjectURL(file);  // blob:http://...
setSvgUrlState(url);

// 修复后
reader.onload = (e) => {
  const dataUrl = e.target?.result as string;  // data:image/svg+xml;base64,...
  setSvgUrlState(dataUrl);
};
reader.readAsDataURL(file);
```

**修复效果**：
- ✅ 导出的数据包含完整的背景图（Data URL 格式）
- ✅ 导入后背景图可以正常显示
- ✅ 数据可以跨设备使用
- ✅ 刷新页面后仍然有效

**注意事项**：
- Data URL 会增加文件大小（约 33%）
- 建议使用压缩后的 SVG
- 旧数据需要重新上传背景图并导出

**技术细节**：
- 修改文件：`app/src/hooks/useSimpleViewer.ts`
- 修改函数：`uploadSvg()`
- 从 `readAsText()` 改为 `readAsDataURL()`

---

## [2026-02-26 v1.6] 数据导入导出功能

### ✨ 新增功能

#### 数据导出

**功能描述**：
将场馆座位数据导出为 JSON 文件，实现数据持久化。

**导出内容**：
- 区域信息（位置、形状、颜色）
- 座位数据（位置、行号、座位号、类型、角度）
- 校准参数（座位尺寸、间距）
- 背景图 URL
- 元数据（创建时间、座位总数等）

**使用方法**：
1. 点击顶部工具栏的下载图标 (Download)
2. 浏览器自动下载 JSON 文件
3. 文件名格式：`{场馆名称}-{时间戳}.json`

**技术实现**：
```typescript
// 导出数据
const data = exportVenueData(sections, svgUrl, venueName);

// 下载文件
downloadJSON(data, filename);
```

#### 数据导入

**功能描述**：
从 JSON 文件导入场馆数据，恢复完整的场馆配置。

**导入流程**：
1. 点击顶部工具栏的上传图标 (Upload)
2. 选择 JSON 文件
3. 查看确认对话框
4. 确认后替换当前数据

**安全机制**：
- 格式验证：确保文件格式正确
- 用户确认：显示导入数据摘要，防止误操作
- 错误处理：捕获并提示导入错误

**技术实现**：
```typescript
// 导入数据
const data = await importVenueData(file);

// 更新状态
setSections(data.sections);
setVenueName(data.venueName);
uploadSvg(data.backgroundImage);
```

#### 数据格式

**ExportData 结构**：
```json
{
  "version": "1.0.0",
  "timestamp": "2026-02-26T10:30:00.000Z",
  "venueName": "Untitled Venue",
  "backgroundImage": "data:image/svg+xml;base64,...",
  "sections": [...],
  "metadata": {
    "totalSections": 5,
    "totalSeats": 1500,
    "createdAt": "2026-02-26T10:00:00.000Z",
    "modifiedAt": "2026-02-26T10:30:00.000Z"
  }
}
```

### 🔧 技术细节

#### 新增文件

| 文件 | 说明 |
|------|------|
| `app/src/utils/dataExport.ts` | 导入导出工具函数 |
| `docs/数据导入导出功能说明.md` | 功能使用文档 |

#### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `app/src/components/panels/PanelTop.tsx` | 添加导入导出按钮 |
| `app/src/App.tsx` | 集成导入导出功能 |

#### 核心函数

**导出函数**：
```typescript
// 导出数据对象
exportVenueData(sections, backgroundImage, venueName): ExportData

// 导出并下载
exportAndDownload(sections, backgroundImage, venueName): void

// 下载 JSON 文件
downloadJSON(data, filename): void
```

**导入函数**：
```typescript
// 解析文件
parseImportFile(file): Promise<ExportData>

// 导入数据
importVenueData(file): Promise<ImportResult>

// 验证格式
validateImportData(data): boolean
```

**工具函数**：
```typescript
// 生成摘要
generateSummary(data): string
```

### 📊 使用场景

#### 场景 1：数据备份
```
1. 完成场馆设计
2. 点击导出按钮
3. 保存 JSON 文件
```

#### 场景 2：跨设备工作
```
设备 A: 设计 → 导出
设备 B: 导入 → 编辑 → 导出
设备 A: 导入 → 继续工作
```

#### 场景 3：模板复用
```
1. 创建标准模板
2. 导出为 JSON
3. 新项目导入模板
4. 基于模板修改
```

### ⚠️ 注意事项

1. **数据覆盖**：导入会完全替换当前数据，建议先备份
2. **背景图**：Data URL 可完整恢复，HTTP URL 需要网络
3. **文件大小**：包含 base64 图片的文件可能较大
4. **版本兼容**：当前版本 1.0.0，未来保持向后兼容

### 🎯 功能对比

| 功能 | 导出 | 导入 |
|------|------|------|
| 区域数据 | ✅ | ✅ |
| 座位数据 | ✅ | ✅ |
| 校准参数 | ✅ | ✅ |
| 背景图 | ✅ | ✅ |
| 元数据 | ✅ | ✅ |
| 格式验证 | - | ✅ |
| 用户确认 | - | ✅ |

---

## [2026-02-26 v1.5.2] 修复座位坐标系统

### 🐛 Bug 修复

#### 座位位置不跟随 section 移动

**问题描述**：
1. 在 section 编辑模式中绘制座位并保存
2. 返回主画布，拖动移动 section 到新位置
3. 再次进入 section 编辑模式
4. ❌ 座位仍在原位置，与 section 边界不匹配

**根本原因**：
座位坐标使用**世界坐标系**存储，而不是相对于 section 的**局部坐标系**。

**解决方案**：
座位坐标相对于 section 的原点（边界框左上角）存储：
1. **保存时**：将世界坐标转换为局部坐标
2. **加载时**：将局部坐标转换为世界坐标

**技术实现**：
```typescript
// 计算 section 原点
const sectionOrigin = useMemo(() => {
  const bbox = getBoundingBox(section.points);
  return { x: bbox.minX, y: bbox.minY };
}, [section.points]);

// 加载：局部 → 世界
const seats = savedSeats.map(seat => ({
  ...seat,
  x: seat.x + sectionOrigin.x,
  y: seat.y + sectionOrigin.y,
}));

// 保存：世界 → 局部
const localSeats = seats.map(seat => ({
  ...seat,
  x: seat.x - sectionOrigin.x,
  y: seat.y - sectionOrigin.y,
}));
```

---

## [2026-02-26 v1.5.1] 修复矩阵座位组选择

### 🐛 Bug 修复

#### 矩阵座位组选择失效

**问题描述**：
单排座位可以组选择，但矩阵座位无法组选择。

**原因分析**：
ID 格式差异导致正则表达式匹配失败。

**解决方案**：
修复组 ID 提取正则表达式，支持两种格式。

---

## [2026-02-26 v1.5] 矩阵座位两步绘制

### ✨ 新增功能

完全模仿 seats.io 的矩阵绘制交互方式：

**第一步**：绘制第一排
- 拖拽定义方向和长度
- 实时预览座位位置
- 释放鼠标固定第一排

**第二步**：垂直扩展
- 自动计算垂直方向
- 实时预览矩阵布局
- 显示行列数标签

---

## [2026-02-26 v1.4] 边界框和旋转功能

### ✨ 新增功能

- 座位选择边界框
- 旋转手柄
- 拖拽旋转功能
- 实时旋转预览

---

## [2026-02-26 v1.3] 统一组选择行为

### ✨ 新增功能

- 单击选择整组
- 框选自动扩展为整组
- Ctrl+单击切换组选择

---

## [2026-02-26 v1.2] 正方形座位预览

### ✨ 新增功能

- 正方形座位预览
- ESC 键快捷操作
- 座位组选择

---

## [2026-02-26 v1.1] 单排座位拖拽绘制

### ✨ 新增功能

实现 seats.io 风格的拖拽绘制交互：
- 拖拽定义方向和长度
- 自动计算座位数量
- 实时预览座位位置
- 座位自动对齐方向

---

*更新日期: 2026-02-26*
*版本: v1.6.0*
