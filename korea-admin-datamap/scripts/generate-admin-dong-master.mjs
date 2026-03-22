import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT_DIR = process.cwd()
const ADMIN_DIR = path.join(ROOT_DIR, 'src', 'data', 'admin')
const CITIES_PATH = path.join(ADMIN_DIR, 'cities.json')
const TOWNS_PATH = path.join(ADMIN_DIR, 'towns.json')
const LEGACY_TOWN_ALIASES_PATH = path.join(ADMIN_DIR, 'legacyTownAliases.json')
const ADMIN_DONG_LEGAL_MAPPINGS_PATH = path.join(ADMIN_DIR, 'adminDongLegalMappings.json')

const MOIS_JSCODE_URL =
  'https://www.mois.go.kr/cmm/fms/FileDown.do?atchFileId=FILE_00143231yq-fGyn&fileSn=1'
const H_FILENAME = 'KIKcd_H.20260301'
const MIX_FILENAME = 'KIKmix.20260301'

const cities = JSON.parse(fs.readFileSync(CITIES_PATH, 'utf8'))

const cityCenterByCode = new Map(cities.map((city) => [city.cityCode, city.center]))

const inferTownType = (name) => {
  if (name.endsWith('읍')) {
    return 'eup'
  }

  if (name.endsWith('면')) {
    return 'myeon'
  }

  return 'dong'
}

const splitPaddedFields = (value) =>
  value
    .split(/\s{2,}/)
    .map((segment) => segment.trim())
    .filter((segment, index, list) => segment.length > 0 || index < list.length - 1)

const parseHRow = (line) => {
  const match = line.match(/^(\d{10})(.*?)(\d{8})(?:\s+(\d{8}))?\s*$/)

  if (!match) {
    return null
  }

  const [, adminDongCode, paddedFields, createdDate, deletedDate = ''] = match
  const [provinceName = '', cityName = '', adminDongName = ''] = splitPaddedFields(paddedFields)

  return {
    adminDongCode,
    provinceName,
    cityName,
    adminDongName,
    createdDate,
    deletedDate,
  }
}

const parseMixRow = (line) => {
  const match = line.match(/^(\d{10})(.*?)(\d{10})\s+(.+?)\s+(\d{8})(?:\s+(\d{8}))?\s*$/)

  if (!match) {
    return null
  }

  const [
    ,
    adminDongCode,
    paddedFields,
    legalDongCode,
    legalDongName,
    createdDate,
    deletedDate = '',
  ] = match
  const [provinceName = '', cityName = '', adminDongName = ''] = splitPaddedFields(paddedFields)

  return {
    adminDongCode,
    provinceName,
    cityName,
    adminDongName,
    legalDongCode,
    legalDongName: legalDongName.trim(),
    createdDate,
    deletedDate,
  }
}

const toSlug = (value, fallback) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '')
    .trim() || fallback

const main = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'korea-admin-dong-'))
  const zipPath = path.join(tempDir, 'jscode.zip')

  execSync(`curl -L -k -s '${MOIS_JSCODE_URL}' -o '${zipPath}'`, {
    stdio: 'inherit',
  })

  const hText = execSync(
    `unzip -p '${zipPath}' '${H_FILENAME}' | iconv -f CP949 -t UTF-8`,
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  const mixText = execSync(
    `unzip -p '${zipPath}' '${MIX_FILENAME}' | iconv -f CP949 -t UTF-8`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )

  const hRows = hText
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .map(parseHRow)
    .filter(Boolean)
    .filter(
      (row) =>
        row.adminDongCode &&
        row.adminDongName &&
        /^\d{8}$/.test(row.createdDate) &&
        !row.deletedDate,
    )

  const mixRows = mixText
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .map(parseMixRow)
    .filter(Boolean)
    .filter(
      (row) =>
        row.adminDongCode &&
        row.adminDongName &&
        row.legalDongCode &&
        /^\d{10}$/.test(row.legalDongCode) &&
        /^\d{8}$/.test(row.createdDate) &&
        !row.deletedDate,
    )

  const legalCodesByAdminDong = new Map()
  mixRows.forEach((row) => {
    const current = legalCodesByAdminDong.get(row.adminDongCode) ?? []
    current.push(row)
    legalCodesByAdminDong.set(row.adminDongCode, current)
  })

  const towns = hRows
    .map((row) => {
      const cityCode = row.adminDongCode.slice(0, 5)
      const provinceCode = row.adminDongCode.slice(0, 2)
      const legalRows = legalCodesByAdminDong.get(row.adminDongCode) ?? []
      const legalDongCodes = [...new Set(legalRows.map((item) => item.legalDongCode))]

      return {
        townCode: row.adminDongCode,
        adminDongCode: row.adminDongCode,
        cityCode,
        provinceCode,
        legalDongCode: legalDongCodes[0] ?? row.adminDongCode,
        legalDongCodes,
        name: row.adminDongName,
        shortName: row.adminDongName,
        slug: toSlug(row.adminDongName, `town-${row.adminDongCode}`),
        townType: inferTownType(row.adminDongName),
        center: cityCenterByCode.get(cityCode) ?? [36.2, 127.8],
        hasBoundary: false,
      }
    })
    .sort((left, right) => left.townCode.localeCompare(right.townCode))

  const legacyTownAliases = towns
    .map((town) => ({
      ...town,
      townCode: town.townCode.slice(0, 8),
    }))
    .sort((left, right) => left.townCode.localeCompare(right.townCode))

  const adminDongLegalMappings = mixRows
    .map((row) => ({
      adminDongCode: row.adminDongCode,
      provinceCode: row.adminDongCode.slice(0, 2),
      cityCode: row.adminDongCode.slice(0, 5),
      adminDongName: row.adminDongName,
      legalDongCode: row.legalDongCode,
      legalDongName: row.legalDongName,
    }))
    .sort((left, right) => {
      if (left.adminDongCode === right.adminDongCode) {
        return left.legalDongCode.localeCompare(right.legalDongCode)
      }

      return left.adminDongCode.localeCompare(right.adminDongCode)
    })

  fs.writeFileSync(TOWNS_PATH, `${JSON.stringify(towns, null, 2)}\n`)
  fs.writeFileSync(LEGACY_TOWN_ALIASES_PATH, `${JSON.stringify(legacyTownAliases, null, 2)}\n`)
  fs.writeFileSync(
    ADMIN_DONG_LEGAL_MAPPINGS_PATH,
    `${JSON.stringify(adminDongLegalMappings, null, 2)}\n`,
  )

  fs.rmSync(tempDir, { recursive: true, force: true })

  console.log(
    JSON.stringify(
      {
        towns: towns.length,
        mappings: adminDongLegalMappings.length,
        gangseoCount: towns.filter((town) => town.cityCode === '11500').length,
        suwonJanganCount: towns.filter((town) => town.cityCode === '41111').length,
      },
      null,
      2,
    ),
  )
}

main()
