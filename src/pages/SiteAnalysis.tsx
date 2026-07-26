import { HeliodonView } from '@/components/analysis/HeliodonView'
import { SiteAnalysisPanel } from '@/components/analysis/SiteAnalysisPanel'
import type { SiteContext } from '@/domain/site'

const DEFAULT_SITE: SiteContext = {
  projectId: 'demo',
  lat: -26.2041,
  lng: 28.0473,
  orientation: 15,
  terrain: 'flat',
  adjacentBuildings: [],
  windRose: {
    sectors: [
      { direction: 0, speed: 5.2, frequency: 0.15 },
      { direction: 45, speed: 4.1, frequency: 0.10 },
      { direction: 90, speed: 3.8, frequency: 0.12 },
      { direction: 135, speed: 4.5, frequency: 0.08 },
      { direction: 180, speed: 6.1, frequency: 0.20 },
      { direction: 225, speed: 5.5, frequency: 0.18 },
      { direction: 270, speed: 3.2, frequency: 0.10 },
      { direction: 315, speed: 4.0, frequency: 0.07 },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export default function SiteAnalysis() {
  const site = DEFAULT_SITE

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Site Analysis</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>
        Heliodon, shadow casting, and environmental site assessment tools.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, background: '#fff' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Heliodon & Shadow</h2>
          <HeliodonView lat={site.lat} lng={site.lng} buildingFloors={2} />
        </div>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, background: '#fff' }}>
          <SiteAnalysisPanel site={site} />
        </div>
      </div>
    </div>
  )
}
