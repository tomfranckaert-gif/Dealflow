export interface RealworksProperty {
  id: string;
  address: string;
  postcode: string;
  city: string;
  type: string;
  surface: number;
  rooms: number;
  asking_price: number;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
}

const MOCK_PROPERTIES: RealworksProperty[] = [
  {
    id: "RW-001",
    address: "Keizersgracht 412",
    postcode: "1016 GC",
    city: "Amsterdam",
    type: "appartement",
    surface: 112,
    rooms: 4,
    asking_price: 875000,
    owner_name: "J. Vermeer",
    owner_email: "j.vermeer@gmail.com",
    owner_phone: "+31 6 12 34 56 78",
  },
  {
    id: "RW-002",
    address: "Herengracht 182",
    postcode: "1016 BS",
    city: "Amsterdam",
    type: "appartement",
    surface: 145,
    rooms: 5,
    asking_price: 1240000,
    owner_name: "M. de Vries",
    owner_email: "m.devries@outlook.com",
    owner_phone: "+31 6 98 76 54 32",
  },
  {
    id: "RW-003",
    address: "Vondelstraat 88",
    postcode: "1054 GJ",
    city: "Amsterdam",
    type: "bovenwoning",
    surface: 78,
    rooms: 3,
    asking_price: 520000,
    owner_name: "H. Jansen",
    owner_email: "h.jansen@kpn.nl",
    owner_phone: "+31 6 11 22 33 44",
  },
  {
    id: "RW-004",
    address: "Prinsengracht 267",
    postcode: "1016 GV",
    city: "Amsterdam",
    type: "grachtenpand",
    surface: 210,
    rooms: 6,
    asking_price: 695000,
    owner_name: "Apartments BV",
    owner_email: "info@apartmentsbv.nl",
    owner_phone: "+31 20 555 0101",
  },
  {
    id: "RW-005",
    address: "Plantage Middenlaan 34",
    postcode: "1018 DD",
    city: "Amsterdam",
    type: "eengezinswoning",
    surface: 165,
    rooms: 7,
    asking_price: 1050000,
    owner_name: "P. Mulder",
    owner_email: "p.mulder@ziggo.nl",
    owner_phone: "+31 6 55 44 33 22",
  },
];

export function searchProperties(query: string): RealworksProperty[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return MOCK_PROPERTIES.filter(
    (p) =>
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.postcode.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
  );
}

// Keep old export as alias so existing callers don't break
export async function searchRealworks(query: string): Promise<RealworksProperty[]> {
  return searchProperties(query);
}
