import { useCallback, useRef, type ReactNode } from 'react';
import type { InteriorRoom, FixtureInstance } from '@/domain/interior';
import { getFixtureById } from '@/lib/interior/fixtures';
import { useInteriorStore } from '@/stores/interiorStore';

interface InteriorCanvasProps {
  width: number;
  height: number;
  rooms: InteriorRoom[];
  fixtures: FixtureInstance[];
  gridSize?: number;
}

function FixtureSymbol({ fixture }: { fixture: FixtureInstance; room?: InteriorRoom }): ReactNode {
  const def = getFixtureById(fixture.fixtureTypeId);
  if (!def) return null;

  const w = def.width;
  const d = def.depth;
  const cx = fixture.position.x + w / 2;
  const cy = fixture.position.y + d / 2;
  const color = '#4a5568';

  return (
    <g key={fixture.instanceId} data-fixture-id={fixture.instanceId}>
      <rect
        x={fixture.position.x}
        y={fixture.position.y}
        width={w}
        height={d}
        fill={`${color}15`}
        stroke={color}
        strokeWidth={0.8}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={7}
        fill={color}
        transform={`rotate(${fixture.rotation}, ${cx}, ${cy})`}
      >
        {def.symbol}
      </text>
    </g>
  );
}

function RoomRect({ room, selected, onSelect }: { room: InteriorRoom; selected: boolean; onSelect: (id: string) => void }): ReactNode {
  const cx = room.position.x + room.dimensions.width / 2;
  const cy = room.position.y + room.dimensions.height / 2;

  return (
    <g
      key={room.roomId}
      data-room-id={room.roomId}
      onClick={() => onSelect(room.roomId)}
      className={selected ? 'selected' : ''}
    >
      <rect
        x={room.position.x}
        y={room.position.y}
        width={room.dimensions.width}
        height={room.dimensions.height}
        fill={selected ? '#8B5CF615' : 'transparent'}
        stroke={selected ? '#8B5CF6' : '#94a3b8'}
        strokeWidth={selected ? 1.5 : 0.8}
        strokeDasharray={selected ? 'none' : '4 2'}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fill={selected ? '#8B5CF6' : '#64748b'}
        fontWeight={selected ? '600' : '400'}
      >
        {room.name}
      </text>
    </g>
  );
}

export function InteriorCanvas({ width, height, rooms, fixtures, gridSize = 100 }: InteriorCanvasProps) {
  const selectRoom = useInteriorStore((s) => s.selectRoom);
  const selectFixture = useInteriorStore((s) => s.selectFixture);
  const selectedRoomId = useInteriorStore((s) => s.selectedRoomId);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
        selectRoom(null);
        selectFixture(null);
      }
    },
    [selectRoom, selectFixture]
  );

  const handleRoomSelect = useCallback(
    (roomId: string) => {
      selectRoom(roomId);
    },
    [selectRoom]
  );

  const renderGrid = (): ReactNode => {
    const lines: ReactNode[] = [];
    for (let x = 0; x <= width; x += gridSize) {
      lines.push(
        <line key={`gv${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e2e8f020" strokeWidth={0.3} />
      );
    }
    for (let y = 0; y <= height; y += gridSize) {
      lines.push(
        <line key={`gh${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e2e8f020" strokeWidth={0.3} />
      );
    }
    return lines;
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-canvas)]"
      style={{ width: '100%', height: '100%', minHeight: 400 }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="cursor-default"
        onClick={handleCanvasClick}
        style={{ minWidth: width, minHeight: height }}
      >
        {renderGrid()}
        {rooms.map((room) => (
          <RoomRect
            key={room.roomId}
            room={room}
            selected={room.roomId === selectedRoomId}
            onSelect={handleRoomSelect}
          />
        ))}
        {fixtures.map((fixture) => (
          <FixtureSymbol
            key={fixture.instanceId}
            fixture={fixture}
            room={rooms.find((r) => r.roomId === fixture.roomId)}
          />
        ))}
      </svg>
    </div>
  );
}
