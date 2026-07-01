import fs from 'fs'
import path from 'path'

describe('设备模型 Prisma schema', () => {
  const schema = fs.readFileSync(path.resolve(__dirname, '../../../prisma/schema.prisma'), 'utf8')

  it('DeviceModel 使用整数版本号并关联 PointModel', () => {
    expect(schema).toMatch(/model DeviceModel \{[\s\S]*version\s+Int\s+@default\(1\)/)
    expect(schema).toMatch(/model DeviceModel \{[\s\S]*pointModels\s+PointModel\[\]/)
  })

  it('定义 PointModel 表并用 modelId 外键关联 DeviceModel', () => {
    expect(schema).toMatch(/model PointModel \{[\s\S]*id\s+String\s+@id\s+@default\(cuid\(\)\)/)
    expect(schema).toMatch(/model PointModel \{[\s\S]*modelId\s+String/)
    expect(schema).toMatch(/model PointModel \{[\s\S]*model\s+DeviceModel\s+@relation\(fields: \[modelId\], references: \[id\], onDelete: Cascade\)/)
  })

  it('PointModel 包含点位字段、JSON config 和排序字段', () => {
    expect(schema).toMatch(/model PointModel \{[\s\S]*name\s+String/)
    expect(schema).toMatch(/model PointModel \{[\s\S]*tag\s+String/)
    expect(schema).toMatch(/model PointModel \{[\s\S]*dataType\s+DataType/)
    expect(schema).toMatch(/model PointModel \{[\s\S]*address\s+String/)
    expect(schema).toMatch(/model PointModel \{[\s\S]*config\s+Json\s+@default\("\{\}"\)/)
    expect(schema).toMatch(/model PointModel \{[\s\S]*sort\s+Int\s+@default\(0\)/)
  })

  it('DataType 枚举包含所有规划的数据类型', () => {
    expect(schema).toMatch(/enum DataType \{[\s\S]*INT16[\s\S]*UINT16[\s\S]*INT32[\s\S]*UINT32[\s\S]*FLOAT32[\s\S]*FLOAT64[\s\S]*BOOL[\s\S]*STRING[\s\S]*\}/)
  })
})
