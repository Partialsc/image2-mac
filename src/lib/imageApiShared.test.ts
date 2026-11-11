import { describe, expect, it } from 'vitest'
import { sanitizeApiKeyOrThrow } from './imageApiShared'

describe('sanitizeApiKeyOrThrow', () => {
  it('原样保留合法 Key', () => {
    expect(sanitizeApiKeyOrThrow('sk-abcDEF123')).toBe('sk-abcDEF123')
  })

  it('剔除复制混入的空白、全角空格与零宽字符', () => {
    expect(sanitizeApiKeyOrThrow(' sk-abc\u00A0\u3000def\u200B\uFEFF ')).toBe('sk-abcdef')
  })

  it('清理后仍含中文等非英文字符时抛出明确错误', () => {
    expect(() => sanitizeApiKeyOrThrow('密钥：sk-abc')).toThrow('非英文字符')
  })
})
