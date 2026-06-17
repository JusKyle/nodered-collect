import axios from 'axios'
import { Gateway } from '@prisma/client'
import * as repository from './gateway.repository'
import { CreateGatewayDto, UpdateGatewayDto, TestConnectionDto } from './gateway.dto'

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
  return repository.updateGateway(id, dto)
}

export const deleteGateway = async (id: string): Promise<Gateway> => {
  return repository.deleteGateway(id)
}

export const testConnection = async (dto: TestConnectionDto): Promise<boolean> => {
  try {
    const response = await axios.get(`http://${dto.address}:${dto.port}/`, {
      headers: {
        'Authorization': `Bearer ${dto.adminToken}`
      },
      timeout: 5000
    })
    return response.status === 200
  } catch {
    return false
  }
}