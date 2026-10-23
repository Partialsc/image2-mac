import type { ApiProfile, CustomProviderDefinition } from '../types'

export const VIBELEARNING_PROVIDER_ID = 'vibelearning'
export const VIBELEARNING_PROFILE_ID = 'default-vibelearning'
export const VIBELEARNING_BASE_URL = 'https://api.vibelearning.top/v1'

const JOBS_URL = 'https://api.vibelearning.top/api/image/jobs'

export const VIBELEARNING_PROVIDER: CustomProviderDefinition = {
  id: VIBELEARNING_PROVIDER_ID,
  name: 'VibeLearning 图片任务',
  template: 'http-image',
  submit: {
    path: JOBS_URL,
    method: 'POST',
    contentType: 'json',
    body: {
      endpoint: 'images/generations',
      body: {
        model: '$profile.model',
        prompt: '$prompt',
        n: '$params.n',
        size: '$params.size',
        quality: '$params.quality',
        output_format: '$params.output_format',
        output_compression: '$params.output_compression',
      },
    },
    taskIdPath: 'job_id',
  },
  editSubmit: {
    path: JOBS_URL,
    method: 'POST',
    contentType: 'json',
    body: {
      endpoint: 'images/edits',
      body: {
        model: '$profile.model',
        prompt: '$prompt',
        images: '$inputImages.items',
        mask: '$mask.item',
        n: '$params.n',
        size: '$params.size',
        quality: '$params.quality',
        output_format: '$params.output_format',
        output_compression: '$params.output_compression',
      },
    },
    taskIdPath: 'job_id',
  },
  poll: {
    path: `${JOBS_URL}/{task_id}`,
    method: 'GET',
    intervalSeconds: 5,
    statusPath: 'status',
    successValues: ['succeeded'],
    failureValues: ['failed', 'timeout'],
    errorPath: 'error',
    result: {
      imageUrlPaths: ['result.data.*.url'],
      b64JsonPaths: ['result.data.*.b64_json'],
    },
  },
}

export function createVibeLearningProfile(apiKey: string, timeout: number): ApiProfile {
  return {
    id: VIBELEARNING_PROFILE_ID,
    name: 'VibeLearning',
    provider: VIBELEARNING_PROVIDER_ID,
    baseUrl: VIBELEARNING_BASE_URL,
    apiKey,
    model: 'gpt-image-2',
    timeout,
    apiMode: 'images',
    codexCli: false,
    apiProxy: false,
    responseFormatB64Json: false,
    streamImages: false,
    streamPartialImages: 1,
  }
}
