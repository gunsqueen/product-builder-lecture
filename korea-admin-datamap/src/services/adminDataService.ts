import {
  getCityCatalog,
  getProvinceCatalog,
  getTownCatalog,
  loadCities,
  loadCityByCode,
  loadProvinceByCode,
  loadProvinces,
  loadLegacyTownAliasByCode,
  loadTownByCode,
  loadTowns,
} from '@/services/adminService'
import type {
  CityCode,
  CityDistrict,
  Province,
  ProvinceCode,
  Town,
  TownCode,
} from '@/types/admin'

export const listProvinces = () => loadProvinces()

export const getProvinceByCode = (provinceCode: ProvinceCode) =>
  loadProvinceByCode(provinceCode)

export const listCitiesByProvince = (provinceCode: ProvinceCode) =>
  loadCities(provinceCode)

const hasLeafDistrictChildren = (city: CityDistrict, provinceCities: CityDistrict[]) =>
  provinceCities.some(
    (candidate) =>
      candidate.adminType === 'district' &&
      candidate.name.startsWith(`${city.name} `),
  )

export const listDisplayCitiesByProvince = async (provinceCode: ProvinceCode) => {
  const cities = await loadCities(provinceCode)

  return cities.filter((city) => {
    if (city.adminType === 'district') {
      return true
    }

    return !hasLeafDistrictChildren(city, cities)
  })
}

export const listDisplayCityMasters = () => {
  const cities = getCityCatalog()

  return cities.filter((city) => {
    if (city.adminType === 'district') {
      return true
    }

    const provinceCities = cities.filter((candidate) => candidate.provinceCode === city.provinceCode)
    return !hasLeafDistrictChildren(city, provinceCities)
  })
}

export const getCityByCode = (cityCode: CityCode) =>
  loadCityByCode(cityCode)

export const listTownsByCity = (cityCode: CityCode) =>
  loadTowns(cityCode)

export const getTownByCode = (townCode: TownCode) =>
  loadTownByCode(townCode).then(async (town) => {
    if (town) {
      return town
    }

    const alias = await loadLegacyTownAliasByCode(townCode)
    if (!alias?.adminDongCode) {
      return alias
    }

    return (await loadTownByCode(alias.adminDongCode)) ?? alias
  })

export const toProvinceLookup = (items: Province[]) =>
  Object.fromEntries(items.map((item) => [item.code, item]))

export const toCityLookup = (items: CityDistrict[]) =>
  Object.fromEntries(items.map((item) => [item.code, item]))

export const toTownLookup = (items: Town[]) =>
  Object.fromEntries(items.map((item) => [item.code, item]))

export const listAllProvinceMasters = () => getProvinceCatalog()
export const listAllCityMasters = () => getCityCatalog()
export const listAllTownMasters = () => getTownCatalog()
