import type { Region } from '../api'

const LEVEL_LABEL: Record<string, string> = {
  high_school: 'High school',
  college: 'College',
  university: 'University',
}

const LEVEL_COLOR: Record<string, string> = {
  high_school: 'var(--lvl-high-school)',
  college: 'var(--lvl-college)',
  university: 'var(--lvl-university)',
}

export const LEVELS = ['high_school', 'college', 'university'] as const

export function levelLabel(slug: string): string {
  return LEVEL_LABEL[slug] ?? slug.replace('_', ' ')
}

export function levelColor(slug: string): string {
  return LEVEL_COLOR[slug] ?? 'var(--muted)'
}

export function provinceName(code: string, regions: Region[] | undefined): string {
  return regions?.find((r) => r.code === code)?.name_en ?? code.replace('CA-', '')
}
