import { beforeEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { migrate } from './migrations'
import { SqliteCatalogRepository } from './repositories'
import { SqlitePlaylistRepository } from './playlist-repository'
import type { Clock } from '../../core/ports'

const fixedClock: Clock = { now: () => new Date('2026-07-08T15:00:00Z') }

let db: DatabaseSync
let playlists: SqlitePlaylistRepository
let catalog: SqliteCatalogRepository

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  migrate(db)
  playlists = new SqlitePlaylistRepository(db)
  catalog = new SqliteCatalogRepository(db, fixedClock)
  catalog.upsertChannel({ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null })
  addVideo('v1', '2026-07-01T00:00:00Z', 'thumb-1', 100)
  addVideo('v2', '2026-07-02T00:00:00Z', 'thumb-2', 200)
  addVideo('v3', '2026-07-03T00:00:00Z', null, 300)
})

function addVideo(
  videoId: string,
  publishedAt: string,
  thumbnailUrl: string | null,
  durationSeconds: number
): void {
  catalog.upsertVideo(
    {
      videoId,
      channelId: 'UCa',
      title: `Video ${videoId}`,
      publishedAt,
      durationSeconds,
      thumbnailUrl,
      viewCount: null,
      isShort: false,
      liveContent: 'none',
      liveStartedAt: null,
      liveEndedAt: null,
      isPremiere: false
    },
    fixedClock.now().toISOString()
  )
}

const NOW = fixedClock.now().toISOString()

describe('SqlitePlaylistRepository', () => {
  it('creates a playlist and lists it back', () => {
    const created = playlists.createPlaylist('p1', 'Chill', 'Relaxing videos', NOW)
    expect(created).toEqual({
      playlistId: 'p1',
      name: 'Chill',
      description: 'Relaxing videos',
      createdAt: NOW,
      updatedAt: NOW
    })
    const list = playlists.listPlaylists()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      playlistId: 'p1',
      name: 'Chill',
      videoCount: 0,
      totalDurationSeconds: 0,
      thumbnailUrls: []
    })
  })

  it('newest-created first', () => {
    playlists.createPlaylist('p1', 'First', null, '2026-07-01T00:00:00Z')
    playlists.createPlaylist('p2', 'Second', null, '2026-07-02T00:00:00Z')
    expect(playlists.listPlaylists().map((p) => p.playlistId)).toEqual(['p2', 'p1'])
  })

  it('updates name and description, returning null for an unknown playlist', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    const updated = playlists.updatePlaylist('p1', 'Chiller', 'Now with a description', NOW)
    expect(updated).toEqual({
      playlistId: 'p1',
      name: 'Chiller',
      description: 'Now with a description',
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(playlists.updatePlaylist('missing', 'x', null, NOW)).toBeNull()
  })

  it('adds videos, computes video count/duration, and orders by position', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    playlists.addVideoToPlaylist('p1', 'v2', NOW)
    const summary = playlists.listPlaylists()[0]
    expect(summary.videoCount).toBe(2)
    expect(summary.totalDurationSeconds).toBe(300)
    expect(playlists.listPlaylistVideos('p1').map((e) => e.video.videoId)).toEqual(['v1', 'v2'])
  })

  it('adding the same video twice is idempotent (no duplicate membership)', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    expect(playlists.listPlaylistVideos('p1')).toHaveLength(1)
  })

  it('removes a video without touching the video itself or other members', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    playlists.addVideoToPlaylist('p1', 'v2', NOW)
    playlists.removeVideoFromPlaylist('p1', 'v1')
    expect(playlists.listPlaylistVideos('p1').map((e) => e.video.videoId)).toEqual(['v2'])
  })

  it('composite thumbnail: skips videos with no thumbnail, caps at MAX_PLAYLIST_THUMBS', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW) // thumb-1
    playlists.addVideoToPlaylist('p1', 'v3', NOW) // no thumbnail yet
    playlists.addVideoToPlaylist('p1', 'v2', NOW) // thumb-2
    const summary = playlists.listPlaylists()[0]
    expect(summary.thumbnailUrls).toEqual(['thumb-1', 'thumb-2'])
  })

  it('reorders a playlist, ignoring ids no longer in it', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    playlists.addVideoToPlaylist('p1', 'v2', NOW)
    playlists.addVideoToPlaylist('p1', 'v3', NOW)
    playlists.reorderPlaylist('p1', ['v3', 'v1', 'v2'])
    expect(playlists.listPlaylistVideos('p1').map((e) => e.video.videoId)).toEqual(['v3', 'v1', 'v2'])
  })

  it('lists every playlist a video currently belongs to', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.createPlaylist('p2', 'Focus', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    playlists.addVideoToPlaylist('p2', 'v1', NOW)
    expect(new Set(playlists.listPlaylistsForVideo('v1'))).toEqual(new Set(['p1', 'p2']))
    expect(playlists.listPlaylistsForVideo('v2')).toEqual([])
  })

  it('deleting a playlist drops its membership rows but keeps the videos', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    playlists.deletePlaylist('p1')
    expect(playlists.listPlaylists()).toEqual([])
    expect(playlists.listPlaylistsForVideo('v1')).toEqual([])
    expect(catalog.countVideos()).toBe(3)
  })

  it('getPlaylistSummary narrows to one playlist', () => {
    playlists.createPlaylist('p1', 'Chill', null, NOW)
    playlists.createPlaylist('p2', 'Focus', null, NOW)
    playlists.addVideoToPlaylist('p1', 'v1', NOW)
    expect(playlists.getPlaylistSummary('p1')?.videoCount).toBe(1)
    expect(playlists.getPlaylistSummary('p2')?.videoCount).toBe(0)
    expect(playlists.getPlaylistSummary('missing')).toBeNull()
  })
})
