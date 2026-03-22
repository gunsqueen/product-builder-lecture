import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const ADMIN_DIR = path.join(ROOT_DIR, 'src', 'data', 'admin')
const PROVINCES_PATH = path.join(ADMIN_DIR, 'provinces.json')
const CITIES_PATH = path.join(ADMIN_DIR, 'cities.json')
const TOWNS_PATH = path.join(ADMIN_DIR, 'towns.json')

const LEGAL_CODE_DOWNLOAD_URL = 'https://www.code.go.kr/etc/codeFullDown.do'

const existingProvinces = JSON.parse(fs.readFileSync(PROVINCES_PATH, 'utf8'))
const existingCities = JSON.parse(fs.readFileSync(CITIES_PATH, 'utf8'))
const existingTowns = JSON.parse(fs.readFileSync(TOWNS_PATH, 'utf8'))

const provinceMetaByCode = new Map(existingProvinces.map((record) => [record.provinceCode, record]))
const cityMetaByCode = new Map(existingCities.map((record) => [record.cityCode, record]))
const townMetaByCode = new Map(existingTowns.map((record) => [record.townCode, record]))

const inferCityAdminType = (name, cityCode) => {
  if (cityCode === '36110') {
    return 'special'
  }

  if (name.endsWith('군')) {
    return 'county'
  }

  if (name.endsWith('구')) {
    return 'district'
  }

  return 'city'
}

const inferTownType = (name) => {
  if (name.endsWith('읍')) {
    return 'eup'
  }

  if (name.endsWith('면')) {
    return 'myeon'
  }

  return 'dong'
}

const main = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'korea-admin-master-'))
  const zipPath = path.join(tempDir, 'legal-code.zip')
  const txtPath = path.join(tempDir, 'legal-code.txt')

  execSync(
    `curl -L -s -o "${zipPath}" -X POST "${LEGAL_CODE_DOWNLOAD_URL}" --data-urlencode "codeseId=법정동코드"`,
    { stdio: 'inherit' },
  )
  execSync(
    `unzip -p "${zipPath}" | iconv -f CP949 -t UTF-8 > "${txtPath}"`,
    { stdio: 'inherit' },
  )

  const rows = fs
    .readFileSync(txtPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [code, fullName, status] = line.split('\t')
      return { code, fullName, status }
    })
    .filter((row) => row.code && row.fullName && row.status === '존재')

  const provinceRows = rows.filter(
    (row) =>
      row.code.endsWith('00000000') ||
      row.code === '3611000000',
  )
  const cityRows = rows.filter(
    (row) => row.code.endsWith('00000') && !row.code.endsWith('00000000'),
  )
  const townRows = rows.filter(
    (row) => row.code.endsWith('00') && !row.code.endsWith('00000'),
  )

  const provinceNameByCode = new Map(
    provinceRows.map((row) => [row.code.slice(0, 2), row.fullName]),
  )
  const cityFullNameByCode = new Map(
    cityRows.map((row) => [row.code.slice(0, 5), row.fullName]),
  )

  const townsByCityCode = new Map()
  for (const row of townRows) {
    const cityCode = row.code.slice(0, 5)
    const current = townsByCityCode.get(cityCode) ?? 0
    townsByCityCode.set(cityCode, current + 1)
  }

  const provinces = provinceRows
    .map((row) => {
      const provinceCode = row.code.slice(0, 2)
      const existing = provinceMetaByCode.get(provinceCode)
      const cityCount = cityRows.filter((city) => city.code.startsWith(provinceCode)).length
      const defaultName = row.fullName

      return {
        provinceCode,
        name: defaultName,
        shortName: existing?.shortName ?? defaultName.replace(/특별자치도|특별자치시|특별시|광역시|자치도|도/g, ''),
        slug: existing?.slug ?? `province-${provinceCode}`,
        capital: existing?.capital ?? defaultName,
        center: existing?.center ?? [36.2, 127.8],
        populationRank: existing?.populationRank ?? 99,
        cityCount,
        description: existing?.description ?? `${defaultName} 전체 시군구 마스터 데이터`,
      }
    })
    .sort((left, right) => left.provinceCode.localeCompare(right.provinceCode))

  const provinceCenterByCode = new Map(
    provinces.map((province) => [province.provinceCode, province.center]),
  )

  const cities = cityRows
    .map((row) => {
      const cityCode = row.code.slice(0, 5)
      const provinceCode = row.code.slice(0, 2)
      const existing = cityMetaByCode.get(cityCode)
      const provinceName = provinceNameByCode.get(provinceCode) ?? ''
      const displayName = row.fullName.replace(`${provinceName} `, '').trim()
      const provinceCenter = provinceCenterByCode.get(provinceCode) ?? [36.2, 127.8]

      return {
        cityCode,
        provinceCode,
        name: displayName,
        shortName: existing?.shortName ?? displayName,
        slug: existing?.slug ?? `city-${cityCode}`,
        adminType: existing?.adminType ?? inferCityAdminType(displayName, cityCode),
        center: existing?.center ?? provinceCenter,
        townCount: townsByCityCode.get(cityCode) ?? 0,
        hasBoundary: true,
      }
    })
    .sort((left, right) => left.cityCode.localeCompare(right.cityCode))

  const cityCenterByCode = new Map(cities.map((city) => [city.cityCode, city.center]))

  const towns = townRows
    .map((row) => {
      const legalDongCode = row.code
      const townCode = row.code.slice(0, 8)
      const cityCode = row.code.slice(0, 5)
      const provinceCode = row.code.slice(0, 2)
      const existing = townMetaByCode.get(townCode)
      const cityFullName = cityFullNameByCode.get(cityCode) ?? ''
      const displayName = row.fullName.replace(`${cityFullName} `, '').trim()
      const cityCenter = cityCenterByCode.get(cityCode) ?? provinceCenterByCode.get(provinceCode) ?? [36.2, 127.8]

      return {
        townCode,
        cityCode,
        provinceCode,
        legalDongCode,
        name: displayName,
        shortName: existing?.shortName ?? displayName,
        slug: existing?.slug ?? `town-${townCode}`,
        townType: existing?.townType ?? inferTownType(displayName),
        center: existing?.center ?? cityCenter,
        hasBoundary: existing?.hasBoundary ?? false,
      }
    })
    .sort((left, right) => left.townCode.localeCompare(right.townCode))

  fs.writeFileSync(PROVINCES_PATH, `${JSON.stringify(provinces, null, 2)}\n`)
  fs.writeFileSync(CITIES_PATH, `${JSON.stringify(cities, null, 2)}\n`)
  fs.writeFileSync(TOWNS_PATH, `${JSON.stringify(towns, null, 2)}\n`)

  console.log(
    JSON.stringify(
      {
        provinces: provinces.length,
        cities: cities.length,
        towns: towns.length,
        seoulCities: cities.filter((city) => city.provinceCode === '11').length,
      },
      null,
      2,
    ),
  )
}

main()
