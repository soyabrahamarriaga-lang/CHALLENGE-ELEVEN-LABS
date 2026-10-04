import { Bookmark, ArrowUpRight, Search, RefreshCw, BookOpen, GitBranch } from 'lucide-react';
import type { ProcessFilters, ProcessSummary } from '../domain/processFlow';
import type { ProcessCollectionState } from '../services/useProcessCollection';
import { emptyProcessFilters, filterProcesses } from '../domain/processCollection';
import './ProcessMaps.css';
import './ProcessCollection.css';

export interface CollectionProps {
  collection: ProcessCollectionState;
  filters: ProcessFilters;
  onFilters: (value: ProcessFilters) => void;
  onOpen: (id: string) => void;
}
export function CollectionHeader({ collection, title, description }: { collection: ProcessCollectionState; title: string; description: string }) {
  return <><div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>
    <button className="button secondary" disabled={collection.loading} onClick={collection.refresh}><RefreshCw size={16}/>Actualizar</button>
  </div>
  {collection.loading && <p role="status" className="flow-loading">Actualizando la biblioteca y sus relaciones…</p>}
  {collection.error && <div className="flow-error" role="alert"><h2>No pudimos actualizar la colección</h2><p>{collection.error}</p>
    {collection.data && <p>Se muestra la última lectura. Vuelve a actualizar para ver cambios recientes.</p>}
    <button className="button secondary" onClick={collection.refresh}>Volver a intentar</button></div>}
  {!!collection.data?.failures.length && <p role="status" className="flow-warning">{collection.data.failures.length} registros no pudieron leerse. Sus fuentes se conservan; vuelve a actualizar.</p>}
  </>;
}
export function CollectionFilters({ processes, filters, onFilters }: { processes: ProcessSummary[]; filters: ProcessFilters; onFilters: (v: ProcessFilters) => void }) {
  return <div className="knowledge-filters">
    <label className="flow-search"><Search size={18}/><span className="sr-only">Buscar proceso o tema</span><input placeholder="Buscar proceso o tema…" value={filters.query} onChange={(e) => onFilters({ ...filters, query: e.target.value })}/></label>
    <label>Departamento<select value={filters.department} onChange={(e) => onFilters({ ...filters, department: e.target.value })}><option value="">Todos los departamentos</option>{[...new Set(processes.map((p) => p.department))].sort().map((d) => <option key={d}>{d}</option>)}</select></label>
    <label>Tipo de tarea<select value={filters.taskType} onChange={(e) => onFilters({ ...filters, taskType: e.target.value })}><option value="">Todos los tipos</option>{[...new Set(processes.map((p) => p.taskType))].sort().map((t) => <option key={t}>{t}</option>)}</select></label>
  </div>;
}
export function CollectionEmpty({ hasProcesses, onClear }: { hasProcesses: boolean; onClear: () => void }) {
  return <div className="flow-empty"><BookOpen size={28}/><h2>{hasProcesses ? 'No hay procesos con estos filtros' : 'Tu biblioteca empieza con una tarea'}</h2><p>{hasProcesses ? 'Cambia la búsqueda o los filtros para explorar la colección.' : 'Comparte una tarea con tu aprendiz y guárdala en la bóveda para verla aquí y en el mapa.'}</p>{hasProcesses && <button className="button secondary" onClick={onClear}>Limpiar filtros</button>}</div>;
}
export default function ProcessLibrary({ collection, filters, onFilters, onOpen, saved, onToggleSaved, onlySaved, onMap }: CollectionProps & {
  saved: string[]; onToggleSaved: (id: string) => void; onlySaved: boolean; onMap: () => void;
}) {
  const data = collection.data;
  const filtered = data ? filterProcesses(data.processes, data.graph, filters).filter((p) => !onlySaved || saved.includes(p.id)) : [];
  const departments = [...new Set(filtered.map((p) => p.department))].sort();
  return <div className="process-collection-page">
    <CollectionHeader collection={collection} title={onlySaved ? 'Tus procesos guardados.' : 'La biblioteca de tu equipo.'} description="Una colección de procesos, ordenada por departamento y tipo de tarea."/>
    {data && <>
      <CollectionFilters processes={data.processes} filters={filters} onFilters={onFilters}/>
      <div className="collection-summary"><span>{filtered.length} de {data.processes.length} procesos{onlySaved ? ' · Favoritos de este navegador' : ' · Bóveda privada'}</span><button className="text-button" onClick={onMap}><GitBranch size={16}/>Ver relaciones en el mapa</button></div>
      {!filtered.length && (onlySaved && !saved.length ? <div className="flow-empty"><h2>Aún no has guardado procesos</h2><p>Usa el marcador junto a un proceso de la biblioteca.</p></div> : <CollectionEmpty hasProcesses={!!data.processes.length} onClear={() => onFilters(emptyProcessFilters)}/>)}
      {departments.map((department) => <section className="collection-department" key={department}><h2>{department}<span>{filtered.filter((p) => p.department === department).length} procesos</span></h2>
        {[...new Set(filtered.filter((p) => p.department === department).map((p) => p.taskType))].sort().map((family) => <section className="collection-family" key={family}><h3>{family}</h3>
          {filtered.filter((p) => p.department === department && p.taskType === family).sort((a,b) => a.title.localeCompare(b.title, 'es')).map((p) => <article className="collection-row" key={p.id}>
            <button className="collection-open" onClick={() => onOpen(p.id)}><span><strong>{p.title}</strong><small>{p.steps ? `${p.steps} ${p.steps === 1 ? "acción" : "acciones"} · ${p.imageCount} con imagen · Por revisar` : 'Sin tarea identificada · Fuente conservada'}</small></span><ArrowUpRight size={18}/></button>
            <button className="icon-button collection-bookmark" aria-label={(saved.includes(p.id) ? 'Quitar de guardadas: ' : 'Guardar: ') + p.title} aria-pressed={saved.includes(p.id)} onClick={() => onToggleSaved(p.id)}><Bookmark size={18} fill={saved.includes(p.id) ? 'currentColor' : 'none'}/></button>
          </article>)}
        </section>)}
      </section>)}
    </>}
  </div>;
}
