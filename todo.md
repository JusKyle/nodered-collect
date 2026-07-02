# TODO

## nodered-plugin 目录状态判断

结论：`nodered-plugin/` 当前不像是实际运行链路必需目录，更像是早期方案残留或尚未接入的插件实现。

依据：

- `docker-compose.yml` 使用 `nodered/node-red:latest`，没有安装本地 `nodered-plugin`。
- `deployment/docker/nodered/Dockerfile` 只安装工业协议 Node-RED 节点，没有安装 `node-red-contrib-collecting-system` 或本地插件目录。
- 当前主要配置下发链路在 `backend/src/modules/sync/sync.service.ts` 中直接生成 Node-RED Flow，并通过 Node-RED Admin API `/flows` 下发。
- 后端 MQTT 实际订阅 `devices/+/data`，但 `nodered-plugin/src/nodes/data-output/data-output.ts` 和 `nodered-plugin/src/services/data-cache.service.ts` 发布的是 `collecting/data/{deviceId}`，topic 与后端不一致。
- 文档和 specs 中仍大量提到 `nodered-plugin`，说明历史需求或设计里包含插件方案，但当前实现已经部分转向“平台直接生成并下发 Flow”的方案。

待决策：

- 如果采用无插件方案：清理或归档 `nodered-plugin/`，并同步更新 `CLAUDE.md`、`specs/`、`docs/` 中关于插件注册、插件心跳、插件离线缓存的描述。
- 如果保留插件方案：补齐 Node-RED 容器安装插件的构建流程，并统一插件发布 topic、后端订阅 topic、注册流程、心跳流程和配置同步流程。

建议：优先选择并固化一种网关执行方案，避免同时维护“插件主动注册/同步”和“平台直接下发 Flow”两套不完全一致的链路。
