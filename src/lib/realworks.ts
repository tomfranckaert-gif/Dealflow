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
    id: "rw-001",
    address: "Keizersgracht 412",
    postcode: "1016 GC",
    city: "Amsterdam",
    type: "Appartement",
    surface: 112,
    rooms: 4,
    asking_price: 875000,
    owner_name: "J. Vermeer",
    owner_email: "j.vermeer@email.nl",
    owner_phone: "06-12345678",
  },
  {
    id: "rw-002",
    address: "Herengracht 182",
    postcode: "1016 BS",
    city: "Amsterdam",
    type: "Appartement",
    surface: 145,
    rooms: 5,
    asking_price: 1240000,
    owner_name: "M. de Vries",
    owner_email: "m.devries@email.nl",
    owner_phone: "06-23456789",
  },
  {
    id: "rw-003",
    address: "Vondelstraat 88",
    postcode: "1054 GJ",
    city: "Amsterdam",
    type: "Bovenwoning",
    surface: 78,
    rooms: 3,
    asking_price: 520000,
    owner_name: "H. Jansen",
    owner_email: "h.jansen@email.nl",
    owner_phone: "06-34567890",
  },
  {
    id: "rw-004",
    address: "Prinsengracht 267",
    postcode: "1016 GV",
    city: "Amsterdam",
    type: "Grachtenpand",
    surface: 210,
    rooms: 6,
    asking_price: 695000,
    owner_name: "Apartments BV",
    owner_email: "info@apartmentsbv.nl",
    owner_phone: "020-1234567",
  },
];

export async function searchRealworks(query: string): Promise<RealworksProperty[]> {
  // Simulate API delay
  await new Promise((r) => setTimeout(r, 150));

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
