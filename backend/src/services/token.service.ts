import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { env } from '../config/env'

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

export const verifyToken = (token: string): any => {
  return jwt.verify(token, env.JWT_SECRET)
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}