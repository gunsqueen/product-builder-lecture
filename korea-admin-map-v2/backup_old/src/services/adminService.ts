import provincesData from '../data/admin/provinces.json'
import citiesData from '../data/admin/cities.json'
import townsData from '../data/admin/towns.json'
import type { CityDistrict, Province, Town } from '../types/admin'

const provinces = (provincesData as Array<Omit<Province, 'center'> & { center: number[] }>).map((item) => ({
  ...item,
  center: [item.center[0], item.center[1]] as [number, number],
}))
const cities = (citiesData as Array<Omit<CityDistrict, 'center'> & { center: number[] }>).map((item) => ({
  ...item,
  center: [item.center[0], item.center[1]] as [number, number],
}))
const towns = (townsData as Array<Omit<Town, 'center'> & { center: number[] }>).map((item) => ({
  ...item,
  center: [item.center[0], item.center[1]] as [number, number],
}))

export const getProvinces = () => provinces
export const getProvinceByCode = (provinceCode: string) =>
  provinces.find((province) => province.provinceCode === provinceCode)
export const getCitiesByProvince = (provinceCode: string) =>
  cities.filter((city) => city.provinceCode === provinceCode)
export const getCityByCode = (cityCode: string) => cities.find((city) => city.cityCode === cityCode)
export const getTownsByCity = (cityCode: string) => towns.filter((town) => town.cityCode === cityCode)
export const getTownByCode = (townCode: string) => towns.find((town) => town.townCode === townCode)
export const getAllRegions = () => ({ provinces, cities, towns })
