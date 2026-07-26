import type { PlacedBlock } from '@/domain/furniture'
import { getFurnitureDef } from '@/lib/furniture/furniture-library'
import { useFurnitureStore } from '@/stores/furnitureStore'

interface FurnitureLayerProps {
  blocks: PlacedBlock[]
  scale: number
  offsetX: number
  offsetY: number
  readOnly?: boolean
}

export function FurnitureLayer({ blocks, scale, offsetX, offsetY, readOnly }: FurnitureLayerProps) {
  const removeBlock = useFurnitureStore((s) => s.removeBlock)

  if (blocks.length === 0) return null

  return (
    <g className="furniture-layer">
      {blocks.map((block) => {
        const def = getFurnitureDef(block.defId)
        if (!def) return null

        const vx = (block.x - offsetX) * scale
        const vy = (block.y - offsetY) * scale
        const vw = def.width * scale
        const vh = def.depth * scale
        const cx = vx + vw / 2
        const cy = vy + vh / 2
        const cat = def.category
        const fill =
          cat === 'furniture' ? '#e8d4b8' :
          cat === 'sanitary' ? '#b8d4e8' :
          cat === 'kitchen' ? '#d4e8b8' :
          cat === 'structural' ? '#d0d0d8' :
          cat === 'stair' ? '#e8d0d0' :
          '#f0e8c8'
        const stroke =
          cat === 'structural' ? '#888' : '#999'

        return (
          <g key={block.instanceId} className="furniture-block">
            {/* Body */}
            <rect
              x={vx} y={vy} width={vw} height={vh}
              fill={fill}
              stroke={stroke}
              strokeWidth={1 / scale}
              rx={2 / scale}
              className={readOnly ? '' : 'cursor-pointer'}
              onClick={(e) => {
                if (readOnly) return
                e.stopPropagation()
              }}
            />
            {/* Diagonal hash for orientation */}
            <line
              x1={vx} y1={vy} x2={vx + vw} y2={vy + vh}
              stroke={stroke}
              strokeWidth={0.5 / scale}
              opacity={0.4}
            />
            {/* Label */}
            <text
              x={cx} y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.max(8, Math.min(14, vw * 0.3))}
              fill="#444"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {def.symbol}
            </text>
            {/* Rotation indicator if rotated */}
            {block.rotation !== 0 && (
              <text
                x={cx} y={vy - 4 / scale}
                textAnchor="middle"
                fontSize={Math.max(6, vw * 0.15)}
                fill="#999"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {block.rotation}°
              </text>
            )}
            {/* Delete button (hover) */}
            {!readOnly && (
              <g
                className="furniture-delete"
                style={{ cursor: 'pointer', opacity: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as SVGElement).style.opacity = '1' }}
                onMouseLeave={(e) => { (e.currentTarget as SVGElement).style.opacity = '0' }}
                onClick={(e) => { e.stopPropagation(); removeBlock(block.instanceId) }}
              >
                <rect
                  x={vx + vw - 10 / scale} y={vy - 2 / scale}
                  width={12 / scale} height={12 / scale}
                  rx={2 / scale}
                  fill="#ef4444"
                />
                <text
                  x={vx + vw - 4 / scale} y={vy + 4 / scale}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={8 / scale}
                  fill="white"
                  style={{ pointerEvents: 'none' }}
                >
                  ✕
                </text>
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
