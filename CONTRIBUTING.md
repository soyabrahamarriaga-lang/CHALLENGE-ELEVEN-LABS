# Flujo de trabajo compartido

## Una tarea, una rama, un aporte identificable
1. Lee el estado, el challenge, la ontología y los últimos aportes. Consulta issues/PRs para no duplicar trabajo.
2. Define una tarea con resultado, responsable (persona + Claude/Codex), límites y criterios de aceptación. Usa el formulario de GitHub. El estado se sigue en el issue y su PR; una tarea local puede usar un ID explícito hasta tener issue.
3. Parte de `main` actualizado y crea `codex/<tarea>`, `claude/<tarea>` o `human/<tarea>`. Una computadora por clon; no sincronices carpetas `.git` mediante nubes de archivos.
4. Trabaja, prueba y documenta. No dos agentes sobre la misma rama a la vez. Para relevarse, sube el aporte completo y el siguiente agente hace fetch/checkout.
5. Añade una entrada nueva por commit, abre el PR y enlázalo al issue. `context-integrity` tiene que pasar. Al integrar el PR, cierra el issue si cumplió sus criterios.

```sh
git switch main
git pull --ff-only
git switch -c codex/nombre-de-tarea
```

## Código y contexto en el mismo commit
Prepara rutas específicas; revisa el diff antes de registrar. No hay staging automático de archivos desconocidos.

```sh
git add ruta/al/codigo ruta/a/las/pruebas ruta/a/documentacion
python3 scripts/harness.py record \
  --actor codex \
  --operator soyabrahamarriaga-lang \
  --tool codex-desktop \
  --task 'issue-12' \
  --summary 'Describe el comportamiento añadido' \
  --result 'Describe el resultado realmente observado' \
  --decision 'Decisión tomada y razón; o no se adoptaron decisiones nuevas porque...' \
  --ontology 'Conceptos/relaciones que cambiaron, o por qué el modelo sigue vigente' \
  --validation 'Comando ejecutado y resultado real' \
  --next 'Próximo paso concreto'
# Si afecta la ontología o una decisión estructural, añade --adr context/decisions/ADR-NNNN.md.
# Copia la ruta real que imprimió el comando:
git add context/entries/ENTRADA-GENERADA.json
git diff --cached
python3 scripts/harness.py check --staged
git commit -m 'feat: resultado concreto'
git status
git push -u origin HEAD
```

Repite `--decision`, `--validation`, `--next` o `--adr` para añadir varios elementos. Usa `claude` o `abraham` como actor cuando corresponda; registra colaboradores nuevos en `context/actors.json`. Estos IDs son atribución declarada, no firmas verificadas ni cuentas de servicio.

Para registrar una decisión o corregir otra entrada sin cambiar código, usa `record --context-only` con los mismos campos descriptivos. La lista de archivos puede quedar vacía. Una integración pura de ramas conserva las entradas de los aportes originales; no duplica sus logs.

## Revisión y avance en GitHub
- El issue define la tarea; el PR muestra exactamente qué código y texto aporta cada rama. La plantilla del PR enlaza evidencia y relevo.
- Los commits y entradas permiten distinguir a Claude, Codex y humanos aunque se use una sola cuenta GitHub.
- `main` requiere PR y `context-integrity` exitoso con la base actualizada; force push y borrado no están permitidos. Los ajustes efectivos se verifican en Settings → Branches.
- Inicialmente no se exige una aprobación de otra cuenta: solo hay un operador GitHub confirmado y GitHub no permite aprobar el PR propio. Cuando se incorpore otro revisor, puede exigirse una aprobación. CODEOWNERS señala al responsable humano.
- Para mantener la historia de los aportes, usa merge de PR; rebase y squash también deben conservar las entradas que documentan el resultado.
- Los hooks no se distribuyen activos al clonar: ejecuta `python3 scripts/harness.py install` en **cada** computadora.
- No hay monitor periódico activado. Los checks se ejecutan por push/PR; avisos programados son una configuración distinta.

## Decisiones y análisis ontológico
Usa `context/templates/ADR.md` para decisiones estructurales. Documenta problema, evidencia, alternativas, decisión, consecuencias, validación y relación con conceptos. No sobrescribas decisiones para aparentar que siempre se supieron; añade una sustitución explícita.

En cada revisión pregunta: ¿qué entidades existen?, ¿qué significan?, ¿qué relaciones hay?, ¿qué reglas no deben romperse?, ¿qué proviene del experto o del brief y qué es hipótesis?, ¿qué evidencia lo respalda?, ¿qué falta confirmar? El JSON almacena el modelo; la entrada explica el cambio.

## Recuperar un check fallido
- Entrada faltante: prepara el aporte, genera una entrada con `record` y vuelve a hacer commit.
- Archivo no cubierto: antes del commit corrige la entrada todavía no confirmada. Después de un commit, añade una entrada nueva; no reescribas logs compartidos.
- Binario o dependencia: exclúyelo antes del primer commit. Borrarlo en un commit posterior no lo quita de la historia; el check examina también los commits intermedios.
- Commit local inválido todavía no compartido: corrígelo con amend/rebase local y vuelve a pasar los checks. No reescribas `main` ni historia compartida.
- Ontología alterada: crea/enlaza el ADR correspondiente y explica el cambio conceptual.
- Push bloqueado por archivos pendientes: revisa `git status --short --untracked-files=all` y documenta/commitea el aporte completo. No ignores archivos necesarios para superar el check.
- Excepción necesaria a una regla: justifícala en un ADR y revisa el cambio del harness mediante PR; no desactives los controles silenciosamente.

## Límites de la automatización
Se valida estructura, cobertura de rutas, referencias, texto y trazabilidad. No se puede certificar automáticamente que una explicación sea verdadera o suficiente, que el código esté completo para un requisito humano, ni que todas las decisiones mentales hayan sido registradas. Las pruebas de producto se añadirán cuando exista la aplicación; las actuales prueban el harness.
