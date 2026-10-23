import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PARAMS } from '../types'
import { callImageApi } from './api'
import { normalizeSettings } from './apiProfiles'
import {
  createVibeLearningProfile,
  VIBELEARNING_PROFILE_ID,
  VIBELEARNING_PROVIDER,
} from './vibeLearning'

const createSettings = () => normalizeSettings({
  customProviders: [VIBELEARNING_PROVIDER],
  profiles: [createVibeLearningProfile('test-key', 600)],
  activeProfileId: VIBELEARNING_PROFILE_ID,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('VibeLearning 图片任务', () => {
  it('submits images/generations and polls the job result', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        job_id: 'job-1',
        status: 'queued',
        success: true,
      }), { status: 202, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        job_id: 'job-1',
        status: 'succeeded',
        success: true,
        result: { data: [{ b64_json: 'aW1hZ2U=' }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const result = await callImageApi({
      settings: createSettings(),
      prompt: '画一个红色圆形',
      params: { ...DEFAULT_PARAMS, size: '1024x1024', quality: 'low' },
      inputImageDataUrls: [],
    })

    expect(result.images).toEqual(['data:image/png;base64,aW1hZ2U='])
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.vibelearning.top/api/image/jobs',
      'https://api.vibelearning.top/api/image/jobs/job-1',
    ])

    const submit = fetchMock.mock.calls[0][1] as RequestInit
    expect(submit.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(submit.body))).toEqual({
      endpoint: 'images/generations',
      body: {
        model: 'gpt-image-2',
        prompt: '画一个红色圆形',
        n: 1,
        size: '1024x1024',
        quality: 'low',
        output_format: 'png',
      },
    })
  })

  it('submits input images and a mask to images/edits', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ job_id: 'job-edit' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 'succeeded',
        result: { data: [{ b64_json: 'ZWRpdGVk' }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await callImageApi({
      settings: createSettings(),
      prompt: '把背景改成蓝色',
      params: { ...DEFAULT_PARAMS, size: '1024x1024' },
      inputImageDataUrls: [
        'data:image/png;base64,aW1hZ2Ux',
        'data:image/jpeg;base64,aW1hZ2Uy',
      ],
      maskDataUrl: 'data:image/png;base64,bWFzaw==',
    })

    const submit = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(submit.body))).toMatchObject({
      endpoint: 'images/edits',
      body: {
        prompt: '把背景改成蓝色',
        images: [
          { data_url: 'data:image/png;base64,aW1hZ2Ux', filename: 'input-1.png' },
          { data_url: 'data:image/jpeg;base64,aW1hZ2Uy', filename: 'input-2.jpg' },
        ],
        mask: { data_url: 'data:image/png;base64,bWFzaw==', filename: 'mask.png' },
      },
    })
  })
})
