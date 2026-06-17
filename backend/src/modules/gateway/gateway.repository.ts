import { prisma } from '../../config/db'
import { Gateway, GatewayStatus } from '@prisma/client'

export const createGateway = async (data: {
  name: string
  address: string
  port: number
  adminToken: string
}): Promise<Gateway> => {
  return prisma.gateway.create({ data })
}

export const getAllGateways = async (): Promise<Gateway[]> => {
  return prisma.gateway.findMany()
}

export const getGatewayById = async (id: string): Promise<Gateway | null> => {
  return prisma.gateway.findUnique({ where: { id } })
}

export const updateGateway = async (
  id: string,
  data: Partial<Gateway>
): Promise<Gateway> => {
  return prisma.gateway.update({ where: { id }, data })
}

export const deleteGateway = async (id: string): Promise<Gateway> => {
  return prisma.gateway.delete({ where: { id } })
}

export const updateGatewayStatus = async (
  id: string,
  status: GatewayStatus,
  lastHeartbeat?: Date
): Promise<Gateway> => {
  return prisma.gateway.update({
    where: { id },
    data: { status, lastHeartbeat }
  })
}