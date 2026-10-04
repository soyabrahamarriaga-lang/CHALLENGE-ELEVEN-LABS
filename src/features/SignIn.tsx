import { useState } from "react";
import { ArrowRight, AudioLines, BookOpen } from "lucide-react";
import { Logo } from "../components/Shared";
import { VoiceField } from "../components/VoiceField";
import type { DemoEntry } from "../domain/demoEntry";
import type { Role } from "../domain/types";

export function SignIn({ onEnter, initialRole }: { onEnter: (entry: DemoEntry) => void; initialRole: Role }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState("");
  return <div className="entry-page">
    <header className="entry-header">
      <a href="#" aria-label="UserHelper, inicio"><Logo /></a>
      <span className="entry-header-note">El conocimiento pasa de persona a persona.</span>
      <a className="entry-nav-link" href="#entry-form">Entrar <ArrowRight size={16} /></a>
    </header>
    <main className="entry-stage">
      <VoiceField />
      <h1 className="entry-statement"><span>Tu experiencia.</span><span>tiene voz.</span></h1>
      <section className="entry-panel" aria-labelledby="entry-title" id="entry-form">
        <div className="entry-panel-heading"><h2 id="entry-title">Entra a tu espacio</h2>
          <p>Comparte lo que sabes. Aprende de quien lo vive.</p></div>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) { setError("Escribe tu nombre para continuar."); return; }
          onEnter({ name: name.trim(), role });
        }}>
          <label className="entry-name" htmlFor="entry-name">¿Cómo te llamas?
            <input id="entry-name" name="name" autoComplete="given-name" placeholder="Tu nombre" maxLength={60}
              value={name} onChange={(event) => { setName(event.target.value); setError(""); }}
              aria-invalid={!!error} aria-describedby={error ? "entry-error" : undefined} required />
          </label>
          <fieldset className="entry-roles"><legend>Hoy quiero</legend>
            <label><input type="radio" name="entry-role" value="senior" checked={role === "senior"} onChange={() => setRole("senior")} />
              <span><AudioLines size={18} />Compartir<small>Soy senior</small></span></label>
            <label><input type="radio" name="entry-role" value="intern" checked={role === "intern"} onChange={() => setRole("intern")} />
              <span><BookOpen size={18} />Aprender<small>Soy intern</small></span></label>
          </fieldset>
          {error && <p className="entry-error" id="entry-error" role="alert">{error}</p>}
          <button className="entry-submit" type="submit">Entrar a mi espacio <ArrowRight size={18} /></button>
          <p className="entry-demo-note">Acceso de demostración · Sin cuenta ni contraseña</p>
        </form>
      </section>
    </main>
    <footer className="entry-footer"><p>Una conversación. Una nueva forma de aprender.</p><span>UserHelper · Prototipo 2026</span></footer>
  </div>;
}
