# 07. Preguntas y respuestas de Armando

Respondidas el 2026-11-06. Cada respuesta indica qué cambió en el plan.

| # | Pregunta | Respuesta | Cambio en el plan |
|---|---|---|---|
| Q1 | Fecha de entrega | Lo antes posible | Calendario comprimido a 10 semanas con un orden que deja una versión demostrable cuanto antes (05) |
| Q2 | Despliegue | Coste cero, que sirva para la presentación y para comparar CWV simulando tráfico | ADR-12 (hosting gratuito) y ADR-14 (metodología de medición) |
| Q3 | Alcance | Todas las funciones de la web actual. Compras de la tienda con AP. Recarga de AP vía Xsolla, que puede omitirse | ADR-09 reescrito: Xsolla en sandbox si es viable, si no un proveedor simulado con la misma interfaz |
| Q4 | Relación con Giiku Games | Sin acceso a datos. Permiso para usar BGM, SFX, nombre, diseños de personajes y arte | Datos sintéticos (ADR-10); assets oficiales permitidos. Se documenta el permiso en la tesis (anexo) |
| Q5 | Panel de administración | Sí, básico y ampliable | RF-12 dividido en núcleo (fase 4) y ampliaciones futuras |
| Q6 | Revisión de traducciones | Nadie | ADR-13: glosario + traducción automática + revisión cruzada con LLM + pseudolocalización; se declara como limitación |
| Q7 | Norma | Ninguna exigida; usar ISO/IEC/IEEE 29148 | 03 reestructurado como SRS según 29148 |
| Q8 | Framework | Next.js | ADR-01 aceptada |
| Q9 | Acceso con sesión | ¿Hay otra forma? | Ver abajo |

## Q9: cómo completar la auditoría con sesión

**Resuelta el 2026-11-06:** Armando instaló la extensión en Microsoft Edge y la auditoría con sesión se hizo desde su navegador (01-auditoria §10).

No puedo ver tu navegador solo porque inicies sesión en él. Hay tres caminos, del más completo al menos:

1. **Extensión Claude in Chrome** (recomendado). Instalas la extensión desde https://claude.ai/chrome, entras con la misma cuenta de Claude e inicias sesión en florensia-online.com. Entonces abro pestañas en tu Chrome, recorro la cuenta solo leyendo y paso Lighthouse. Es lo único que me permite medir los Core Web Vitals yo mismo.
2. **Tú navegas y me pasas el material.** Para cada página de la cuenta (perfil, saldo de AP, historial, recarga, cambio de contraseña/email, personajes): una captura en móvil y escritorio y el HTML guardado con Ctrl+S. Más un informe de Lighthouse en móvil de la portada, tienda, rankings, una noticia y la landing (DevTools → Lighthouse → exportar JSON).
3. **Solo métricas públicas.** https://pagespeed.web.dev con la URL de la portada; me pegas el enlace del informe.

## Preguntas nuevas

| # | Pregunta | Valor por defecto |
|---|---|---|
| Q10 | ¿Cuántas horas por semana puedes dedicar? | **Respondida:** pocas; Claude lleva el desarrollo, consulta lo necesario y documenta bien el código |
| Q11 | ¿Tienes tarjeta para Oracle Cloud? | **Respondida:** no. ADR-12 revisada: Vercel Hobby + MySQL gratuito de Aiven, pruebas de carga en Docker |
| Q12 | ¿Dominio propio o subdominio gratuito? | **Respondida:** gratuito por ahora (`*.vercel.app`) |
| Q13 | Para empezar a programar, ¿puedes crear un repositorio vacío en GitHub y conectar tu cuenta de GitHub a Claude? | Pendiente |
