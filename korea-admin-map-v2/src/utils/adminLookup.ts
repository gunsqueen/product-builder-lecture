import provinces from '../data/admin/provinces.json'
import cities from '../data/admin/cities.json'
import towns from '../data/admin/towns.json'

export interface ProvinceRecord {
  adminCode: string
  name: string
  level: 'province'
  parentCode: null
  sgisCode?: string
}

export interface CityRecord {
  adminCode: string
  name: string
  level: 'city'
  parentCode: string
  provinceCode: string
  sgisCode?: string
}

export interface TownRecord {
  adminCode: string
  name: string
  level: 'town'
  parentCode: string
  provinceCode: string
  cityCode: string
  sgisCode?: string
}

const provinceList = provinces as ProvinceRecord[]
const cityList = cities as CityRecord[]
const townList = towns as TownRecord[]

const provinceMap = new Map(provinceList.map((item) => [item.adminCode, item]))
const provinceSgisMap = new Map(provinceList.map((item) => [item.sgisCode ?? item.adminCode, item]))
const cityMap = new Map(cityList.map((item) => [item.adminCode, item]))
const citySgisMap = new Map(cityList.map((item) => [item.sgisCode ?? item.adminCode, item]))
const townMap = new Map(townList.map((item) => [item.adminCode, item]))
const townSgisMap = new Map(townList.map((item) => [item.sgisCode ?? item.adminCode, item]))

const debug = (label: string, payload: unknown) => {
  if (import.meta.env.DEV) {
    console.log(label, payload)
  }
}

export const getAllProvinces = () => provinceList
export const getAllCities = () => cityList
export const getAllTowns = () => townList

export const getProvinceByCode = (provinceCode: string) => {
  const province = provinceMap.get(provinceCode)
  debug('[province:lookup]', { provinceCode, found: Boolean(province), name: province?.name })
  return province
}

export const getProvinceBySgisCode = (sgisCode: string) => provinceSgisMap.get(sgisCode)

export const getCityByCode = (cityCode: string) => {
  const city = cityMap.get(cityCode)
  debug('[city:lookup]', { cityCode, found: Boolean(city), name: city?.name })
  return city
}

export const getCityBySgisCode = (sgisCode: string) => citySgisMap.get(sgisCode)

export const getTownByCode = (townCode: string) => {
  const town = townMap.get(townCode)
  debug('[town:lookup]', { townCode, found: Boolean(town), name: town?.name })
  return town
}

export const getTownBySgisCode = (sgisCode: string) => townSgisMap.get(sgisCode)

export const getCitiesByProvinceCode = (provinceCode: string) => {
  const list = cityList.filter((item) => item.provinceCode === provinceCode)
  debug('[admin:children]', { level: 'city', provinceCode, count: list.length })
  return list
}

export const getTownsByCityCode = (cityCode: string) => {
  const list = townList.filter((item) => item.cityCode === cityCode)
  debug('[admin:children]', { level: 'town', cityCode, count: list.length })
  return list
}
