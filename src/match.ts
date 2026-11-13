const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const wantsKeyword = (text: string, keyword: string): boolean =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${escape(keyword)}([^\\p{L}\\p{N}]|$)`, 'iu').test(text)

export const isCallout = (caption: string, keyword: string): boolean =>
  new RegExp(`comment\\s+["“']?${escape(keyword)}(?![\\p{L}\\p{N}])`, 'iu').test(caption)

export const isDone = (text: string): boolean => /^\s*(i\s+)?(done|followed)\b/i.test(text)

export const pick = <T>(items: readonly T[], random: () => number = Math.random): T => {
  const item = items[Math.min(items.length - 1, Math.floor(random() * items.length))]
  if (item === undefined) throw new Error('pick needs at least one item')
  return item
}
