import crypto from 'crypto'

export const generateRandomString = (length: number): string => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

export const encrypt = (data: string, secret: string): string => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher('aes-256-cbc', secret)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export const decrypt = (data: string, secret: string): string => {
  const [ivHex, encrypted] = data.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipher('aes-256-cbc', secret)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}