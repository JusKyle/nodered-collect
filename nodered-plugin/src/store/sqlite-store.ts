import sqlite3 from 'sqlite3'
import { logger } from '../utils/logger'

const DB_PATH = './data/collecting-system.db'

export class SQLiteStore {
  private db: sqlite3.Database

  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error(`Failed to open database: ${err.message}`)
      } else {
        logger.info('Database opened successfully')
        this.init()
      }
    })
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cached_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deviceId TEXT NOT NULL,
        pointName TEXT NOT NULL,
        value TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        sent INTEGER DEFAULT 0
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS device_configs (
        deviceId TEXT PRIMARY KEY,
        config TEXT NOT NULL
      )
    `)
  }

  public async saveCachedData(deviceId: string, pointName: string, value: string, timestamp: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO cached_data (deviceId, pointName, value, timestamp) VALUES (?, ?, ?, ?)',
        [deviceId, pointName, value, timestamp],
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  public async getUnsentData(deviceId?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = deviceId
        ? 'SELECT * FROM cached_data WHERE sent = 0 AND deviceId = ? ORDER BY timestamp ASC'
        : 'SELECT * FROM cached_data WHERE sent = 0 ORDER BY timestamp ASC'
      this.db.all(query, deviceId ? [deviceId] : [], (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  public async markDataAsSent(ids: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',')
      this.db.run(
        `UPDATE cached_data SET sent = 1 WHERE id IN (${placeholders})`,
        ids,
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  public async saveDeviceConfig(deviceId: string, config: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO device_configs (deviceId, config) VALUES (?, ?)',
        [deviceId, config],
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  public async getDeviceConfig(deviceId: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT config FROM device_configs WHERE deviceId = ?',
        [deviceId],
        (err, row) => {
          if (err) reject(err)
          else resolve(row?.config || null)
        }
      )
    })
  }

  public close() {
    this.db.close()
  }
}