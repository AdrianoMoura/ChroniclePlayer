# Chronicle export format

The promise is **"you can leave with everything."** Settings → Data → *Export data…*
produces one JSON file containing every piece of data Chronicle holds about you.
(The SQLite file at `~/.local/share/chronicle/chronicle.db` — or the platform
equivalent — is also a legitimate backup artifact.)

## Envelope

```json
{
  "format": "chronicle-export",
  "formatVersion": 1,
  "exportedAt": "2026-07-11T19:20:00.000Z",
  "settings": { … },
  "channels": [ … ],
  "videos": [ … ],
  "videoStates": [ … ]
}
```

- `formatVersion` is bumped only on breaking shape changes; additive fields may appear
  at any time.
- All timestamps are ISO-8601 UTC.

## `settings`

The contents of `settings.json` at export time:
`theme` (`system`/`dark`/`light`), `density` (`comfortable`/`compact`),
`refreshMinutes` (integer; `0` = manual only), `showViewCounts` (boolean).

## `channels[]`

| field | type | meaning |
|---|---|---|
| `channelId` | string | YouTube channel id (`UC…`) |
| `title` | string | channel title at last sync |
| `subscribed` | boolean | `false` = unsubscribed on YouTube (or externally-opened video's channel) — data retained by design |

## `videos[]` (facts from YouTube — re-fetchable)

| field | type | meaning |
|---|---|---|
| `videoId` | string | YouTube video id |
| `channelId` | string | owning channel |
| `title` | string | title at last fetch |
| `publishedAt` | string | publish timestamp (feed sort key) |
| `durationSeconds` | number \| null | null = never hydrated |
| `isShort` | boolean \| null | D-028 verdict; null = unknown/pending |

## `videoStates[]` (your data — the precious part)

One entry per video you ever touched (absence = default unread, no flags).

| field | type | meaning |
|---|---|---|
| `videoId` | string | join key into `videos[]` |
| `readStatus` | `"unread"` \| `"read"` \| `"ignored"` | D-010 status |
| `favorite` | boolean | orthogonal flag |
| `watchLater` | boolean | orthogonal flag |
| `watchLaterPos` | number \| null | queue order; null when not queued |
| `statusChangedAt` | string | last read-status change |
| `updatedAt` | string | last touch of the row |

## Import / restore

Planned post-MVP (`local-data.md` §Export/import): states are restored by `videoId`
match; an imported state wins only when its `statusChangedAt` is newer. The format
above is already stable for that purpose.
