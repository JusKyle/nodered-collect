import axios from 'axios'
import { prisma } from '../config/db'
import { SyncType, SyncStatus } from '@prisma/client'

export const deployConfigToGateway = async (gatewayId: string, deviceInstanceId?: string) => {
  const gateway = await prisma.gateway.findUnique({ where: { id: gatewayId } })
  if (!gateway) {
    throw new Error('Gateway not found')
  }

  const syncRecord = await prisma.syncRecord.create({
    data: {
      type: SyncType.DEPLOY,
      gatewayId,
      deviceInstanceId,
      status: SyncStatus.PENDING
    }
  })

  try {
    const flows = await buildFlowsForGateway(gatewayId, deviceInstanceId)

    await axios.post(
      `http://${gateway.address}:${gateway.port}/flows`,
      flows,
      {
        headers: {
          'Authorization': `Bearer ${gateway.adminToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    await prisma.syncRecord.update({
      where: { id: syncRecord.id },
      data: { status: SyncStatus.SUCCESS }
    })

    return syncRecord
  } catch (error: any) {
    await prisma.syncRecord.update({
      where: { id: syncRecord.id },
      data: {
        status: SyncStatus.FAILED,
        message: error.message
      }
    })

    throw error
  }
}

const buildFlowsForGateway = async (gatewayId: string, deviceInstanceId?: string) => {
  const instances = await prisma.deviceInstance.findMany({
    where: {
      gatewayId,
      ...(deviceInstanceId && { id: deviceInstanceId })
    },
    include: { model: true }
  })

  const flows: any[] = []

  instances.forEach((instance) => {
    flows.push({
      id: `device-${instance.id}`,
      type: 'device-instance',
      deviceId: instance.id,
      modelId: instance.modelId,
      nodeId: instance.nodeId,
      config: instance.config,
      points: instance.model.points
    })
  })

  return flows
}