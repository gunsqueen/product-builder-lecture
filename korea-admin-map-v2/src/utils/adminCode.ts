import type { AdminLevel } from '../types/admin'

export const getAdminLevel = (adminCode: string): AdminLevel => {
  if (adminCode.length <= 2) return 'province'
  if (adminCode.length <= 5) return 'city'
  return 'town'
}
