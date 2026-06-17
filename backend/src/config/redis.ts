import { createClient } from 'redis'
import { env } from './env'

export const redisClient = createClient({
  url: env.REDIS_URL
})

export const connectRedis = async () => {
  try {
    await redisClient.connect()
    console.log('Redis connected')
  } catch (error) {
    console.error('Redis connection error:', error)
    process.exit(1)
  }
}