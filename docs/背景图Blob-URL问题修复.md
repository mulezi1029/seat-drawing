# 背景图 Blob URL 问题修复

## 问题描述

**症状**：
- 上传背景图后可以正常显示
- 导出数据后，JSON 文件中 `backgroundImage` 字段为 `blob:http://...` 格式
- 重新导入数据后，背景图无法显示

**示例**：
```json
{
  "backgroundImage": "blob:http://localhost:5173/a1b2c3d4-e5f6-7890"
}
```

## 根本原因

### Blob URL 的特性

`URL.createObjectURL(file)` 创建的 Blob URL 具有以下特点：

1. **临时性**：只在当前浏览器会话中有效
2. **本地性**：无法跨设备或跨会话使用
3. **不可序列化**：导出到 JSON 后无法使用

### 原始代码问题

```typescript
// ❌ 错误的实现
const uploadSvg = useCallback((file: File) => {
  const reader = new FileReader();
  reader.onload = () => {
    const url = URL.createObjectURL(file);  // 创建 Blob URL
    setSvgUrlState(url);
  };
  reader.readAsText(file);
}, []);
```

**问题**：
- `url` 是 `blob:http://localhost:5173/xxx` 格式
- 这个 URL 只在当前页面有效
- 刷新页面或导入数据后失效

## 解决方案

### 使用 Data URL

将文件转换为 Data URL（base64 编码），这样可以：
- ✅ 持久化存储
- ✅ 跨设备使用
- ✅ 导出导入无损

### 修复后的代码

```typescript
// ✅ 正确的实现
const uploadSvg = useCallback((file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result;
    if (result) {
      // 转换为 Data URL
      const dataUrl = result as string;
      setSvgUrlState(dataUrl);
      
      console.log('[上传] SVG 文件已转换为 Data URL');
      console.log('[上传] 文件大小:', (dataUrl.length / 1024).toFixed(2), 'KB');

      // 重置视图
      const newScale = 1;
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;

      setScaleState(newScale);
      setOffsetX(WORLD_CENTER - canvasWidth / 2);
      setOffsetY(WORLD_CENTER - canvasHeight / 2);
    }
  };
  
  // 读取为 Data URL（base64 编码）
  reader.readAsDataURL(file);
}, []);
```

**改进**：
- 使用 `readAsDataURL()` 代替 `readAsText()`
- 生成 `data:image/svg+xml;base64,...` 格式的 URL
- 可以安全地导出和导入

## Data URL 格式

### 格式说明

```
data:[<mediatype>][;base64],<data>
```

### SVG 示例

```
data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iODAwIj4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgZmlsbD0iI2YwZjBmMCIvPgo8L3N2Zz4K
```

### 解码示例

```javascript
// base64 部分
const base64 = "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iODAwIj4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgZmlsbD0iI2YwZjBmMCIvPgo8L3N2Zz4K";

// 解码
const decoded = atob(base64);
console.log(decoded);

// 输出：
// <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
//   <rect width="800" height="800" fill="#f0f0f0"/>
// </svg>
```

## 对比

| 特性 | Blob URL | Data URL |
|------|----------|----------|
| 格式 | `blob:http://...` | `data:image/...;base64,...` |
| 持久性 | ❌ 临时 | ✅ 永久 |
| 跨会话 | ❌ 不支持 | ✅ 支持 |
| 导出导入 | ❌ 不可用 | ✅ 可用 |
| 文件大小 | 小（引用） | 大（完整内容） |
| 性能 | 快 | 稍慢（base64 编码） |
| 适用场景 | 临时预览 | 持久化存储 |

## 影响范围

### 修改文件

- `app/src/hooks/useSimpleViewer.ts` - 修改 `uploadSvg` 函数

### 影响功能

✅ **正面影响**：
- 导出的数据包含完整的背景图
- 导入后背景图可以正常显示
- 数据可以跨设备使用

⚠️ **注意事项**：
- Data URL 会增加 JSON 文件大小（约 33% 增加）
- 大图片可能导致文件较大
- 建议使用压缩后的 SVG

## 测试验证

### 测试步骤

1. **上传背景图**
   ```
   1. 点击上传按钮
   2. 选择 SVG 文件
   3. 查看控制台输出
   ```

   **预期输出**：
   ```
   [上传] SVG 文件已转换为 Data URL
   [上传] 文件大小: 25.67 KB
   ```

2. **导出数据**
   ```
   1. 点击导出按钮
   2. 打开下载的 JSON 文件
   3. 查看 backgroundImage 字段
   ```

   **预期格式**：
   ```json
   {
     "backgroundImage": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i..."
   }
   ```

3. **导入数据**
   ```
   1. 刷新页面（清空当前数据）
   2. 点击导入按钮
   3. 选择刚才导出的 JSON 文件
   4. 确认导入
   ```

   **预期结果**：
   - ✅ 背景图正常显示
   - ✅ 区域和座位正常显示

### 验证清单

- [ ] 上传 SVG 文件后可以显示
- [ ] 控制台显示 "已转换为 Data URL"
- [ ] 导出的 JSON 包含 Data URL 格式的 backgroundImage
- [ ] Data URL 以 `data:image/` 开头
- [ ] 导入后背景图正常显示
- [ ] 跨浏览器测试通过

## 文件大小优化

### 问题

Data URL 会增加文件大小：
- 原始 SVG: 100 KB
- Base64 编码后: ~133 KB（增加 33%）

### 优化建议

1. **压缩 SVG**
   - 使用 SVGO 工具压缩
   - 移除不必要的元数据
   - 简化路径

2. **使用外部链接**
   - 上传到图床
   - 使用 HTTP URL
   - 减小 JSON 文件大小

3. **分离存储**
   - 背景图单独存储
   - JSON 只保存引用
   - 按需加载

## 迁移指南

### 旧数据迁移

如果已有使用 Blob URL 的导出数据：

1. **重新上传背景图**
   ```
   1. 打开应用
   2. 上传原始 SVG 文件
   3. 导入旧的 JSON 数据（区域和座位）
   4. 重新导出
   ```

2. **手动修复 JSON**
   ```javascript
   // 读取旧的 JSON
   const oldData = JSON.parse(oldJsonContent);
   
   // 上传背景图获取 Data URL
   const file = /* 背景图文件 */;
   const reader = new FileReader();
   reader.onload = (e) => {
     const dataUrl = e.target.result;
     
     // 更新 JSON
     oldData.backgroundImage = dataUrl;
     
     // 保存新的 JSON
     const newJson = JSON.stringify(oldData, null, 2);
   };
   reader.readAsDataURL(file);
   ```

## 常见问题

### Q: 为什么不继续使用 Blob URL？

**A**: Blob URL 只在当前会话有效，无法持久化存储和跨设备使用。

### Q: Data URL 会不会太大？

**A**: 会增加约 33% 的大小，但这是可接受的代价。可以通过压缩 SVG 来优化。

### Q: 可以混合使用吗？

**A**: 可以。系统同时支持 Data URL 和 HTTP URL。

### Q: 旧数据怎么办？

**A**: 需要重新上传背景图并导出。参考上面的迁移指南。

## 版本信息

- **修复版本**: v1.6.1
- **修复日期**: 2026-02-26
- **影响范围**: 背景图上传和导出功能

---

*文档更新: 2026-02-26*
