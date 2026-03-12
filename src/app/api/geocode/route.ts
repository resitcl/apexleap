import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('limit', '1')
    url.searchParams.set('addressdetails', '1')

    const response = await fetch(url.toString(), {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'ApexLeap/1.0 venue-geocoding',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'No se pudo consultar el mapa' }, { status: 502 })
    }

    const results = (await response.json()) as Array<{
      lat: string
      lon: string
      display_name: string
    }>

    if (!results.length) {
      return NextResponse.json({ error: 'No encontramos esa dirección en el mapa' }, { status: 404 })
    }

    const best = results[0]

    return NextResponse.json({
      lat: Number(best.lat),
      lng: Number(best.lon),
      label: best.display_name,
    })
  } catch {
    return NextResponse.json({ error: 'Error al buscar la dirección' }, { status: 500 })
  }
}
