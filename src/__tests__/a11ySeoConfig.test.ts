import { describe, it, expect } from 'vitest'
import { readFileSync, statSync, globSync } from 'fs'

const publicDir = 'public'

describe('Sprint 52 — Accessibility & SEO fixes', () => {
  describe('A) <select> labels (htmlFor/id association)', () => {
    const selectFiles = globSync('src/components/**/*.tsx').filter((f) => {
      return readFileSync(f, 'utf-8').includes('<select')
    })

    it('all <select> elements have matching htmlFor/id', () => {
      expect(selectFiles.length).toBeGreaterThan(0)
      const badFiles: string[] = []
      for (const file of selectFiles) {
        const content = readFileSync(file, 'utf-8')
        const ids = [...content.matchAll(/<select[^>]*\sid="([^"]+)"/g)].map((m) => (m as RegExpExecArray)[1])
        for (const id of ids) {
          if (!content.includes(`htmlFor="${id}"`)) {
            badFiles.push(`${file}: missing htmlFor for id="${id}"`)
          }
        }
      }
      expect(badFiles).toEqual([])
    })
  })

  describe('B) Color contrast — no failing tokens', () => {
    const tsxFiles = globSync('src/**/*.tsx')

    it('no file contains text-stone-500 (fails WCAG AA on dark backgrounds)', () => {
      const bad = tsxFiles.filter((f) => readFileSync(f, 'utf-8').includes('text-stone-500'))
      expect(bad).toEqual([])
    })

    it('no file contains text-slate-500 (fails WCAG AA on dark backgrounds)', () => {
      const bad = tsxFiles.filter((f) => readFileSync(f, 'utf-8').includes('text-slate-500'))
      expect(bad).toEqual([])
    })

    it('no file contains text-stone-600 (fails WCAG AA on dark backgrounds)', () => {
      const bad = tsxFiles.filter((f) => readFileSync(f, 'utf-8').includes('text-stone-600'))
      expect(bad).toEqual([])
    })

    it('no standalone bg-cyan-600 (would fail AA on white text)', () => {
      const all = readFileSync('src/components/structural/LoadAnalysisPanel.tsx', 'utf-8')
      expect(all).not.toContain('bg-cyan-600 ')
    })
  })

  describe('C) <main> landmark', () => {
    it('GlobalLayout in router.tsx wraps content in <main>', () => {
      const content = readFileSync('src/app/router.tsx', 'utf-8')
      expect(content).toContain('<main>')
      expect(content).toContain('</main>')
    })
  })

  describe('D) robots.txt', () => {
    it('exists in public/', () => {
      expect(() => statSync(`${publicDir}/robots.txt`)).not.toThrow()
    })

    it('contains expected directives', () => {
      const content = readFileSync(`${publicDir}/robots.txt`, 'utf-8')
      expect(content).toContain('User-agent: *')
      expect(content).toContain('Allow: /')
      expect(content).toContain('Sitemap:')
    })
  })

  describe('E) sitemap.xml', () => {
    it('exists in public/', () => {
      expect(() => statSync(`${publicDir}/sitemap.xml`)).not.toThrow()
    })

    it('contains expected routes', () => {
      const content = readFileSync(`${publicDir}/sitemap.xml`, 'utf-8')
      expect(content).toContain('urlset')
      expect(content).toContain('https://budgetengineer.app/')
      expect(content).toContain('/new')
      expect(content).toContain('/portfolio')
      expect(content).toContain('/feedback')
    })
  })

  describe('F) Canonical URL', () => {
    it('index.html has no hardcoded <link rel="canonical">', () => {
      const content = readFileSync('index.html', 'utf-8')
      expect(content).not.toMatch(/link rel="canonical"/i)
    })
  })

  describe('G) Icon dimensions', () => {
    it('icon-192.png is properly sized (was 935 KB 1024×1024)', () => {
      const st = statSync('public/icon-192.png')
      expect(st.size).toBeLessThan(400 * 1024)
    })

    it('icon-512.png is properly sized (was 937 KB 1024×1024)', () => {
      const st = statSync('public/icon-512.png')
      expect(st.size).toBeLessThan(400 * 1024)
    })
  })
})
