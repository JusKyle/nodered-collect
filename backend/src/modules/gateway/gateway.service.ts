import axios, { AxiosError } from 'axios'
import { Gateway, GatewayStatus } from '@prisma/client'
import * as repository from './gateway.repository'
import { CreateGatewayDto, UpdateGatewayDto, TestConnectionDto } from './gateway.dto'
import { markGatewayTokenExpired } from '../../services/heartbeat.service'
import { deployGatewayBaseFlow } from '../sync/sync.service'
import { redisClient } from '../../config/redis'

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
      await redisClient.del(`token_expired:${id}`)
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
    const response = await axios.get(`http://${dto.address}:${dto.port}/`, {
      headers: {
        'Authorization': `Bearer ${dto.adminToken}`
      },
      timeout: 5000
    })

    if (response.status === 200) {
      if (dto.gatewayId) {
        await redisClient.del(`token_expired:${dto.gatewayId}`)
        const gateway = await repository.getGatewayById(dto.gatewayId)
        if (
          gateway &&
          (gateway.status === GatewayStatus.TOKEN_EXPIRED ||
            gateway.status === GatewayStatus.OFFLINE)
        ) {
          await repository.updateGateway(dto.gatewayId, {
            status: GatewayStatus.ONLINE
          })
        }

        // 关键：测试连接成功后，下发网关基础流（心跳 + 配置监听节点）
        try {
          if (gateway) {
            await deployGatewayBaseFlow(gateway)
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
