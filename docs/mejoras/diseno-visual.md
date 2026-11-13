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

### M-44 · Rediseño con tema oscuro y claro, como el launcher oficial

- **Requisito:** RF-01 (portada), RF-02 (navegación), RNF-01 (rendimiento), RNF-03 (accesibilidad), P6 (fidelidad a la identidad) · **Decisión:** ADR-15 (presupuesto de JS)
- **Motivo:** Armando preparó un mockup con Google Stitch («Oceanic Fantasy MMORPG») y pidió acercar la web a él, con modo oscuro y claro y animaciones ligeras. El mockup sigue la imagen actual del juego: el launcher oficial es marino oscuro, con panel de noticias translúcido, chapas doradas y botón «Play» celeste.
- **Antes:** un solo tema (pergamino), tipografías Alegreya y Nunito y portada de M-43.
- **Cambio:**
  - **Dos temas.** El oscuro usa la paleta del launcher; el claro es el pergamino que ya había. Arranca según el sistema del usuario (`prefers-color-scheme`) y el botón de la cabecera lo cambia; la elección se guarda en `localStorage`.
  - **Tipografías.** Cinzel en títulos y Plus Jakarta Sans en texto, alojadas en el propio servidor con `next/font`.
  - **Cabecera** fija y translúcida, con el ancla del logotipo y el botón de tema.
  - **Portada** con la distribución del mockup: escena del juego a todo el ancho, dos botones y cuatro datos; rejilla de características con una tarjeta grande (sistema de combate doble) y cuatro pequeñas; noticias y promociones; clases en pestañas con sus dos evoluciones; y bloque final de descarga con los requisitos.
  - **Botón principal** celeste, como el «Play» del launcher. El dorado queda para chapas, moneda y títulos sobre fondo marino.
  - **Animaciones ligeras:** las tarjetas aparecen al entrar en pantalla, se elevan y brillan al pasar el ratón y el panel de clase entra con un fundido.
- **Qué se tomó del mockup y qué no:**
  - Se toma: paleta, tipografías, distribución, línea de luz en el borde de las tarjetas, vidrio en la cabecera.
  - No se toma tal cual: Tailwind desde su CDN (compila los estilos en el navegador), la fuente de iconos Material Symbols y los 12 grosores de fuente (1,1 MB medidos), ni el `backdrop-filter` en 29 elementos. Tampoco los datos que no se pueden comprobar (nombre y ping del servidor, tamaño del instalador, «multiplataforma»): el juego es solo para Windows, con el launcher oficial o Steam, y la versión del cliente es la 2.7.1.
- **Por qué de esta forma:**
  - **El tema son variables, no clases.** Los componentes usan colores con significado (`bg-surface`, `text-heading`, `text-link`…) y el tema oscuro solo cambia el valor de esas variables en `globals.css`. No hay clases `dark:` repartidas por 80 ficheros y una página nueva sale bien en los dos temas sin hacer nada.
  - **Sin parpadeo.** Un script en línea de ~200 bytes pone `data-theme` en `<html>` antes de pintar. Sin JavaScript manda la media query del sistema.
  - **El botón de tema no añade un componente cliente.** Es marcado del servidor; el clic lo atiende `HeaderBehavior`, que ya escuchaba la cabecera.
  - **Pestañas de clases sin JavaScript.** Son `radio` nativos y el panel se muestra con `:has()`. Se manejan con el teclado y las imágenes de las pestañas cerradas no se descargan.
  - **Animaciones solo con CSS** y solo de `transform` y `opacity`, que no recalculan el diseño. La aparición usa `animation-timeline: view()`; donde no existe, el contenido se ve sin animación. Con «reducir movimiento» no se anima nada. La cabecera de la portada no se anima: animar el LCP lo retrasa.
  - **Un solo `backdrop-filter`** (la cabecera). Desenfocar muchas capas hace que el scroll vaya a tirones en móviles modestos.
  - **Fuentes variables:** un fichero por alfabeto cubre todos los grosores. Las fuentes de la web pesan 99 KB en total, frente a 302 KB con Alegreya y Nunito.
  - **Cinzel se precarga** (15 KB). Sin precarga, el titular cambiaba de número de líneas al llegar la fuente y empujaba el contenido (CLS 0,037 medido); con ella, CLS 0.
  - **Las escenas** son pantallas de carga del cliente del juego (`Data/UI/SplashImage`), recortadas y pasadas a WebP (30 a 108 KB). Solo la de la cabecera se carga con prioridad.
- **Verificación** (Lighthouse móvil, mediana de 3, en local; antes → después):
  - Portada: LCP 1,64 s → 1,71 s · CLS 0,001 → 0,000 · rendimiento 0,97 → 0,96 · accesibilidad 1,00 → 1,00 · peso 390 KB → 399 KB.
  - Tienda: LCP 1,58 s → 1,72 s · CLS 0 → 0 · rendimiento 0,96 → 0,95 · accesibilidad 1,00 → 1,00.
  - El LCP sube unos 0,1 s porque la cabecera ahora es una escena a todo el ancho; sigue por debajo del límite de 2,0 s.
  - `pnpm js:budget`: la ruta más pesada sigue siendo la del panel de promociones; portada y tienda quedan en 147 773 B de 153 600 B.
  - `contrast.test.ts` comprueba ahora cada par texto/fondo en los dos temas (72 comprobaciones, mínimo 4.5:1).
  - e2e nuevos: cambio de tema y recuerdo al recargar, tema según el sistema, pestañas de clases.
- **Fecha:** 2026-11-13
