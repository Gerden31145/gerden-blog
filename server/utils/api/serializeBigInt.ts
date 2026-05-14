// 将BigInt类型转为字符串
export default function serializeBigInt<T, U>(data: T): U {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    return typeof value === 'bigint' ? value.toString() : value
  }))
} 