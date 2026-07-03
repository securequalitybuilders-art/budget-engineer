/**
 * TEMPORARY RUNTIME DEBUG — Sprint 39B
 * Fixed-position overlay panel that shows the buildingType value at each
 * stage of the real UI flow in LIVE operation (not test data).
 *
 * Remove after Sprint 39B diagnosis is complete.
 */

import { useEffect, useState } from 'react'
import { getBtTrace, subscribeBtTrace } from '@/lib/debug/buildingTypeTrace'

const LABELS: Record<keyof ReturnType<typeof getBtTrace>, string> = {
  dropdownValue: '1. dropdownValue',
  briefBuildingType: '2. briefBuildingType',
  optionsBuildingTypes: '3. optionsBuildingTypes',
  selectedDesignBuildingType: '4. selectedDesignBuildingType',
  planGenBuildingType: '5. planGenBuildingType (inside generatePlanModel)',
  programKeyUsed: '6. programKeyUsed (getRoomProgram)',
  firstThreeRoomNames: '7. firstThreeRoomNames',
}

export function BuildingTypeDebugPanel() {
  const [visible, setVisible] = useState(true)
  const [trace, setTrace] = useState(() => getBtTrace())

  useEffect(() => {
    const unsub = subscribeBtTrace(() => {
      setTrace({ ...getBtTrace() })
    })
    return unsub
  }, [])

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed', top: 4, left: 4, zIndex: 99999,
          background: '#fbbf24', color: '#1e1b4b', border: '2px solid #d97706',
          borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 'bold',
          cursor: 'pointer', fontFamily: 'monospace',
        }}
      >
        BT-DEBUG
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', top: 4, left: 4, zIndex: 99999,
        background: '#1e1b4b', color: '#fbbf24', border: '2px solid #fbbf24',
        borderRadius: 6, padding: 10, fontSize: 12,
        fontFamily: 'monospace', maxWidth: 420, maxHeight: '80vh',
        overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ color: '#fff' }}>BuildingType Trace</strong>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'transparent', color: '#fca5a5', border: '1px solid #fca5a5',
            borderRadius: 3, padding: '1px 6px', fontSize: 11, cursor: 'pointer',
          }}
        >
          Hide
        </button>
      </div>

      {(Object.keys(LABELS) as Array<keyof typeof trace>).map((key) => {
        const val = trace[key]
        const display = Array.isArray(val)
          ? val.length > 0 ? `[${val.join(', ')}]` : '[]'
          : String(val)
        const isHouse = display === 'house' || display === '[house]' || (Array.isArray(val) && val.length === 0)
        return (
          <div key={key} style={{ marginBottom: 3, lineHeight: 1.5 }}>
            <span style={{ color: '#94a3b8' }}>{LABELS[key]}: </span>
            <span style={{ color: isHouse ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
              {display}
            </span>
          </div>
        )
      })}
    </div>
  )
}
