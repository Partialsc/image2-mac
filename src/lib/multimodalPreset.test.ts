import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PARAMS } from '../types'
import { callImageApi } from './api'
import { ensureMultimodalProfiles, normalizeSettings } from './apiProfiles'
import {
  createMultimodalProfiles,
  isDefaultMultimodalProfile,
  MULTIMODAL_BASE_URL,
  MULTIMODAL_DEFAULT_PROFILE_ID,
  MULTIMODAL_MODELS,
} from './multimodalPreset'

const createSettings = () => normalizeSettings({
  profiles: createMultimodalProfiles(600).map((profile) => ({ ...profile, apiKey: 'test-key' })),
  activeProfileId: MULTIMODAL_DEFAULT_PROFILE_ID,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Multimodal Pro 预设', () => {
  it('为每个模型内置一条独立配置,Key 留空待填', () => {
    const profiles = createMultimodalProfiles(600)

    expect(profiles).toHaveLength(MULTIMODAL_MODELS.length)
    expect(new Set(profiles.map((profile) => profile.model)).size).toBe(MULTIMODAL_MODELS.length)
    expect(profiles.every((profile) =>
      profile.provider === 'openai' &&
      profile.baseUrl === MULTIMODAL_BASE_URL &&
      profile.apiKey === '' &&
      profile.responseFormatB64Json === true,
    )).toBe(true)
  })

  it('走标准 OpenAI images 接口并请求 b64_json 直返', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ b64_json: 'aW1hZ2U=' }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const result = await callImageApi({
      settings: createSettings(),
      prompt: 'a red apple',
      params: { ...DEFAULT_PARAMS, size: '2048x2048' },
      inputImageDataUrls: [],
    })

    expect(fetchMock.mock.calls[0][0]).toBe(`${MULTIMODAL_BASE_URL}/images/generations`)
    const submit = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(submit.body))).toMatchObject({
      model: 'gpt-image-2.5-flare',
      response_format: 'b64_json',
      size: '2048x2048',
    })
    expect(result.images).toEqual(['data:image/png;base64,aW1hZ2U='])
  })

  it('isDefaultMultimodalProfile 只认未填 Key 的出厂配置', () => {
    const [first, ...rest] = createMultimodalProfiles(600)

    expect(isDefaultMultimodalProfile(first)).toBe(true)
    expect(isDefaultMultimodalProfile({ ...first, apiKey: 'sk-xxx' })).toBe(false)
    expect(isDefaultMultimodalProfile({ ...first, baseUrl: 'https://api.openai.com/v1' })).toBe(false)
    expect(isDefaultMultimodalProfile({ ...first, id: 'other-profile' })).toBe(false)
    expect(rest.every((profile) => isDefaultMultimodalProfile(profile))).toBe(true)
  })
})

describe('ensureMultimodalProfiles', () => {
  it('Pro 构建首次运行时为旧数据机器补齐内置配置,不动原有配置', () => {
    const legacy = [{ ...createMultimodalProfiles(600)[0], id: 'legacy-profile', name: '旧配置', apiKey: 'sk-kept' }]
    const merged = ensureMultimodalProfiles(legacy, { enabled: true, injected: false })

    expect(merged).toHaveLength(1 + MULTIMODAL_MODELS.length)
    expect(merged[0].apiKey).toBe('sk-kept')
    expect(merged.slice(1).every((profile) => profile.apiKey === '')).toBe(true)
  })

  it('已注入过或未开启 Pro 构建时不做任何改动', () => {
    const profiles = createMultimodalProfiles(600)

    expect(ensureMultimodalProfiles(profiles, { enabled: true, injected: true })).toBe(profiles)
    expect(ensureMultimodalProfiles(profiles, { enabled: false, injected: false })).toBe(profiles)
  })

  it('已存在的同 id 配置不重复添加', () => {
    const partial = createMultimodalProfiles(600).slice(0, 2)
    const merged = ensureMultimodalProfiles(partial, { enabled: true, injected: false })

    expect(merged).toHaveLength(MULTIMODAL_MODELS.length)
    expect(new Set(merged.map((profile) => profile.id)).size).toBe(MULTIMODAL_MODELS.length)
  })
})
