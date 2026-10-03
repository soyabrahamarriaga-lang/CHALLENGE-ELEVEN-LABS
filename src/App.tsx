import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  BookOpen,
  Bookmark,
  ChevronRight,
  FlaskConical,
  HelpCircle,
  Home,
  Menu,
  PanelLeftClose,
  Pause,
  Settings2,
  ShieldCheck,
  X,
  Video,
} from "lucide-react";
import type { LibraryStatus, Role } from "./domain/types";
import { Logo, Avatar, EmptyState, Modal } from "./components/Shared";
import { Senior, ConnectionBadge } from "./features/Senior";
import { InternHome, Library } from "./features/Library";
import { SessionDetail } from "./features/SessionDetail";
import {
  createDemoSession,
  demoRepository,
} from "./services/sessionRepository";
import { useDemoAgent } from "./services/useDemoAgent";
import { timeLabel } from "./domain/callMachine";
const LiveCall = lazy(() => import("./features/LiveCall"));
const AgentConversation = lazy(() => import("./features/AgentConversation"));
import "./features/LiveCall.css";
function readRoute() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/");
  return {
    role: parts[0] === "intern" ? ("intern" as Role) : ("senior" as Role),
    view: parts[1] || "home",
    id: parts[2] || "",
  };
}
function loadSaved(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("userhelper.demo.bookmarks") || "[]",
    );
    return Array.isArray(value)
      ? value.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [sessions, setSessions] = useState(() => demoRepository.list());
  const [saved, setSaved] = useState(loadSaved);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>("ready");
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const { state, dispatch } = useDemoAgent();
  useEffect(() => {
    const change = () => {
      setRoute(readRoute());
      setMenuOpen(false);
      window.scrollTo({ top: 0 });
      mainRef.current?.focus();
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (libraryStatus !== "loading") return;
    const timer = setTimeout(() => setLibraryStatus("ready"), 1700);
    return () => clearTimeout(timer);
  }, [libraryStatus]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (state.session !== "active" && state.session !== "paused") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.session]);
  const navigate = (view: string, id = "", role: Role = route.role) => {
    window.location.hash = role + "/" + view + (id ? "/" + id : "");
    setMenuOpen(false);
  };
  const openLiveCall = () => {
    dispatch({ type: "PAUSE" });
    navigate("call");
  };
  const openAgent = () => {
    dispatch({ type: "PAUSE" });
    navigate("agent");
  };
  const onSave = (title: string) => {
    const session = createDemoSession(title, state.elapsed, state.excluded);
    const persisted = demoRepository.save(session);
    setSessions((items) => [session, ...items]);
    dispatch({ type: "RESET" });
    setToast(
      persisted
        ? "Sesión de ejemplo guardada en este navegador."
        : "No pudimos guardar en este navegador. La sesión estará disponible durante esta visita.",
    );
    navigate("session", session.id);
  };
  const toggleSaved = (id: string) => {
    const next = saved.includes(id)
      ? saved.filter((value) => value !== id)
      : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem("userhelper.demo.bookmarks", JSON.stringify(next));
    } catch {
      setToast(
        "Marcador disponible durante esta visita. El almacenamiento local no está disponible.",
      );
    }
  };
  const sectionTitle =
    route.view === "agent"
      ? "Tu aprendiz de IA"
      : route.view === "call"
        ? "Videollamada"
        : route.view === "home"
          ? route.role === "senior"
            ? "Compartir experiencia"
            : "Mi aprendizaje"
          : route.view === "saved"
            ? "Guardadas"
            : route.view === "session"
              ? "Explorar una experiencia"
              : "Biblioteca";
  const currentSession = sessions.find((s) => s.id === route.id);
  const inSession = state.session === "active" || state.session === "paused";
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Saltar al contenido
      </a>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar navegación"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={"sidebar " + (menuOpen ? "open" : "")}
        id="primary-navigation"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            document.getElementById("menu-trigger")?.focus();
          }
        }}
      >
        <div className="sidebar-brand">
          <a href={"#" + route.role + "/home"} aria-label="UserHelper, inicio">
            <Logo />
          </a>
          <button
            className="icon-button mobile-close"
            aria-label="Cerrar navegación"
            onClick={() => setMenuOpen(false)}
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
        <div className="workspace-picker">
          <span className="workspace-avatar">E</span>
          <span>
            Equipo de ejemplo<small>Espacio compartido</small>
          </span>
          <ChevronRight size={15} />
        </div>
        <div className="role-picker">
          <label htmlFor="role-select">Explorar como</label>
          <select
            id="role-select"
            value={route.role}
            onChange={(e) => navigate("home", "", e.target.value as Role)}
          >
            <option value="senior">Senior · Compartir</option>
            <option value="intern">Intern · Aprender</option>
          </select>
        </div>
        <nav aria-label="Navegación principal">
          <button
            className={route.view === "home" ? "selected" : ""}
            aria-current={route.view === "home" ? "page" : undefined}
            onClick={() => navigate("home")}
          >
            <Home size={19} />
            {route.role === "senior" ? "Mi espacio" : "Mi aprendizaje"}
          </button>
          <button
            className={
              route.view === "library" || route.view === "session"
                ? "selected"
                : ""
            }
            aria-current={route.view === "library" ? "page" : undefined}
            onClick={() => navigate("library")}
          >
            <BookOpen size={19} />
            Biblioteca<span className="nav-count">{sessions.length}</span>
          </button>
          <button
            className={route.view === "saved" ? "selected" : ""}
            aria-current={route.view === "saved" ? "page" : undefined}
            onClick={() => navigate("saved")}
          >
            <Bookmark size={18} />
            Guardadas
            {saved.length > 0 && (
              <span className="nav-count">{saved.length}</span>
            )}
          </button>
          <button
            className={route.view === "agent" ? "selected" : ""}
            aria-current={route.view === "agent" ? "page" : undefined}
            onClick={openAgent}
          >
            <AudioLines size={19} />
            Tu aprendiz de IA
          </button>
          <button
            className={route.view === "call" ? "selected" : ""}
            aria-current={route.view === "call" ? "page" : undefined}
            onClick={openLiveCall}
          >
            <Video size={19} />
            Videollamada
          </button>
        </nav>
        <div className="sidebar-message">
          <svg viewBox="0 0 50 37" aria-hidden="true">
            <path d="M6 29V12a5 5 0 0 1 5-5h11v19H11a5 5 0 0 0-5 3Zm38 0V12a5 5 0 0 0-5-5H28v19h11a5 5 0 0 1 5 3Z" />
            <path d="M25 5v27" />
          </svg>
          <p>
            La experiencia crece
            <br />
            cuando se comparte.
          </p>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setDemoOpen(true)}>
            <Settings2 size={18} />
            Explorar la demo
          </button>
          <button onClick={() => setHelpOpen(true)}>
            <HelpCircle size={18} />
            Cómo funciona
          </button>
          <div className="profile">
            <Avatar
              initials={route.role === "senior" ? "MT" : "AL"}
              color={route.role === "senior" ? "sage" : "blue"}
            />
            <span>
              <strong>
                {route.role === "senior" ? "Mariana Torres" : "Alex López"}
              </strong>
              <small>Perfil de demostración</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="workspace-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              id="menu-trigger"
              aria-label="Abrir navegación"
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Mi espacio
              <ChevronRight size={14} />
              <strong>{sectionTitle}</strong>
            </span>
          </div>
          {route.view === "agent" ? (
            <span className="real-call-badge">
              <AudioLines size={16} />
              ElevenLabs · Individual
            </span>
          ) : route.view === "call" ? (
            <span className="real-call-badge">
              <Video size={16} />
              Videollamada real
            </span>
          ) : (
            <button className="demo-badge" onClick={() => setDemoOpen(true)}>
              <FlaskConical size={14} />
              Demo interactiva
              <span className="demo-badge-detail">· Sin grabación real</span>
            </button>
          )}
        </header>
        {inSession && (route.role !== "senior" || route.view !== "home") && (
          <div className="ongoing-banner" role="status">
            <AudioLines size={17} />
            <span>
              Tu sesión de ejemplo sigue{" "}
              {state.session === "active" ? "activa" : "en pausa"} ·{" "}
              {timeLabel(state.elapsed)}
            </span>
            {state.session === "active" && (
              <button onClick={() => dispatch({ type: "PAUSE" })}>
                <Pause size={14} />
                Pausar
              </button>
            )}
            <button onClick={() => navigate("home", "", "senior")}>
              Volver a la sesión
              <ChevronRight size={15} />
            </button>
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          ref={mainRef}
          className={
            route.view === "session"
              ? "main-content detail-page"
              : "main-content"
          }
        >
          {route.view === "home" && route.role === "senior" && (
            <Senior
              state={state}
              dispatch={dispatch}
              sessions={sessions}
              openSession={(id) => navigate("session", id)}
              openLibrary={() => navigate("library")}
              onSave={onSave}
              openLiveCall={openLiveCall}
              openAgent={openAgent}
            />
          )}
          {route.view === "home" && route.role === "intern" && (
            <InternHome
              sessions={sessions}
              role={route.role}
              openSession={(id) => navigate("session", id)}
              openLibrary={() => navigate("library")}
              saved={saved}
            />
          )}
          {(route.view === "library" || route.view === "saved") && (
            <Library
              key={route.view}
              sessions={sessions}
              saved={saved}
              onlySaved={route.view === "saved"}
              status={libraryStatus}
              setStatus={setLibraryStatus}
              openSession={(id) => navigate("session", id)}
            />
          )}
          {route.view === "session" &&
            (currentSession ? (
              <SessionDetail
                key={currentSession.id}
                session={currentSession}
                saved={saved.includes(currentSession.id)}
                onToggleSaved={() => toggleSaved(currentSession.id)}
                onBack={() => navigate("library")}
              />
            ) : (
              <EmptyState
                title="Esta sesión no está disponible"
                description="Puede que se haya creado en otro navegador. Explora las sesiones de ejemplo para continuar."
                action="Ir a la biblioteca"
                onAction={() => navigate("library")}
              />
            ))}
          {route.view === "agent" && (
            <Suspense fallback={<p role="status">Preparando conversación…</p>}>
              <AgentConversation />
            </Suspense>
          )}
          {route.view === "call" && (
            <Suspense fallback={<p role="status">Preparando videollamada…</p>}>
              <LiveCall />
            </Suspense>
          )}
          {!["home", "library", "saved", "session", "call", "agent"].includes(
            route.view,
          ) && (
            <EmptyState
              title="No encontramos esta página"
              description="Tu espacio y las sesiones de ejemplo siguen disponibles."
              action="Volver a mi espacio"
              onAction={() => navigate("home")}
            />
          )}
        </main>
        <footer className="app-footer">
          <Logo small />
          <span>
            El conocimiento de hoy. El punto de partida de alguien más.
          </span>
          <span>Prototipo · 2026</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={19} />
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {demoOpen && (
        <Modal
          title="Explora todas las posibilidades"
          onClose={() => setDemoOpen(false)}
        >
          <p className="modal-description">
            Prueba los estados del prototipo. No hay servicios externos
            conectados y no se captura información de tus dispositivos.
          </p>
          <section className="demo-control-section">
            <h3>Conexión del aprendiz</h3>
            <ConnectionBadge state={state} />
            <div className="demo-control-buttons">
              <button
                className="button secondary"
                onClick={() => dispatch({ type: "CONNECT" })}
              >
                Conectar
              </button>
              <button
                className="button secondary"
                onClick={() => dispatch({ type: "DISCONNECT" })}
              >
                Desconectar
              </button>
              <button
                className="button secondary"
                onClick={() => dispatch({ type: "ERROR" })}
              >
                Simular error
              </button>
            </div>
            <small>
              Si hay una sesión activa, perder la conexión la deja en pausa.
            </small>
          </section>
          <section className="demo-control-section">
            <h3>Biblioteca</h3>
            <div className="demo-control-buttons">
              {(["ready", "loading", "empty", "error"] as LibraryStatus[]).map(
                (status, index) => (
                  <button
                    className="button secondary"
                    key={status}
                    onClick={() => {
                      setLibraryStatus(status);
                      navigate("library");
                      setDemoOpen(false);
                    }}
                  >
                    {
                      ["Con sesiones", "Cargando", "Sin sesiones", "Con error"][
                        index
                      ]
                    }
                  </button>
                ),
              )}
            </div>
          </section>
          <div className="modal-actions">
            <button
              className="button primary"
              onClick={() => setDemoOpen(false)}
            >
              Continuar explorando
            </button>
          </div>
        </Modal>
      )}
      {helpOpen && (
        <Modal
          title="La experiencia tiene mucho que enseñar"
          onClose={() => setHelpOpen(false)}
        >
          <div className="help-content">
            <h3>Si eres senior</h3>
            <p>
              Inicia una llamada de ejemplo, conecta al aprendiz y acepta la
              demostración. Puedes pausar, excluir fragmentos ficticios y
              finalizar cuando quieras.
            </p>
            <h3>Si eres intern</h3>
            <p>
              Abre la biblioteca, elige una sesión y selecciona sus pasos. La
              escena de ejemplo, las razones y las variantes se muestran juntas
              para mantener el contexto.
            </p>
            <h3>En esta etapa</h3>
            <p>
              Los perfiles y procesos de la biblioteca son simulados. La sección
              Videollamada permite comunicarse de verdad cuando LiveKit está
              configurado. Las sesiones que guardes permanecen en este
              navegador; no se envían a un servidor. Tu aprendiz de IA abre una
              conversación individual real con ElevenLabs; sus mensajes no
              generan todavía un Work Map.
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="button primary"
              onClick={() => setHelpOpen(false)}
            >
              Entendido
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
