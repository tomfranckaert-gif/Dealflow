import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function geocode(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${address} ${city} Nederland`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=nl`

  const res = await fetch(url, { headers: { 'User-Agent': 'Transactly/1.0' } })
  const data = await res.json()

  if (data.length === 0) return null

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  }
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  // Geocode deals
  const { data: deals } = await supabase
    .from('deals')
    .select('id, address, city, postcode')
    .is('lat', null)

  console.log(`Geocoding ${deals?.length} deals...`)

  for (const deal of deals || []) {
    if (!deal.address || !deal.city) continue

    const coords = await geocode(deal.address, deal.city)

    if (coords) {
      await supabase
        .from('deals')
        .update({ lat: coords.lat, lng: coords.lng })
        .eq('id', deal.id)

      console.log(`✓ ${deal.address}, ${deal.city} → ${coords.lat}, ${coords.lng}`)
    } else {
      console.log(`✗ ${deal.address}, ${deal.city} → niet gevonden`)
    }

    // Nominatim: max 1 request per seconde
    await sleep(1100)
  }

  // Geocode contacts (buyers/sellers)
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name')
    .is('lat', null)
    .not('name', 'is', null)
    .limit(50)

  console.log(`\nSkipping contact geocoding — no address field in contacts table`)

  console.log('\n✅ Geocoding compleet!')

  // Check results
  const { count } = await supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .not('lat', 'is', null)

  console.log(`${count} deals hebben coördinaten`)
}

run()
