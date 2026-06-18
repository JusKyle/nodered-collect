FROM nodered/node-red:latest

WORKDIR /usr/src/node-red

# 安装工业协议节点包 - 这些都是 npm registry 上真实存在的、广泛使用的 Node-RED 节点
RUN npm install \
    node-red-node-serialport \
    node-red-contrib-modbus \
    node-red-contrib-opcua \
    node-red-contrib-s7 \
    node-red-contrib-cron-plus \
    node-red-contrib-ui-state-trail \
    node-red-node-ui-table \
    && rm -rf /tmp/* /root/.npm

EXPOSE 1880

CMD ["npm", "start"]
