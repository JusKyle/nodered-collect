import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { env } from '../config/env'

export const generateToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: '24h' }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

export interface TokenPayload {
  gatewayId?: string
  [key: string]: unknown
}

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload
  return decoded
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}