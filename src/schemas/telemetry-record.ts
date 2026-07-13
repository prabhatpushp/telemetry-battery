import { z } from 'zod'

export const telemetryRecordSchema = z
  .object({
    id: z.string().regex(/^evt-\d{6}$/),
    battery_id: z.string().regex(/^BAT-\d{3}$/),
    timestamp: z.string().datetime({ offset: true }),
    metrics: z
      .object({
        voltage: z.number().min(3.2).max(4.2),
        current: z.number().min(-15).max(15),
        temperature: z.number().min(20).max(45),
        state_of_charge: z.number().min(0).max(100),
        state_of_health: z.number().min(80).max(100),
      })
      .strict(),
    status: z.enum(['charging', 'discharging', 'idle']),
  })
  .strict()

export const telemetryDatasetSchema = z.array(telemetryRecordSchema)

export type TelemetryRecordDto = z.infer<typeof telemetryRecordSchema>
