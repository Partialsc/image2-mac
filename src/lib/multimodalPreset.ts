import type { ApiProfile } from '../types'

// VibeLearning Pro(multimodal.vibelearning.top)内置模型预设。
// 该站为标准 OpenAI 兼容 images 接口(POST /v1/images/generations,同步返回 data[0].url),
// 按次计费:gpt 系 $0.15/张、grok 系 $0.04~$0.08/张(2026-10 实测价格,详见站点 /docs)。
// 同一站不同分组用不同 Key:gpt 系需 adobe-image2.5 分组,grok 系需 grok 分组。
// banana(Gemini)系模型走 chat 接口,不在本预设内。
export const MULTIMODAL_BASE_URL = 'https://multimodal.vibelearning.top/v1'
export const MULTIMODAL_PROFILE_PREFIX = 'multimodal-'

export interface MultimodalModelPreset {
  id: string
  name: string
  model: string
}

export const MULTIMODAL_MODELS: MultimodalModelPreset[] = [
  { id: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare', model: 'gpt-image-2.5-flare' },
  { id: 'gpt-image-2.5-sunburst', name: 'GPT Image 2.5 Sunburst', model: 'gpt-image-2.5-sunburst' },
  { id: 'gpt-image-2', name: 'GPT Image 2', model: 'gpt-image-2' },
  { id: 'grok-imagine-image', name: 'Grok Imagine Image', model: 'grok-imagine-image' },
  { id: 'grok-imagine-image-2.0', name: 'Grok Imagine 2.0', model: 'grok-imagine-image-2.0' },
  { id: 'grok-imagine-image-quality', name: 'Grok Imagine Quality', model: 'grok-imagine-image-quality' },
]

export const MULTIMODAL_DEFAULT_PROFILE_ID = `${MULTIMODAL_PROFILE_PREFIX}${MULTIMODAL_MODELS[0].id}`

export function createMultimodalProfiles(timeout: number): ApiProfile[] {
  return MULTIMODAL_MODELS.map((preset) => ({
    id: `${MULTIMODAL_PROFILE_PREFIX}${preset.id}`,
    name: preset.name,
    provider: 'openai',
    baseUrl: MULTIMODAL_BASE_URL,
    apiKey: '',
    model: preset.model,
    timeout,
    apiMode: 'images',
    codexCli: false,
    apiProxy: false,
    responseFormatB64Json: true,
    streamImages: false,
    streamPartialImages: 1,
  }))
}

// 判断是否为未填 Key 的出厂 multimodal 配置,用于导入配置时的"全新未动过"判定
export function isDefaultMultimodalProfile(profile: ApiProfile): boolean {
  const preset = MULTIMODAL_MODELS.find((item) => `${MULTIMODAL_PROFILE_PREFIX}${item.id}` === profile.id)
  if (!preset) return false
  return profile.provider === 'openai' &&
    profile.baseUrl === MULTIMODAL_BASE_URL &&
    profile.apiKey === '' &&
    profile.model === preset.model
}
