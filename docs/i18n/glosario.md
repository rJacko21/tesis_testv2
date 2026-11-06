# Glosario de traducción

Términos que **no se traducen libremente** (ADR-13). Antes de traducir un texto nuevo, comprueba esta lista. Si un término no está, añádelo aquí en el mismo PR.

## Nunca se traducen

| Término                  | Motivo                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| Florensia                | Nombre del juego                                                  |
| Giiku Games GmbH         | Nombre de la empresa                                              |
| AP                       | Moneda de la tienda; es el término del juego en todos los idiomas |
| Flandria (Wiki Flandria) | Nombre propio de la wiki de la comunidad                          |
| PvP                      | Término universal en juegos                                       |

## Traducción fija por idioma

| Clave    | en       | pt-BR              | tr          | it          | de         | fr               | es          |
| -------- | -------- | ------------------ | ----------- | ----------- | ---------- | ---------------- | ----------- |
| Shop     | Shop     | Loja               | Mağaza      | Negozio     | Shop       | Boutique         | Tienda      |
| Rankings | Rankings | Rankings           | Sıralamalar | Classifiche | Ranglisten | Classements      | Rankings    |
| Guild    | Guild    | Guilda             | Lonca       | Gilda       | Gilde      | Guilde           | Gremio      |
| Imprint  | Imprint  | Informações legais | Künye       | Note legali | Impressum  | Mentions légales | Aviso legal |

Los nombres de clases y especializaciones **no se traducen** (decidido en T-12). Son nombres propios del juego y la web original los muestra en inglés en todos los idiomas: Mercenary (Gladiator, Guardian Swordsman), Explorer (Excavator, Sniper), Noble (Court Magician, Magic Knight) y Saint (Priest, Shaman). Lo que sí se traduce es el rol y la descripción (`classes.<id>.*`).

Los números que se interpolan en un mensaje ICU, como el nivel 40 o el año, se pasan como texto. Si no, ICU los formatea con separador de miles ("2,026").

## Tono

- Tuteo en es, pt-BR (você), tr, it, de (du), como la comunidad de juego. En fr se usa _vous_.
- Frases cortas y verbos de acción en botones ("Jugar ahora", "Iniciar sesión").
