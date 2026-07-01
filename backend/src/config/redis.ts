import { createClient } from 'redis'
import { env } from './env'

type RedisClient = ReturnType<typeof createClient>

let redisClient: RedisClient

const createRedisClient = (): RedisClient => {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        return Math.min(retries * 50, 5000)
      }
    }
  })

  client.on('error', (err) => {
    console.error('Redis client error:', err)
  })

  client.on('connect', () => {
    console.log('Redis connected')
  })

  client.on('reconnecting', () => {
    console.log('Redis reconnecting...')
  })

  client.on('ready', () => {
    console.log('Redis ready')
  })

  return client
}

export const getRedisClient = (): RedisClient => {
  if (!redisClient || !(redisClient as any).isOpen) {
    redisClient = createRedisClient()
  }
  return redisClient
}

export const connectRedis = async () => {
  redisClient = createRedisClient()
  try {
    await redisClient.connect()
  } catch (error) {
    console.error('Redis connection error:', error)
    process.exit(1)
  }
}

export { redisClient }
