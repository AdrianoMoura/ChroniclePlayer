import type { CatalogRepository, Clock, StateRepository } from '../core/ports'

interface ShortsRepository {
  setShortStatus(videoId: string, isShort: boolean): void
}

// M1: deterministic fake data so the feed experience can be exercised fully
// offline (roadmap.md). Dev-only — never runs in a packaged app — and only
// seeds an empty database. Same seed → same data on every machine.

const CHANNEL_NAMES = [
  'Practical Engineering',
  'Baumgartner Restoration',
  'Technology Connections',
  'Perun',
  'Ambience Lab',
  'Slow TV Railways',
  'Kitchen Alchemy',
  'Retro Computing Corner',
  'Deep Sky Astronomy',
  'The Map Room',
  'Woodcraft Journal',
  'Analog Synth Diary',
  'Field Recordings BR',
  'Café com Código',
  'Oficina do Tempo',
  'História em Camadas',
  'Numismática Viva',
  'Trilhas & Serras',
  'Física de Boteco',
  'Marcenaria Fina',
  'Observatório Econômico',
  'Linux à Moda da Casa',
  'Xadrez Posicional',
  'Documentários do Cerrado'
]

const TITLE_LEADS = [
  'Why', 'How', 'Inside', 'Rebuilding', 'Understanding', 'The truth about',
  'A quiet look at', 'Notes on', 'Revisiting', 'What happened to'
]

const TITLE_SUBJECTS = [
  'the 1972 flood barrier', 'a 19th-century oil painting', 'heat pump defrost cycles',
  'logistics in long wars', 'rain on a tin roof', 'the Bergen line in winter',
  'sourdough hydration', 'the Amiga 500 floppy drive', 'the Orion nebula',
  'medieval trade routes', 'hand-cut dovetails', 'the Juno 106 chorus',
  'cicadas at dusk', 'monorepos sem dor', 'relógios de pêndulo',
  'o ciclo do ouro em Minas', 'moedas do Império', 'a travessia da Mantiqueira',
  'entropia no cotidiano', 'juntas de macho e fêmea', 'a curva de juros',
  'systemd sem medo', 'estruturas de peões', 'o lobo-guará'
]

const TITLE_TAILS = [
  '', '', '', ' (part 2)', ' — a deep dive', ', explained', ' in 4K',
  ' (full documentary)', ' — field notes', ', twenty years later'
]

// mulberry32: tiny deterministic PRNG; quality is irrelevant, stability isn't.
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedDevFixtures(
  catalog: CatalogRepository,
  states: StateRepository,
  clock: Clock,
  shorts: ShortsRepository
): void {
  if (catalog.countVideos() > 0) return

  const random = rng(20260711)
  const now = clock.now()
  const nowIso = now.toISOString()
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(random() * xs.length)]

  const videoIds: { videoId: string; ageDays: number }[] = []

  CHANNEL_NAMES.forEach((title, index) => {
    const channelId = `UCfixture${String(index).padStart(2, '0')}`
    catalog.upsertChannel({ channelId, title, thumbnailUrl: null })

    // Upload cadence between twice a day and every ~12 days, per channel.
    const cadenceHours = 12 + random() * 276
    let ageHours = random() * cadenceHours
    let serial = 0

    // Two years of archive gives "Earlier" real depth to scroll (D-027).
    while (ageHours < 24 * 730) {
      const videoId = `fx-${String(index).padStart(2, '0')}-${String(serial).padStart(4, '0')}`
      const publishedAt = new Date(now.getTime() - ageHours * 3_600_000).toISOString()
      // B-028: ~8% Shorts, so the badge/filter have something to exercise
      // in dev without the D-028 exclusion pipeline running.
      const isShort = random() < 0.08
      catalog.upsertVideo(
        {
          videoId,
          channelId,
          title: `${pick(TITLE_LEADS)} ${pick(TITLE_SUBJECTS)}${pick(TITLE_TAILS)}`,
          publishedAt,
          durationSeconds: isShort ? 15 + Math.floor(random() * 45) : 200 + Math.floor(random() * 3400),
          thumbnailUrl: null,
          viewCount: Math.floor(random() * 400_000),
          isShort,
          liveContent: 'none',
          liveStartedAt: null,
          liveEndedAt: null,
          isPremiere: false
        },
        nowIso
      )
      if (isShort) shorts.setShortStatus(videoId, true)
      videoIds.push({ videoId, ageDays: ageHours / 24 })
      ageHours += cadenceHours * (0.5 + random())
      serial += 1
    }
  })

  // States, so every view has something to show. Recent videos stay mostly
  // unread (there should be something to catch up on); the archive is mostly
  // read, with pockets of everything else.
  for (const { videoId, ageDays } of videoIds) {
    const roll = random()
    if (ageDays > 7) {
      if (roll < 0.7) states.setReadStatus(videoId, 'read')
      else if (roll < 0.75) states.setReadStatus(videoId, 'ignored')
    } else if (ageDays > 1 && roll < 0.25) {
      states.setReadStatus(videoId, 'read')
    }
    if (random() < 0.04) states.toggleFavorite(videoId)
    if (random() < 0.008) states.toggleWatchLater(videoId)
  }
}
