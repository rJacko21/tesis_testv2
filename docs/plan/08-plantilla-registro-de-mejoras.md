# 08. Registro de mejoras (plantilla)

Una entrada por cada fallo F-xx cuando se cierre. Es la evidencia de la tesis: qué estaba mal, qué se hizo, por qué así y cómo se demostró.

---

### M-xx · (título corto)

- **Fallo original:** F-xx (enlace a 01-auditoria)
- **Requisito:** RF-xx / RNF-xx
- **Decisión técnica:** ADR-xx
- **Antes:** descripción + captura / métrica (p. ej. LCP móvil 4,8 s)
- **Cambio realizado:** qué se implementó, en qué PR/commit
- **Por qué de esta forma:** alternativas consideradas y motivo de la elección
- **Verificación:** test(s) que lo comprueban + métrica después (p. ej. LCP 1,7 s)
- **Impacto:** usuarios/idiomas/páginas afectadas
- **Fecha:**

---

## Ejemplo

### M-01 · Selector con los 7 idiomas
- **Fallo original:** F-01 (el selector solo muestra EN y DE)
- **Requisito:** RF-02, RNF-04 · **Decisión:** ADR-06
- **Antes:** 5 de 7 versiones inalcanzables desde la interfaz.
- **Cambio:** selector accesible con los 7 idiomas, que conserva la ruta actual.
- **Por qué:** los idiomas existían pero no se podían descubrir; mantener la ruta evita que el usuario pierda su contexto.
- **Verificación:** test e2e "cambiar idioma conserva la ruta" × 7 idiomas; axe sin errores.
