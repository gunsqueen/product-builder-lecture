export const normalizeAdminName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, '')
    .replace(/특별자치시/g, '시')
    .replace(/특별자치도/g, '도')
    .replace(/특별시/g, '시')
    .replace(/광역시/g, '시')
    .replace(/제/g, '')

export const buildNameAliases = (name: string) => {
  const base = name.trim()
  const aliases = new Set<string>([base])
  aliases.add(base.replace(/제(\d+)동/g, '$1동'))
  aliases.add(base.replace(/(\d+)동/g, `제$1동`))
  aliases.add(base.replace(/\s+/g, ''))
  return [...aliases]
}
