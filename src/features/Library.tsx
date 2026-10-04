import { useState } from "react";
import { AgentSpace } from "./AgentSpace";
import {
  ArrowRight,
  Search,
  X,
  Bookmark,
  BookOpen,
  LoaderCircle,
} from "lucide-react";
import type { KnowledgeSession, LibraryStatus, Role } from "../domain/types";
import {
  Avatar,
  DemoNote,
  EmptyState,
  SessionCard,
} from "../components/Shared";
export function Library({
  sessions,
  openSession,
  status,
  setStatus,
  saved,
  onlySaved = false,
}: {
  sessions: KnowledgeSession[];
  openSession: (id: string) => void;
  status: LibraryStatus;
  setStatus: (status: LibraryStatus) => void;
  saved: string[];
  onlySaved?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [sort, setSort] = useState("recent");
  const categories = ["Todas", ...new Set(sessions.map((s) => s.category))];
  const source = onlySaved
    ? sessions.filter((s) => saved.includes(s.id))
    : sessions;
  const filtered = source
    .filter(
      (s) =>
        (category === "Todas" || s.category === category) &&
        (s.title + " " + s.senior + " " + s.description)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(
            query
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase(),
          ),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "es")
        : (sort === "oldest" ? 1 : -1) *
          (new Date(a.date).getTime() - new Date(b.date).getTime()),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {onlySaved
              ? "Tu biblioteca personal."
              : "Hay mucho que aprender aquí."}
          </h1>
          <p>
            {onlySaved
              ? "Las experiencias que quieres tener a mano, cuando las necesites."
              : "Descubre cómo trabaja tu equipo. Los pasos, las decisiones y sus porqués."}
          </p>
        </div>
        <span className="library-count">
          <BookOpen size={17} />
          {source.length} sesiones de ejemplo
        </span>
      </div>
      <div className="library-toolbar">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Buscar sesiones</span>
          <input
            type="search"
            placeholder="Busca una tarea, una persona o una idea…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </label>
        <label className="sort-field">
          Orden
          <select
            aria-label="Orden de sesiones"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Más recientes primero</option>
            <option value="oldest">Más antiguas primero</option>
            <option value="title">Título A–Z</option>
          </select>
        </label>
      </div>
      <div className="filter-row" aria-label="Filtrar por área">
        {categories.map((c) => (
          <button
            className={"filter-chip " + (category === c ? "selected" : "")}
            aria-pressed={category === c}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {status === "loading" ? (
        <div className="library-loading" role="status">
          <LoaderCircle className="spin" size={22} />
          <span>Preparando las sesiones de ejemplo…</span>
          <div className="skeleton-grid">
            {[1, 2, 3].map((i) => (
              <div className="skeleton-card" key={i}>
                <span />
                <i />
                <i />
              </div>
            ))}
          </div>
        </div>
      ) : status === "error" ? (
        <EmptyState
          error
          title="No pudimos cargar las sesiones"
          description="Este es un error simulado. Tus ejemplos siguen disponibles; vuelve a intentarlo para continuar."
          action="Reintentar"
          onAction={() => setStatus("loading")}
        />
      ) : status === "empty" ? (
        <EmptyState
          title="El conocimiento empieza con alguien"
          description="Así se verá una biblioteca sin sesiones. Cada experiencia compartida será un punto de partida."
          action="Mostrar sesiones de ejemplo"
          onAction={() => setStatus("ready")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            onlySaved && !source.length
              ? "Haz espacio para lo que quieres aprender"
              : "Todavía no encontramos esa experiencia"
          }
          description={
            onlySaved && !source.length
              ? "Abre una sesión y pulsa Guardar en mi biblioteca para encontrarla aquí."
              : "Prueba con otra palabra o explora todas las áreas."
          }
          action={source.length ? "Limpiar filtros" : undefined}
          onAction={() => {
            setQuery("");
            setCategory("Todas");
          }}
        />
      ) : (
        <>
          <p className="results-caption" role="status">
            {filtered.length}{" "}
            {filtered.length === 1
              ? "experiencia para explorar"
              : "experiencias para explorar"}
          </p>
          <div className="session-grid library-grid">
            {filtered.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onOpen={() => openSession(session.id)}
              />
            ))}
          </div>
        </>
      )}
      <div className="library-bottom-note">
        <GitPath />
        <div>
          <h2>El mismo destino puede tener distintos caminos.</h2>
          <p>
            Cada sesión conserva el contexto de quien la comparte. Explora las
            variantes y descubre qué puedes aprender de cada una.
          </p>
        </div>
      </div>
      <DemoNote />
    </>
  );
}
function GitPath() {
  return (
    <svg viewBox="0 0 72 56" className="git-path" aria-hidden="true">
      <path d="M10 28h14c16 0 12-17 29-17h8M24 28c16 0 12 17 29 17h8" />
      <circle cx="9" cy="28" r="4" />
      <circle cx="61" cy="11" r="4" />
      <circle cx="61" cy="45" r="4" />
    </svg>
  );
}
export function InternHome({
  sessions,
  openSession,
  openLibrary,
  saved,
  role,
}: {
  sessions: KnowledgeSession[];
  openSession: (id: string) => void;
  openLibrary: () => void;
  saved: string[];
  role: Role;
}) {
  const featured = sessions.find((s) => s.id === "accesos") || sessions[0];
  return (
    <AgentSpace role="intern">
      <div className="page-heading">
        <div>
          <h2>Experiencias para explorar</h2>
          <p>Sesiones de ejemplo para recorrer a tu ritmo.</p>
        </div>
        <span className="date-label">Tu espacio de {role}</span>
      </div>
      <section className="learning-feature">
        <div className="learning-feature-copy">
          <h2>{featured.title}</h2>
          <p>{featured.description}</p>
          <div className="featured-author">
            <Avatar initials={featured.initials} />
            <span>
              <strong>{featured.senior}</strong>
              <small>{featured.role}</small>
            </span>
          </div>
          <button
            className="button primary"
            onClick={() => openSession(featured.id)}
          >
            Explorar esta experiencia
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="learning-feature-map" aria-hidden="true">
          <div className="map-title">Más que una lista de pasos.</div>
          <div className="example-map-node">
            <span>1</span>
            <div>
              Entender el contexto<small>Qué ocurrió y por qué importa</small>
            </div>
          </div>
          <div className="map-connector" />
          <div className="example-map-node decision-node">
            <span>?</span>
            <div>
              Elegir el siguiente paso
              <small>El criterio detrás de la decisión</small>
            </div>
          </div>
          <div className="map-branch-lines">
            <i />
            <i />
          </div>
          <div className="map-choices">
            <span>Resolver con contexto</span>
            <span>Pedir una segunda mirada</span>
          </div>
          <span className="map-footnote">
            Dos caminos, cada uno con su razón.
          </span>
        </div>
      </section>
      <section className="recent-section">
        <div className="section-heading">
          <div>
            <h2>La experiencia de tu equipo, a tu alcance</h2>
            <p>Elige una sesión y empieza por lo que te da curiosidad.</p>
          </div>
          <button className="text-button" onClick={openLibrary}>
            Ver todo
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="session-grid">
          {sessions.slice(0, 3).map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              compact
              onOpen={() => openSession(session.id)}
            />
          ))}
        </div>
      </section>
      <div className="learning-footer">
        <Bookmark size={18} />
        <p>
          {saved.length
            ? "Tienes " +
              saved.length +
              " sesiones guardadas para volver cuando quieras."
            : "Guarda las sesiones que te interesen y vuelve a ellas cuando lo necesites."}
        </p>
        <span>Explorar es el primer paso. La práctica viene después.</span>
      </div>
      <DemoNote />
    </AgentSpace>
  );
}
