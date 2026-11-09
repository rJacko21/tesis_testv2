# Registro de mejoras: diseño visual

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-43 · Portada con menos recursos de plantilla

- **Requisito:** RF-01 (portada), P6 (fidelidad a la identidad) · **Decisión:** ADR-15 (presupuesto de JS)
- **Motivo:** revisión con la skill `frontend-design`, que enumera los rasgos que delatan una página generada por IA. La portada tenía varios:
  - una etiqueta en mayúsculas sobre el título que repetía el lema;
  - todos los títulos de sección centrados;
  - tres tarjetas iguales con un icono en un círculo (el «kit de tarjetas SaaS»);
  - y una flecha pegada al enlace «Todas las noticias».
- **Antes:** portada correcta, pero intercambiable con la de cualquier otro juego.
- **Cambio:**
  - **Cabecera:** sin etiqueta; el nombre del juego es el titular, más grande, como un logotipo. Fondo de horizonte al atardecer hecho solo con CSS: una luna baja tras el personaje y una línea dorada donde el cielo toca el mar. El personaje queda por delante de la ola, saliendo del mar hacia la página. Es el único adorno: el resto de la página queda sobrio.
  - **Tierra y mar:** un solo bloque partido en dos, pergamino para tierra y azul marino para mar, porque en el juego son dos progresiones distintas (nivel y ranking de tierra y de mar). El gremio va debajo, con enlace a los rankings. Los iconos de nivel del juego se amplían al doble exacto y en píxeles.
  - **Títulos de sección:** alineados a la izquierda, como el texto.
  - **Enlaces:** «Todas las noticias» subrayado y sin flecha.
- **Por qué de esta forma:**
  - Se mantienen la paleta, las tipografías (Alegreya y Nunito) y las ilustraciones de la web original (P6). Cambia cómo se usan, no la identidad.
  - Todo es CSS y SVG en el servidor: **0 bytes de JavaScript** y ninguna imagen nueva. El halo con `blur` se sustituye por un degradado radial, que es más barato de pintar.
  - La composición tierra/mar dice lo mismo que el texto, en lugar de repetir tres veces la misma caja.
- **Verificación:**
  - `pnpm js:budget`: sin cambios (margen de 4 860 B en la ruta más pesada).
  - e2e de portada, accesibilidad (axe en los 7 idiomas), navegación y tienda: 363 pasan.
- **Revisión:** en la misma mejora se probó un arte provisional más claro para la tienda. Armando prefirió los bloques de color originales (2026-11-09) y se restauraron.
  - Capturas antes/después en 1440 × 900 y 390 × 844 revisadas a mano.
- **Fecha:** 2026-11-09
