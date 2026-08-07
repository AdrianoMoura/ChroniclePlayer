import { describe, expect, it } from 'vitest'
import type { ChannelDto } from '../ipc/contract'
import { sortChannels } from './Sidebar'

function channel(overrides: Partial<ChannelDto> & { channelId: string }): ChannelDto {
  return {
    title: overrides.channelId,
    thumbnailUrl: null,
    unreadCount: 0,
    favorite: false,
    notify: false,
    latestPublishedAt: null,
    ...overrides
  }
}

describe('sortChannels', () => {
  const channels: ChannelDto[] = [
    channel({
      channelId: 'a',
      title: 'Zeta',
      favorite: true,
      unreadCount: 1,
      latestPublishedAt: '2026-07-01T00:00:00Z'
    }),
    channel({
      channelId: 'b',
      title: 'Alpha',
      favorite: false,
      unreadCount: 5,
      latestPublishedAt: '2026-07-08T00:00:00Z'
    }),
    channel({
      channelId: 'c',
      title: 'Mid',
      favorite: false,
      unreadCount: 3,
      latestPublishedAt: null
    })
  ]

  it('favorites mode passes the input order through unchanged', () => {
    expect(sortChannels(channels, 'favorites')).toEqual(channels)
  })

  it('recent mode orders by most recent video first, nulls last', () => {
    expect(sortChannels(channels, 'recent').map((c) => c.channelId)).toEqual(['b', 'a', 'c'])
  })

  it('unread mode orders by most unread videos first', () => {
    expect(sortChannels(channels, 'unread').map((c) => c.channelId)).toEqual(['b', 'c', 'a'])
  })

  it('name mode orders alphabetically', () => {
    expect(sortChannels(channels, 'name').map((c) => c.channelId)).toEqual(['b', 'c', 'a'])
  })
})
