import type { AdminLevel } from '../types/admin'

export const getAdminLevel = (adminCode: string): AdminLevel => {
  if (adminCode.length <= 2) return 'province'
  if (adminCode.length <= 5) return 'city'
  return 'town'
}

export const getParentCode = (adminCode: string) => {
  const level = getAdminLevel(adminCode)
  if (level === 'province') return undefined
  if (level === 'city') return adminCode.slice(0, 2)
  return adminCode.slice(0, 5)
}

export const toMoisCode = (adminCode: string) => {
  if (adminCode.length === 2) return `${adminCode}00000000`
  if (adminCode.length === 5) return `${adminCode}00000`
  return adminCode
}

export const fromMoisCode = (moisCode: string) => {
  if (/^\d{2}00000000$/.test(moisCode)) return moisCode.slice(0, 2)
  if (/^\d{5}00000$/.test(moisCode)) return moisCode.slice(0, 5)
  if (/^\d{10}$/.test(moisCode)) return moisCode
  return null
}
