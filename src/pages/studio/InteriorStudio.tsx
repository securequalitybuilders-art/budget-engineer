import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useInteriorStore } from '@/stores/interiorStore';
import { InteriorCanvas } from '@/components/interior/InteriorCanvas';
import { MaterialPalette } from '@/components/interior/MaterialPalette';
import { getFixturesByCategory } from '@/lib/interior/fixtures';
import { ROOM_TEMPLATES } from '@/lib/interior/roomTemplates';
import { generateFinishSchedule } from '@/lib/interior/finishSchedule';

export function InteriorStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const project = useInteriorStore((s) => s.project);
  const materials = useInteriorStore((s) => s.materials);
  const loadProject = useInteriorStore((s) => s.loadProject);

  useEffect(() => {
    if (projectId && !project) {
      loadProject(projectId);
    }
  }, [projectId, project, loadProject]);

  const finishSchedule = useMemo(() => {
    if (!project) return [];
    return generateFinishSchedule(project.rooms, materials);
  }, [project, materials]);

  const totalFinishCostCents = useMemo(
    () => finishSchedule.reduce((sum, item) => sum + item.totalCents, 0),
    [finishSchedule]
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-[var(--text-secondary)]">
          <div className="mb-2 text-lg">Loading interior workspace...</div>
          <div className="text-sm">Initializing project data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-4 py-2">
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">Interior Studio</h1>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {project.rooms.length} rooms · {project.fixtures.length} fixtures
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>Finish cost:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            ${(totalFinishCostCents / 100).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: 220 }}>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Room Templates
            </div>
            <div className="flex flex-col gap-1">
              {ROOM_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    const existing = project.rooms.find((r) => r.name === tpl.name);
                    if (existing) return;
                    const offset = project.rooms.length * 50;
                    useInteriorStore.getState().addRoom({
                      roomId: crypto.randomUUID(),
                      roomType: tpl.roomType,
                      name: tpl.name,
                      position: { x: 50 + offset, y: 50 + offset },
                      dimensions: { width: tpl.defaultWidth, height: tpl.defaultDepth },
                      rotation: 0,
                      finishSpec: {
                        wallMaterialId: tpl.suggestedMaterials.wall,
                        floorMaterialId: tpl.suggestedMaterials.floor,
                        ceilingMaterialId: tpl.suggestedMaterials.ceiling,
                        wallFinish: '',
                        floorFinish: '',
                        ceilingFinish: '',
                      },
                      notes: '',
                    });
                  }}
                  className="rounded-md border border-[var(--border-primary)] px-2 py-1.5 text-left text-xs
                    text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <div className="font-medium">{tpl.name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {tpl.defaultWidth / 1000}m × {tpl.defaultDepth / 1000}m
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border-primary)] pt-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Fixture Library
            </div>
            <div className="flex flex-col gap-1">
              {getFixturesByCategory('sanitary').slice(0, 10).map((fxt) => (
                <button
                  key={fxt.id}
                  type="button"
                  onClick={() => {
                    const targetRoom = project.rooms[0];
                    if (!targetRoom) return;
                    useInteriorStore.getState().addFixture({
                      instanceId: crypto.randomUUID(),
                      fixtureTypeId: fxt.id,
                      position: {
                        x: targetRoom.position.x + 100,
                        y: targetRoom.position.y + 100,
                      },
                      rotation: 0,
                      roomId: targetRoom.roomId,
                      flipped: false,
                    });
                  }}
                  className="rounded-md border border-[var(--border-primary)] px-2 py-1 text-left text-xs
                    text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <div className="font-medium">{fxt.name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {fxt.width / 1000}m × {fxt.depth / 1000}m
                  </div>
                </button>
              ))}
              {getFixturesByCategory('furniture').slice(0, 4).map((fxt) => (
                <button
                  key={fxt.id}
                  type="button"
                  onClick={() => {
                    const targetRoom = project.rooms[0];
                    if (!targetRoom) return;
                    useInteriorStore.getState().addFixture({
                      instanceId: crypto.randomUUID(),
                      fixtureTypeId: fxt.id,
                      position: {
                        x: targetRoom.position.x + 100,
                        y: targetRoom.position.y + 100,
                      },
                      rotation: 0,
                      roomId: targetRoom.roomId,
                      flipped: false,
                    });
                  }}
                  className="rounded-md border border-[var(--border-primary)] px-2 py-1 text-left text-xs
                    text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <div className="font-medium">{fxt.name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {fxt.width / 1000}m × {fxt.depth / 1000}m
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden rounded-lg border border-[var(--border-primary)]">
          <InteriorCanvas
            width={2000}
            height={2000}
            rooms={project.rooms}
            fixtures={project.fixtures}
          />
        </div>

        <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: 240 }}>
          <MaterialPalette />

          <div className="border-t border-[var(--border-primary)] pt-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Finish Schedule
            </div>
            <div className="flex flex-col gap-0.5">
              {finishSchedule.slice(0, 20).map((item) => (
                <div
                  key={`${item.roomId}-${item.surface}`}
                  className="flex items-center justify-between rounded px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]"
                >
                  <span className="truncate">
                    {item.roomName} · {item.surface}
                  </span>
                  <span>${(item.totalCents / 100).toFixed(2)}</span>
                </div>
              ))}
              {finishSchedule.length > 20 && (
                <div className="px-1.5 text-[10px] text-[var(--text-tertiary)]">
                  +{finishSchedule.length - 20} more items
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
