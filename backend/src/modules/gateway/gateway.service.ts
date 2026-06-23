import axios, { AxiosError } from 'axios'
import { Gateway, GatewayStatus } from '@prisma/client'
import { sseService } from '../../services/sse.service'
import * as repository from './gateway.repository'
import { CreateGatewayDto, UpdateGatewayDto, TestConnectionDto } from './gateway.dto'
import { markGatewayTokenExpired } from '../../services/heartbeat.service'
import { deployGatewayBaseFlow } from '../sync/sync.service'
import { getRedisClient } from '../../config/redis'

const getClient = () => getRedisClient()

export const createGateway = async (dto: CreateGatewayDto): Promise<Gateway> => {
  return repository.createGateway({
    name: dto.name,
    address: dto.address,
    port: dto.port,
    adminToken: dto.adminToken
  })
}

export const getAllGateways = async (): Promise<Gateway[]> => {
  return repository.getAllGateways()
}

export const getGatewayById = async (id: string): Promise<Gateway | null> => {
  return repository.getGatewayById(id)
}

export const updateGateway = async (
  id: string,
  dto: UpdateGatewayDto
): Promise<Gateway> => {
  if (dto.adminToken !== undefined) {
    const existingGateway = await repository.getGatewayById(id)
    if (existingGateway && existingGateway.adminToken !== dto.adminToken) {
      const client = getClient()
      await client.del(`token_expired:${id}`)
    }
  }
  return repository.updateGateway(id, dto)
}

export const deleteGateway = async (id: string): Promise<Gateway> => {
  return repository.deleteGateway(id)
}

export const testConnection = async (
  dto: TestConnectionDto
): Promise<{ success: boolean; tokenExpired: boolean; message: string }> => {
  try {
    let address = dto.address
    let port = dto.port
    let adminToken = dto.adminToken

    if (dto.gatewayId) {
      const gateway = await repository.getGatewayById(dto.gatewayId)
      if (gateway) {
        address = gateway.address
        port = gateway.port
        adminToken = gateway.adminToken
      }
    }

    const response = await axios.get(`http://${address}:${port}/`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      timeout: 5000
    })

    let nodeRedVersion: string | undefined
    try {
      const settingsResponse = await axios.get(`http://${address}:${port}/settings`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        timeout: 5000
      })
      nodeRedVersion = settingsResponse.data?.version
    } catch {
    }

    if (response.status === 200) {
      if (dto.gatewayId) {
        const client = getClient()
        await client.del(`token_expired:${dto.gatewayId}`)
        const gateway = await repository.getGatewayById(dto.gatewayId)
        if (
          gateway &&
          (gateway.status === GatewayStatus.TOKEN_EXPIRED ||
            gateway.status === GatewayStatus.OFFLINE ||
            gateway.status === GatewayStatus.ONLINE)
        ) {
          await client.set(
            `heartbeat:${dto.gatewayId}`,
            Date.now().toString(),
            { EX: 240 }
          )
          const updatedGateway = await repository.updateGateway(dto.gatewayId, {
            status: GatewayStatus.ONLINE,
            lastHeartbeat: new Date(),
            ip: gateway.address,
            nodeRedVersion
          })
          sseService.broadcast({
            type: 'gateway_status_change',
            data: {
              gatewayId: updatedGateway.id,
              status: updatedGateway.status,
              lastHeartbeat: updatedGateway.lastHeartbeat,
              ip: updatedGateway.ip || updatedGateway.address,
              flowCount: updatedGateway.flowCount ?? undefined,
              nodeRedVersion: updatedGateway.nodeRedVersion || undefined
            }
          })
        }

        try {
          if (gateway) {
            const latestGateway = await repository.getGatewayById(dto.gatewayId)
            await deployGatewayBaseFlow(latestGateway || gateway)
          }
        } catch (err) {
          console.error(`Failed to deploy base flow for gateway ${dto.gatewayId}`, err)
        }
      }
      return { success: true, tokenExpired: false, message: 'Connection successful' }
    }

    return {
      success: false,
      tokenExpired: false,
      message: `Unexpected status: ${response.status}`
    }
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError.response && axiosError.response.status === 401) {
      if (dto.gatewayId) {
        await markGatewayTokenExpired(dto.gatewayId)
      }
      return { success: false, tokenExpired: true, message: 'Token expired' }
    }
    return {
      success: false,
      tokenExpired: false,
      message: axiosError.message || 'Connection failed'
    }
  }
}
