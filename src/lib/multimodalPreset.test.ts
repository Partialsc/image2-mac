import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PARAMS, type ApiProfile } from '../types'
import { callImageApi } from './api'
import { ensureMultimodalProfiles, normalizeSettings } from './apiProfiles'
import { normalizeParamsForSettings } from './paramCompatibility'
import {
  createMultimodalProfiles,
  isDefaultMultimodalProfile,
  MULTIMODAL_BASE_URL,
  MULTIMODAL_CATALOG_VERSION,
  MULTIMODAL_CHAT_PROVIDER,
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
      profile.baseUrl === MULTIMODAL_BASE_URL &&
      profile.apiKey === '' &&
      (profile.provider === 'openai' ? profile.responseFormatB64Json === true : profile.provider === 'multimodal-chat'),
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
    const merged = ensureMultimodalProfiles(legacy, { enabled: true, version: 0 })

    expect(merged).toHaveLength(1 + MULTIMODAL_MODELS.length)
    expect(merged[0].apiKey).toBe('sk-kept')
    expect(merged.slice(1).every((profile) => profile.apiKey === '')).toBe(true)
  })

  it('已注入到当前目录版本或未开启 Pro 构建时不做任何改动', () => {
    const profiles = createMultimodalProfiles(600)

    expect(ensureMultimodalProfiles(profiles, { enabled: true, version: MULTIMODAL_CATALOG_VERSION })).toBe(profiles)
    expect(ensureMultimodalProfiles(profiles, { enabled: false, version: 0 })).toBe(profiles)
  })

  it('旧版本注入过的机器按版本差量补齐(如 v1 只补 banana 系)', () => {
    const v1Profiles = createMultimodalProfiles(600).filter((profile) => profile.provider === 'openai')
    const merged = ensureMultimodalProfiles(v1Profiles, { enabled: true, version: 1 })

    expect(merged).toHaveLength(MULTIMODAL_MODELS.length)
    expect(merged.filter((profile) => profile.provider === 'multimodal-chat')).toHaveLength(3)
  })

  it('已存在的同 id 配置不重复添加', () => {
    const partial = createMultimodalProfiles(600).slice(0, 2)
    const merged = ensureMultimodalProfiles(partial, { enabled: true, version: 0 })

    expect(merged).toHaveLength(MULTIMODAL_MODELS.length)
    expect(new Set(merged.map((profile) => profile.id)).size).toBe(MULTIMODAL_MODELS.length)
  })
})

describe('聊天式生图(banana 通道)', () => {
  it('banana 配置走 chat/completions 并从 content 提取 data:image', async () => {
    const bananaProfile = createMultimodalProfiles(600).find((profile) => profile.model === 'gemini-nano-banana-2.1')
    if (!bananaProfile) throw new Error('banana preset missing')
    const settings = normalizeSettings({
      customProviders: [MULTIMODAL_CHAT_PROVIDER],
      profiles: [{ ...bananaProfile, apiKey: 'test-key' }],
      activeProfileId: bananaProfile.id,
    })

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: '好的,这是图\n![image](data:image/png;base64,aW1hZ2U=)' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const result = await callImageApi({
      settings,
      prompt: '画一只熊猫',
      params: { ...DEFAULT_PARAMS },
      inputImageDataUrls: [],
    })

    expect(fetchMock.mock.calls[0][0]).toBe(`${MULTIMODAL_BASE_URL}/chat/completions`)
    const submit = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(submit.body))).toMatchObject({ model: 'gemini-nano-banana-2.1' })
    expect(result.images).toEqual(['data:image/png;base64,aW1hZ2U='])
  })
})

describe('grok 尺寸兼容', () => {
  it('grok 模型下 size:auto 替换为 1024x1024,gpt 模型保持 auto', () => {
    const grokProfile: ApiProfile = { ...createMultimodalProfiles(600)[3], apiKey: 'test-key' }
    const gptProfile: ApiProfile = { ...createMultimodalProfiles(600)[0], apiKey: 'test-key' }
    const grokSettings = normalizeSettings({ profiles: [grokProfile], activeProfileId: grokProfile.id })
    const gptSettings = normalizeSettings({ profiles: [gptProfile], activeProfileId: gptProfile.id })

    expect(normalizeParamsForSettings({ ...DEFAULT_PARAMS, size: 'auto' }, grokSettings).size).toBe('1024x1024')
    expect(normalizeParamsForSettings({ ...DEFAULT_PARAMS, size: 'auto' }, gptSettings).size).toBe('auto')
  })
})
