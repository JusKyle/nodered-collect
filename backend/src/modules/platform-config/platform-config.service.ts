import { prisma } from '../../config/db'
import { PlatformConfig } from '@prisma/client'
import { z } from 'zod'

export const updatePlatformConfigDto = z.object({
  cacheEnabled: z.boolean().optional(),
  cacheRetentionDays: z.number().int().min(1).max(365).optional(),
  cacheReplayRate: z.number().int().min(1).max(500).optional()
})

export type UpdatePlatformConfigDto = z.infer<typeof updatePlatformConfigDto>

export const getPlatformConfig = async (): Promise<PlatformConfig> => {
  let config = await prisma.platformConfig.findUnique({
    where: { id: 'singleton' }
  })

  if (!config) {
    config = await prisma.platformConfig.create({
      data: {
        id: 'singleton'
      }
    })
  }

  return config
}

export const updatePlatformConfig = async (
  dto: UpdatePlatformConfigDto
): Promise<PlatformConfig> => {
  const existing = await getPlatformConfig()

  return prisma.platformConfig.update({
    where: { id: existing.id },
    data: dto
  })
}

export const getEffectiveCacheConfig = async (
  gatewayId?: string
): Promise<{
  cacheEnabled: boolean
  cacheRetentionDays: number
  cacheReplayRate: number
}> => {
  const platformConfig = await getPlatformConfig()

  const result = {
    cacheEnabled: platformConfig.cacheEnabled,
    cacheRetentionDays: platformConfig.cacheRetentionDays,
    cacheReplayRate: platformConfig.cacheReplayRate
  }

  if (gatewayId) {
    const gateway = await prisma.gateway.findUnique({
      where: { id: gatewayId },
      select: {
        cacheEnabled: true,
        cacheRetentionDays: true,
        cacheReplayRate: true
      }
    })

    if (gateway) {
      if (gateway.cacheEnabled !== null) {
        result.cacheEnabled = gateway.cacheEnabled
      }
      if (gateway.cacheRetentionDays !== null) {
        result.cacheRetentionDays = gateway.cacheRetentionDays
      }
      if (gateway.cacheReplayRate !== null) {
        result.cacheReplayRate = gateway.cacheReplayRate
      }
    }
  }

  return result
}
