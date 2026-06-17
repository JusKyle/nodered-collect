# node-red-contrib-collecting-system

Node-RED plugin for the collecting system.

## Features

- Device management node for registering device instances
- Device instance node for data collection
- Data output node for sending data to the platform
- Heartbeat service for gateway status monitoring
- Config sync service for receiving configuration updates
- Data cache service for offline data storage

## Installation

```bash
npm install node-red-contrib-collecting-system
```

## Configuration

1. Add the device-manager configuration node
2. Set the platform URL and registration code
3. Add device-instance nodes for each device
4. Connect data-output node to send data

## License

MIT