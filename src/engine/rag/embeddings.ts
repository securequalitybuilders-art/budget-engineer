export const EMBEDDING_DIM = 256

function fnv1a(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function tokenize(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? []
  return tokens
}

export function tokenizeWithBigrams(text: string): string[] {
  const tokens = tokenize(text)
  const bigrams: string[] = []
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]}_${tokens[i + 1]}`)
  }
  return [...tokens, ...bigrams]
}

export function embedText(text: string, dim: number = EMBEDDING_DIM): number[] {
  const vec = new Array<number>(dim).fill(0)
  for (const token of tokenizeWithBigrams(text)) {
    const h = fnv1a(token)
    const idx = h % dim
    const sign = h & 1 ? 1 : -1
    vec[idx] += sign
  }
  return normalize(vec)
}

export function normalize(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return vec
  return vec.map((v) => v / magnitude)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let aMag = 0
  let bMag = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    aMag += a[i] * a[i]
    bMag += b[i] * b[i]
  }
  const denom = Math.sqrt(aMag) * Math.sqrt(bMag)
  if (denom === 0) return 0
  return dot / denom
}

export function embedQuery(query: string, dim: number = EMBEDDING_DIM): number[] {
  return embedText(query, dim)
}
