import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";

function getEnvValue(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`环境变量${key}不存在!`)
  else return value
}

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb({
    host: getEnvValue('DATABASE_HOST'),
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: getEnvValue('DATABASE_USER'),
    password: getEnvValue('DATABASE_PASSWORD'),
    database: getEnvValue('DATABASE_NAME'),
    allowPublicKeyRetrieval: true, // 获取RSA公钥
    connectionLimit: 5
  })

  console.log('prisma client setup success')

  return new PrismaClient({ adapter })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton> // 类型声明

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton() // 如果当前已经存在全局实例，复用实例

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}