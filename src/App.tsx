import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  GitBranch,
  BookOpen,
  Bookmark,
  ChevronRight,
  FlaskConical,
  HelpCircle,
  Home,
  Menu,
  PanelLeftClose,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LibraryStatus, Role } from "./domain/types";
import { Logo, Avatar, EmptyState, Modal } from "./components/Shared";
import { Senior } from "./features/Senior";
import { InternHome, Library } from "./features/Library";
import { SessionDetail } from "./features/SessionDetail";
import { demoRepository } from "./services/sessionRepository";
import { parseRoute } from "./domain/navigation";
const ProcessMaps = lazy(() => import("./features/ProcessMaps"));
import "./features/LiveCall.css";
function readRoute() {
  return parseRoute(window.location.hash);
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
  const [sessions] = useState(() => demoRepository.list());
  const [saved, setSaved] = useState(loadSaved);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>("ready");
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (route.canonicalHash) {
      window.history.replaceState(null, "", route.canonicalHash);
    }
  }, [route.canonicalHash]);
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
  const navigate = (view: string, id = "", role: Role = route.role) => {
    window.location.hash = role + "/" + view + (id ? "/" + id : "");
    setMenuOpen(false);
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
    route.view === "processes"
      ? "Mapas de procesos"
      : route.view === "home"
          ? route.role === "senior"
            ? "Mi espacio"
            : "Mi aprendizaje"
          : route.view === "saved"
            ? "Guardadas"
            : route.view === "session"
              ? "Explorar una experiencia"
              : "Biblioteca";
  const currentSession = sessions.find((s) => s.id === route.id);
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
          <span className="workspace-avatar"><AudioLines size={18} /></span>
          <span>
            UserHelper<small>Conversación con tu agente</small>
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
          <button className={route.view === "processes" ? "selected" : ""}
            aria-current={route.view === "processes" ? "page" : undefined}
            onClick={() => navigate("processes")}>
            <GitBranch size={19}/> Mapas de procesos
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
            Explorar la biblioteca demo
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
              {route.view !== "home" && <>Mi espacio<ChevronRight size={14} /></>}
              <strong>{sectionTitle}</strong>
            </span>
          </div>
          {route.view === "processes" ? (
            <span className="real-call-badge"><GitBranch size={16}/>Bóveda privada</span>
          ) : route.view === "home" ? (
            <span className="real-call-badge">
              <AudioLines size={16} />
              {route.role === "intern" ? "Tutor de procesos" : "Conversación con el agente"}
            </span>
          ) : (
            <button className="demo-badge" onClick={() => setDemoOpen(true)}>
              <FlaskConical size={14} />
              Demo interactiva
              <span className="demo-badge-detail">· Sin grabación real</span>
            </button>
          )}
        </header>
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
            <Senior />
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
          {route.view === "processes" && (
            <Suspense fallback={<p role="status">Preparando mapas…</p>}>
              <ProcessMaps id={route.id} onOpen={(id) => navigate("processes", id)}/>
            </Suspense>
          )}
          {!["home", "library", "saved", "session", "processes"].includes(
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
          title="Explora la biblioteca de ejemplo"
          onClose={() => setDemoOpen(false)}
        >
          <p className="modal-description">
            Prueba los estados de la biblioteca con datos de ejemplo.
            Estos controles solo cambian cómo se muestra la biblioteca.
          </p>
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
              Abre Mi espacio e inicia una conversación con tu agente.
              Acepta el envío de voz o mensajes y elige hablar o escribir.
              Puedes compartir pantalla y terminar la conversación cuando quieras.
            </p>
            <h3>Si eres intern</h3>
            <p>
              En Mi aprendizaje puedes conversar con tu tutor por voz o texto.
              Abre la biblioteca, elige una sesión y selecciona sus pasos. La
              escena de ejemplo, las razones y las variantes se muestran juntas
              para mantener el contexto.
            </p>
            <h3>En esta etapa</h3>
            <p>
              Los perfiles y procesos de la biblioteca son ejemplos.
              Mi espacio conecta con tu agente de ElevenLabs. Si la bóveda
              está configurada, allí se guardan las transcripciones; puedes
              consultar sus diagramas en Mapas de procesos.
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
