# 设计 Token (Design Tokens)

> 基于原型方向 v1（清爽运维台）提取，作为所有模块页面的设计基准。

## 1. 配色方案 (Color Palette)

### 1.1 品牌色
| Token | 值 | 用途 |
|-------|-----|------|
| `--color-primary` | `#3f6b50` (moss) | 主按钮、品牌标识、活动状态 |
| `--color-primary-hover` | `#2f5a40` | 主按钮 hover |
| `--color-primary-light` | `#eef5ef` (sage) | 选中态背景、轻量强调背景 |

### 1.2 中性色
| Token | 值 | 用途 |
|-------|-----|------|
| `--color-bg` | `#f7faf7` | 页面背景 |
| `--color-surface` | `#ffffff` | 卡片、面板、输入框背景 |
| `--color-surface-secondary` | `#eef5ef` (sage) | 次级背景、导航激活态 |
| `--color-text-primary` | `#17201a` (ink) | 正文、标题 |
| `--color-text-secondary` | `#64748b` (slate-500) | 辅助文字、标签 |
| `--color-border` | `#dfe8e1` (line) | 卡片边框、分割线、输入框边框 |

### 1.3 语义色
| Token | 值 | 用途 |
|-------|-----|------|
| `--color-success` | `#10b981` (emerald-500) | 在线状态、成功反馈 |
| `--color-warning` | `#d97706` (amber) | 待处理、警告提示 |
| `--color-error` | `#dc2626` (red-600) | 离线、失败、错误 |
| `--color-info` | `#3b82f6` (blue-500) | 信息提示 |

### 1.4 图表色
| Token | 值 | 用途 |
|-------|-----|------|
| `--chart-line-1` | `#3f6b50` | CPU / 主指标线 |
| `--chart-line-2` | `#d97706` | 内存 / 副指标线 |
| `--chart-area-1` | `rgba(63,107,80,.14)` | 面积填充 |

## 2. 字体层级 (Typography)

| 层级 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| 页面标题 (h1) | 24px / text-2xl | 600 (semibold) | 1.3 | 页面主标题 |
| 卡片标题 (h2) | 16px | 600 (semibold) | 1.4 | 卡片标题 |
| 正文 | 14px / text-sm | 400 | 1.5 | 表格内容、按钮文字 |
| 辅助文字 | 12px / text-xs | 400 | 1.5 | 标签、描述、时间戳 |
| 大数字 | 30px / text-3xl | 600 (semibold) | 1.2 | 统计数值 |
| 导航 | 14px / text-sm | 400 (active: 500) | 1.4 | 侧边栏导航项 |

字体系列：`Inter, "PingFang SC", "Microsoft YaHei", sans-serif`

## 3. 间距 (Spacing)

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-xs` | 4px | 小间隔、状态点间距 |
| `--space-sm` | 8px | 内边距紧凑、标签间距 |
| `--space-md` | 12px | 小卡片内边距、列表项间距 |
| `--space-base` | 16px / p-4 | 卡片内边距、网格间距 |
| `--space-lg` | 24px / p-6 | 页面主内容外边距 |
| `--space-xl` | 32px | 大区块间距 |

## 4. 圆角 (Border Radius)

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 4px / rounded | 进度条、小标签 |
| `--radius-md` | 8px / rounded-lg | 卡片、按钮、输入框 |
| `--radius-full` | 9999px / rounded-full | 状态指示点、头像 |

## 5. 阴影 (Shadows)

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-card` | `0 10px 26px rgba(23,32,26,.06)` | 指标卡片 |
| `--shadow-dropdown` | `0 4px 12px rgba(23,32,26,.1)` | 下拉菜单 |

## 6. 布局 (Layout)

| Token | 值 | 用途 |
|-------|-----|------|
| 侧边栏宽度 | `248px` | 固定左侧导航 |
| 主内容区 | `1fr` | 弹性填充剩余空间 |
| 指标网格 | `grid-cols-4` | 4 列统计卡片 |
| 内容网格 | `grid-cols-[1.45fr_0.9fr]` | 图表 + 列表组合 |

## 7. 组件样式 (Component Styles)

### 7.1 按钮
| 类型 | 样式 |
|------|------|
| 主按钮 | `h-9 px-3 rounded-lg bg-moss text-white text-sm flex items-center gap-2` |
| 次按钮 | `h-9 px-3 rounded-lg border border-line bg-white text-sm flex items-center gap-2` |
| 文字按钮 | `text-sm text-moss` (hover: text-primary-hover) |

### 7.2 导航项
| 状态 | 样式 |
|------|------|
| 默认 | `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 text-sm` |
| 激活 | `bg-sage text-[#2f5a40]` (附加上述默认样式) |

### 7.3 卡片
| 类型 | 样式 |
|------|------|
| 标准卡片 | `bg-white rounded-lg border border-line p-4` |
| 指标卡片 | 标准卡片 + `shadow-card` |
| 次级卡片 | `bg-sage border border-line p-3` |
| 状态卡片 | 标准卡片 + 内部状态信息布局 |

### 7.4 状态指示
| 元素 | 样式 |
|------|------|
| 状态圆点 | `h-2.5 w-2.5 rounded-full` + 语义色 |
| 进度条 | `h-2 rounded bg-white` (轨道) / `h-2 rounded bg-moss` (填充) |
| 状态标签 | `text-xs px-2 py-1 rounded` + 语义色背景 |

### 7.5 表格
| 元素 | 样式 |
|------|------|
| 表格头 | `text-left text-xs text-slate-500` |
| 表格行 | `divide-y divide-line` |
| 表格单元格 | 标准：正文 14px / 操作列：链接样式 |

### 7.6 输入框与表单
| 元素 | 样式 |
|------|------|
| 输入框 | `h-9 rounded-lg border border-line px-3 text-sm bg-white` |
| 选择框 | 同输入框高度和圆角 |
| 标签 | `text-sm` |

### 7.7 徽章
| 类型 | 样式 |
|------|------|
| 信息徽章 | `text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-600` (及其他语义色变体) |

## 8. 图标 (Icons)

使用 Lucide Icons 库，尺寸规范：
- 导航图标：`w-4` (16px)
- 按钮图标：`w-4` (16px)
- Logo 图标：`w-5` (20px)
- 功能图标：`w-5` (20px)
