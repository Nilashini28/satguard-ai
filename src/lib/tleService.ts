export interface TLERecord {
  noradId: string
  name: string
  tle1: string
  tle2: string
  isLive: boolean
}

const FALLBACK: TLERecord[] = [
  { noradId: '25544', name: 'ISS (ZARYA)',
    tle1: '1 25544U 98067A   25136.50000000  .00016717  00000+0  10270-3 0  9993',
    tle2: '2 25544  51.6400 208.9163 0001765  86.9290 273.1849 15.49309572490097',
    isLive: false },
  { noradId: '33591', name: 'NOAA 19',
    tle1: '1 33591U 09005A   25136.50000000  .00000065  00000+0  57170-4 0  9995',
    tle2: '2 33591  99.1680 182.4451 0013691 122.8700 237.3850 14.12491972825234',
    isLive: false },
  { noradId: '25994', name: 'TERRA',
    tle1: '1 25994U 99068A   25136.50000000  .00000054  00000+0  28838-4 0  9992',
    tle2: '2 25994  98.2060 116.9200 0001415  93.4560 266.6790 14.57117465348721',
    isLive: false },
  { noradId: '27424', name: 'AQUA',
    tle1: '1 27424U 02022A   25136.50000000  .00000076  00000+0  37270-4 0  9990',
    tle2: '2 27424  98.2110 117.9980 0002220  90.9980 269.1450 14.57116408198234',
    isLive: false },
  { noradId: '40697', name: 'SENTINEL-2A',
    tle1: '1 40697U 15028A   25136.50000000  .00000075  00000+0  43460-4 0  9997',
    tle2: '2 40697  98.5680  89.1230 0001053  90.5670 269.5640 14.30824793517382',
    isLive: false },
]

const TARGET_IDS = new Set(['25544','33591','25994','27424','40697'])

export async function fetchTLEs(): Promise<TLERecord[]> {
  const urls = [
    'https://celestrak.org/SOCRATES/query.php?FORMAT=TLE',
    'https://celestrak.org/SOCRATES/tle-data.php',
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const text = await res.text()
      const lines = text.trim().split('\n').map((l: string) => l.trim()).filter(Boolean)
      const records: TLERecord[] = []
      for (let i = 0; i + 2 < lines.length; i += 3) {
        const tle1 = lines[i + 1]
        const tle2 = lines[i + 2]
        if (!tle1?.startsWith('1 ') || !tle2?.startsWith('2 ')) continue
        const noradId = tle2.slice(2, 7).trim()
        if (!TARGET_IDS.has(noradId)) continue
        const fallback = FALLBACK.find(f => f.noradId === noradId)
        records.push({
          noradId,
          name: lines[i].trim() || fallback?.name || noradId,
          tle1,
          tle2,
          isLive: true,
        })
      }
      if (records.length >= 3) {
        console.log(`[SATGUARD] Live TLE loaded from ${url}: ${records.length} satellites`)
        return records
      }
    } catch (e) {
      console.warn(`[SATGUARD] TLE fetch failed for ${url}:`, e)
    }
  }
  console.warn('[SATGUARD] Using fallback TLE data')
  return FALLBACK
}