# Bug Template

## Nom del fitxer
`bugs/BUG-XXX.md` on XXX és el número seqüencial (001, 002, etc.)

## Template

```markdown
---
id: BUG-XXX
title: "Títol descriptiu del bug"
status: open
severity: critical | high | medium | low
feature: "Nom de la feature afectada"
created_by: Albert
created_at: YYYY-MM-DD
assigned_to: Nestor | (buit)
---

## Descripció
Descripció clara i concisa del bug.

## Passos per Reproduir
1. Pas 1
2. Pas 2
3. Pas 3
4. ...

## Comportament Actual
Què passa actualment (el bug).

## Comportament Esperat
Què hauria de passar.

## Evidència
- Screenshots: (descripció o path)
- Logs rellevants: ```
- URLs afectades: 

## Context Addicional
Informació extra que pugui ser rellevant (navegador, mòbil/desktop, etc.)

## Historial
- YYYY-MM-DD: Bug creat per Albert
- YYYY-MM-DD: Assignat a [developer]
- YYYY-MM-DD: [developer] marca com fixed
- YYYY-MM-DD: Albert verifica i tanca
```

## Estats

| Estat | Descripció | Qui el canvia |
|-------|-----------|---------------|
| open | Bug reportat, pendent | Albert (creació) |
| in-progress | Developer treballant-hi | El Vell (assignació) |
| fixed | Developer ho ha arreglat | Developer |
| verified | QA ha verificat el fix | Albert |
| closed | Bug tancat definitivament | Albert |

## Severitats

- **critical** - Impedeix usar la feature, crash, pèrdua de dades
- **high** - Feature trencada però workaround existeix
- **medium** - Bug molest però no bloquejant
- **low** - Typos, marges lleugerament desajustats, polish

## Workflow

1. **Albert troba bug** → Crea `bugs/BUG-XXX.md` amb status `open`
2. **El Vell assigna** → Actualitza `assigned_to` i canvia a `in-progress`
3. **Developer arregla** → Canvia a `fixed`, afegeix nota a historial
4. **Albert verifica** → Testa el fix, si OK canvia a `verified` o `closed`
5. **Bug tancat** → Fitxer es queda per històric (no s'esborra)

## Exemple

Veure `bugs/BUG-001.md` com a exemple real.
