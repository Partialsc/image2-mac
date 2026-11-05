import type { ApiProfile, CustomProviderDefinition } from '../types'

// VibeLearning Pro(multimodal.vibelearning.top)内置模型预设。
// 图片接口模型(POST /v1/images/generations,同步返回):gpt 系 $0.15/张、grok 系 $0.04~$0.08/张
// 聊天接口模型(POST /v1/chat/completions,content 里返回 data:image base64):banana 系 $0.12~$0.15/张
// 同一站不同分组用不同 Key(2026-11 实测,详见站点 /docs)
export const MULTIMODAL_BASE_URL = 'https://multimodal.vibelearning.top/v1'
export const MULTIMODAL_PROFILE_PREFIX = 'multimodal-'
export const MULTIMODAL_CHAT_PROVIDER_ID = 'multimodal-chat'

// 内置配置目录版本:目录新增模型时 +1,老安装据此补齐增量(见 ensureMultimodalProfiles)
export const MULTIMODAL_CATALOG_VERSION = 2

// 聊天式生图服务商(grok/banana 等不走图片接口的模型走这里)
export const MULTIMODAL_CHAT_PROVIDER: CustomProviderDefinition = {
  id: MULTIMODAL_CHAT_PROVIDER_ID,
  name: 'Multimodal 聊天生图',
  template: 'chat-image',
  submit: {
    path: 'chat/completions',
    method: 'POST',
    contentType: 'json',
    body: {},
  },
}

export interface MultimodalModelPreset {
  id: string
  name: string
  model: string
  /** 走图片接口(openai)还是聊天接口(multimodal-chat) */
  channel: 'images' | 'chat'
}

export const MULTIMODAL_MODELS: MultimodalModelPreset[] = [
  { id: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare', model: 'gpt-image-2.5-flare', channel: 'images' },
  { id: 'gpt-image-2.5-sunburst', name: 'GPT Image 2.5 Sunburst', model: 'gpt-image-2.5-sunburst', channel: 'images' },
  { id: 'gpt-image-2', name: 'GPT Image 2', model: 'gpt-image-2', channel: 'images' },
  { id: 'grok-imagine-image', name: 'Grok Imagine Image', model: 'grok-imagine-image', channel: 'images' },
  { id: 'grok-imagine-image-2.0', name: 'Grok Imagine 2.0', model: 'grok-imagine-image-2.0', channel: 'images' },
  { id: 'grok-imagine-image-quality', name: 'Grok Imagine Quality', model: 'grok-imagine-image-quality', channel: 'images' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', model: 'gemini-3-pro-image-preview', channel: 'chat' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', model: 'gemini-3.1-flash-image-preview', channel: 'chat' },
  { id: 'gemini-nano-banana-2.1', name: 'Nano Banana 2.1', model: 'gemini-nano-banana-2.1', channel: 'chat' },
]

export const MULTIMODAL_DEFAULT_PROFILE_ID = `${MULTIMODAL_PROFILE_PREFIX}${MULTIMODAL_MODELS[0].id}`

export function createMultimodalProfiles(timeout: number): ApiProfile[] {
  return MULTIMODAL_MODELS.map((preset) => ({
    id: `${MULTIMODAL_PROFILE_PREFIX}${preset.id}`,
    name: preset.name,
    provider: preset.channel === 'chat' ? MULTIMODAL_CHAT_PROVIDER_ID : 'openai',
    baseUrl: MULTIMODAL_BASE_URL,
    apiKey: '',
    model: preset.model,
    timeout,
    apiMode: 'images',
    codexCli: false,
    apiProxy: false,
    responseFormatB64Json: preset.channel === 'images',
    streamImages: false,
    streamPartialImages: 1,
  }))
}

// 判断是否为未填 Key 的出厂 multimodal 配置,用于导入配置时的"全新未动过"判定
export function isDefaultMultimodalProfile(profile: ApiProfile): boolean {
  const preset = MULTIMODAL_MODELS.find((item) => `${MULTIMODAL_PROFILE_PREFIX}${item.id}` === profile.id)
  if (!preset) return false
  const expectedProvider = preset.channel === 'chat' ? MULTIMODAL_CHAT_PROVIDER_ID : 'openai'
  return profile.provider === expectedProvider &&
    profile.baseUrl === MULTIMODAL_BASE_URL &&
    profile.apiKey === '' &&
    profile.model === preset.model
}
