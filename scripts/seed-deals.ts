import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const stages = [
  'lead', 'bezichtiging', 'bod', 'koopakte',
  'voorwaarden', 'financiering',
  'overdracht', 'gesloten'
]

const streets = [
  'Steenstraat', 'Kerkstraat', 'Markt',
  'Dorpsstraat', 'Molenstraat', 'Kaaistraat',
  'Nieuwstraat', 'Langestraat', 'Schoolstraat',
  'Stationsstraat', 'Walstraat', 'Veerstraat',
  'Gentsestraat', 'Brouwerijstraat', 'Havenstraat',
  'Zandstraat', 'Dijkstraat', 'Molendijk',
  'Brugstraat', 'Lindenlaan'
]

const cities = [
  { name: 'Hulst',        postcode: '4561' },
  { name: 'Hulst',        postcode: '4562' },
  { name: 'Terneuzen',    postcode: '4531' },
  { name: 'Terneuzen',    postcode: '4532' },
  { name: 'Terneuzen',    postcode: '4533' },
  { name: 'Axel',         postcode: '4571' },
  { name: 'Axel',         postcode: '4572' },
  { name: 'Oostburg',     postcode: '4501' },
  { name: 'Oostburg',     postcode: '4502' },
  { name: 'Sluis',        postcode: '4524' },
  { name: 'IJzendijke',   postcode: '4515' },
  { name: 'Biervliet',    postcode: '4521' },
  { name: 'Sas van Gent', postcode: '4551' },
  { name: 'Philippine',   postcode: '4553' },
  { name: 'Graauw',       postcode: '4556' },
]

const types = [
  'appartement', 'eengezinswoning',
  'bovenwoning', 'vrijstaande woning',
  'twee-onder-een-kapwoning', 'hoekwoning',
  'tussenwoning', 'bungalow'
]

const buyers = [
  'Thomas van der Berg', 'Lisa Bakker',
  'Erik & Nina Smit', 'David Cohen',
  'Ahmed Al-Hassan', 'Ingrid de Wit',
  'Peter Vermeer', 'Sandra Jansen',
  'Mohammed El Idrissi', 'Karin Mulder',
  'Jan & Marie Peeters', 'Sofie Declercq',
  'Luc Vandenberghe', 'Emma de Graaf',
  'Pieter Claes', 'Nathalie Willems',
  'Dirk van Damme', 'Annelies Bogaert',
  'Wouter Maes', 'Lieselotte Cools',
]

const sellers = [
  'H. Jansen', 'J. Vermeer', 'M. de Vries',
  'P. Mulder', 'A. van den Berg',
  'G. Claeys', 'F. De Smedt', 'R. Pieters',
  'L. Desmet', 'W. Van Acker',
  'K. Stevens', 'B. Mertens', 'C. Leclercq',
  'D. Hermans', 'E. Wouters',
]

const notaries = [
  'Notariskantoor De Kok & Partners',
  'Smit Notarissen Hulst',
  'Van der Berg Notariaat',
  'Notaris Vermeer Terneuzen',
  'De Graaf & Zonen Notarissen',
]

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPrice() {
  const prices = [
    195000, 225000, 249000, 275000, 299000,
    325000, 349000, 375000, 399000, 425000,
    449000, 475000, 499000, 525000, 549000,
    575000, 599000, 625000, 649000, 675000,
  ]
  return random(prices)
}

function randomDate(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - randomInt(0, daysAgo))
  return date.toISOString()
}

function futureDate(daysAhead: number) {
  const date = new Date()
  date.setDate(date.getDate() + randomInt(1, daysAhead))
  return date.toISOString().split('T')[0]
}

async function seed() {
  // Try session auth first, fall back to SEED_OWNER_ID env var
  const { data: { user } } = await supabase.auth.getUser()
  const ownerId = user?.id ?? process.env.SEED_OWNER_ID

  if (!ownerId) {
    console.error('Niet ingelogd en geen SEED_OWNER_ID ingesteld.')
    console.error('Voeg SEED_OWNER_ID=<jouw-user-uuid> toe aan .env.local')
    process.exit(1)
  }

  console.log(`Seeding 99 deals (owner: ${ownerId})...`)

  for (let i = 0; i < 99; i++) {
    const city = random(cities)
    const stage = random(stages)
    const askingPrice = randomPrice()
    const agreedPrice = (stage === 'lead' || stage === 'bezichtiging')
      ? null
      : askingPrice - randomInt(0, 15000)
    const streetNum = randomInt(1, 180)

    // Create seller contact
    const { data: seller } = await supabase
      .from('contacts')
      .insert({
        owner_id: ownerId,
        name: random(sellers),
        email: `verkoper${i}@example.nl`,
        phone: `+31 6 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
        type: 'seller',
      })
      .select()
      .single()

    // Create buyer contact (not for lead)
    let buyer = null
    if (stage !== 'lead') {
      const { data: b } = await supabase
        .from('contacts')
        .insert({
          owner_id: ownerId,
          name: random(buyers),
          email: `koper${i}@example.nl`,
          phone: `+31 6 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
          type: 'buyer',
        })
        .select()
        .single()
      buyer = b
    }

    // Create deal
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        owner_id: ownerId,
        address: `${random(streets)} ${streetNum}`,
        postcode: `${city.postcode} ${String.fromCharCode(randomInt(65, 90))}${String.fromCharCode(randomInt(65, 90))}`,
        city: city.name,
        property_type: random(types),
        stage,
        asking_price: askingPrice,
        agreed_price: agreedPrice,
        seller_id: seller?.id ?? null,
        buyer_id: buyer?.id ?? null,
        notary_name: (stage === 'overdracht' || stage === 'gesloten') ? random(notaries) : null,
        transfer_date: stage === 'overdracht'
          ? futureDate(30)
          : stage === 'gesloten'
            ? futureDate(10)
            : null,
        created_at: randomDate(90),
      })
      .select()
      .single()

    if (error) {
      console.error(`Deal ${i + 1} error:`, error.message)
    } else {
      console.log(`✓ ${i + 1}/99 — ${deal.address}, ${city.name} (${stage})`)
    }
  }

  console.log('✅ Seed compleet!')
}

seed()
