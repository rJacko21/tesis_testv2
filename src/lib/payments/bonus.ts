/**
 * AP extra de un paquete frente al más pequeño, en porcentaje entero
 * redondeado hacia abajo: con 2500 AP por 4,99 € de base, 5500 AP por
 * 9,99 € son «+10 %». `null` si no da más AP por euro que la base.
 */
export function bonusPercent(
  pack: { apAmount: number; priceCents: number },
  base: { apAmount: number; priceCents: number },
): number | null {
  if (pack.priceCents <= 0 || base.priceCents <= 0 || base.apAmount <= 0) return null;
  const ratio = (pack.apAmount / pack.priceCents) * (base.priceCents / base.apAmount);
  const percent = Math.floor(ratio * 100 + 1e-9) - 100;
  return percent > 0 ? percent : null;
}
