import { tServe } from './index'

export interface DeviceListResponse {
  data: { _id: string; name: string; type: string; intro: string }[]
}

export function requestDeviceList() {
  return tServe<DeviceListResponse>('/device/list', 'GET')
}
