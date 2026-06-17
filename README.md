# 分布式数据采集系统

基于 Node-RED 的分布式采集网关管理系统，实现对多个 Node-RED 采集网关的集中统一管理。

## 功能模块

- **采集网关管理**：管理多个 Node-RED 实例，支持平台主动添加和网关主动注册两种方式
- **设备模型管理**：定义点位模型，配置点位信息，支持导入导出
- **设备实例管理**：管理设备实例，支持批量导入，查看点位列表
- **配置下发与同步**：配置下发引擎，同步状态管理，数据缓存补发

## 技术栈

### 后端
- Node.js 20+
- Express 4.x
- PostgreSQL 16+
- Redis 7+
- EMQX 5+ (MQTT Broker)
- Prisma ORM

### 前端
- React 18+
- TypeScript
- Vite 5+
- Tailwind CSS 3+
- Zustand (状态管理)
- Recharts (图表)

### 边缘端 (Node-RED)
- Node-RED Node API
- SQLite (本地缓存)
- MQTT.js

## 项目结构

```
collecting-system/
├── backend/          # 后端服务
├── frontend/         # 前端应用
├── nodered-plugin/   # Node-RED 插件
├── deployment/       # 部署配置
├── docs/             # 文档
└── specs/            # 规格文档
```

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- EMQX 5+ (可选)

### 后端启动

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库连接
npx prisma migrate dev
npm run dev
```

### 前端启动

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 使用 Docker 部署

```bash
cd deployment
docker-compose up -d
```

## API 接口

| 模块 | 路径 | 说明 |
|------|------|------|
| 网关管理 | `/api/gateways` | CRUD 操作 |
| 设备模型 | `/api/device-models` | CRUD 操作 |
| 设备实例 | `/api/device-instances` | CRUD 操作 |
| 同步记录 | `/api/sync` | 查询和下发 |
| 注册 | `/api/registration` | 生成注册码/注册网关 |

## 文档

- [产品概述](docs/产品概述.md)
- [技术栈](specs/技术栈.md)
- [项目结构](specs/项目结构.md)
- [开发记录](docs/开发记录/)

## 许可证

MIT