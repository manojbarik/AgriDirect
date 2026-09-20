import { apiClient } from './api-client'

export interface WeatherForecast {
  id: string
  state: string
  district: string
  forecast_date: string
  condition: string
  temperature_c: number
  temp_high_c: number
  temp_low_c: number
  humidity: number
  precipitation_mm: number
  wind_speed_kmh: number
  pressure_hpa: number
  rain_probability: number
  sunrise: string | null
  sunset: string | null
  is_demo: boolean
  farming_tip: string | null
}

export interface WeatherToday {
  state: string
  district: string
  forecast_date: string
  condition: string
  temperature_c: number
  humidity: number
  rain_probability: number
  farming_tip: string | null
}

export const getWeatherForecast = (
  state: string,
  district: string,
  days = 5,
) =>
  apiClient.get<WeatherForecast[]>('/weather/forecast', {
    params: { state, district, days },
  })

export const getWeatherToday = (state: string, district: string) =>
  apiClient.get<WeatherToday | null>('/weather/today', { params: { state, district } })
