import { useStudioCtx } from './StudioContext'
import { QButtonRow } from './QButtonRow'
import { MAX_SOURCE_SLOTS } from '../../types/studio'

export function QButtonTable() {
  const { rows, activeRowIdx, layoutData } = useStudioCtx()

  const nextRow = activeRowIdx !== null ? rows[activeRowIdx + 1] : null
  const isNextRowFireable = (() => {
    if (!nextRow?.captionId || !nextRow.sources.some(s => s.sourceValue)) return false
    const entry = layoutData.find(l => String(l.id) === nextRow.captionId)
    const maxSlots = entry ? Math.min(Math.max(1, entry.windowsCount), MAX_SOURCE_SLOTS) : 0
    if (maxSlots > 0 && nextRow.sources.length !== maxSlots) return false
    return true
  })()

  return (
    <div id="studio-qbutton-table-container" className="h-full overflow-auto">
      <table id="studio-qbutton-table" className="w-full table-fixed border-separate border-spacing-y-1" style={{ minWidth: 960 }}>
        <thead className="sticky top-0 z-10 bg-primary-bg">
          <tr>
            <th className="text-xs xl:text-[10px] text-sky-400 uppercase tracking-wider pb-1 text-center w-14">Btn</th>
            <th className="text-xs xl:text-[10px] text-sky-400 uppercase tracking-wider pb-1 text-left px-1 w-48">Caption</th>
            <th className="text-xs xl:text-[10px] text-emerald-400 uppercase tracking-wider pb-1 text-left px-1 w-44">GFX Start</th>
            <th className="text-xs xl:text-[10px] text-amber-400 uppercase tracking-wider pb-1 text-left px-1 w-44">GFX Stop</th>
            <th className="text-xs xl:text-[10px] text-sky-400 uppercase tracking-wider pb-1 text-left px-1">
              Sources
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <QButtonRow
              key={idx}
              idx={idx}
              row={row}
              isActive={activeRowIdx === idx}
              isNext={activeRowIdx !== null && activeRowIdx + 1 === idx && isNextRowFireable}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
