import { prisma } from '../config/db'

export const expireRegistrationCodes = async (): Promise<number> => {
  const now = new Date()
  const result = await prisma.registrationCode.updateMany({
    where: {
      status: 'UNUSED',
      expiresAt: {
        lt: now
      }
    },
    data: {
      status: 'EXPIRED'
    }
  })
  return result.count
}

let expirationTimer: NodeJS.Timeout | null = null

export const startExpirationJob = () => {
  if (expirationTimer) return

  expireRegistrationCodes()

  expirationTimer = setInterval(async () => {
    try {
      await expireRegistrationCodes()
    } catch (error) {
      console.error('注册码过期检查失败:', error)
    }
  }, 60 * 1000)

  console.log('注册码过期定时任务已启动（每分钟检查一次）')
}

export const stopExpirationJob = () => {
  if (expirationTimer) {
    clearInterval(expirationTimer)
    expirationTimer = null
    console.log('注册码过期定时任务已停止')
  }
}
