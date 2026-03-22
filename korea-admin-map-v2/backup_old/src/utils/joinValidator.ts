import { isDev } from '../config/app'

export const validateJoin = (label: string, boundaryCodes: string[], dataCodes: string[]) => {
  const dataSet = new Set(dataCodes)
  const success = boundaryCodes.filter((code) => dataSet.has(code)).length
  const fail = boundaryCodes.length - success
  const missingSamples = boundaryCodes.filter((code) => !dataSet.has(code)).slice(0, 10)

  if (isDev) {
    console.info(`[join:${label}]`, {
      success,
      fail,
      boundaryCount: boundaryCodes.length,
      dataCount: dataCodes.length,
      missingSamples,
    })
  }

  return { success, fail, missingSamples, hasMixedGap: fail > 0 }
}
