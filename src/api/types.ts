// Типы повторяют Pydantic-схемы бэкенда plantwatch-api

export interface Sensor {
  id: number
  tag: string
  name: string
  unit: string
  low_limit: number | null
  high_limit: number | null
}

export type SensorInput = Omit<Sensor, 'id'>

/** Элемент списка GET /sensors: датчик + последнее показание и текущее состояние. */
export interface SensorWithLast extends Sensor {
  alarm_state: AlarmLevel | null
  last_value: number | null
  last_ts: string | null
}

export interface Reading {
  id: number
  value: number
  ts: string
}

export interface SensorStats {
  count: number
  min: number | null
  max: number | null
  avg: number | null
}

export type AlarmLevel = 'LOW' | 'HIGH'

export interface Alarm {
  id: number
  sensor_id: number
  sensor_tag: string
  level: AlarmLevel
  value: number
  limit: number
  ts: string
  acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
}
