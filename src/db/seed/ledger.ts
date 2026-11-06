/**
 * Reglas del libro mayor de AP, como funciones puras.
 *
 * Las usa el generador de datos y las usará el servicio de compras (T-19):
 * un solo sitio decide si un movimiento es válido.
 *
 * @see RF-05 Tienda con AP · 04-arquitectura §4 (`ap_ledger`)
 */

export interface LedgerEntry {
  delta: number;
  balanceAfter: number;
}

/** Error de negocio: el saldo no alcanza. La interfaz ofrece recargar. */
export class InsufficientApError extends Error {
  constructor(
    readonly balance: number,
    readonly required: number,
  ) {
    super(`Saldo insuficiente: ${balance} AP, se necesitan ${required} AP`);
    this.name = "InsufficientApError";
  }
}

/**
 * Aplica un movimiento a un saldo.
 *
 * @throws InsufficientApError si el saldo quedaría negativo.
 * @throws RangeError si el movimiento es 0 o no es entero.
 */
export function applyDelta(balance: number, delta: number): LedgerEntry {
  if (!Number.isInteger(delta) || delta === 0)
    throw new RangeError(`Movimiento de AP inválido: ${delta}`);
  const balanceAfter = balance + delta;
  if (balanceAfter < 0) throw new InsufficientApError(balance, -delta);
  return { delta, balanceAfter };
}

/** Comprueba que una cadena de movimientos es coherente desde saldo 0. */
export function isConsistent(entries: readonly LedgerEntry[]): boolean {
  let balance = 0;
  for (const entry of entries) {
    balance += entry.delta;
    if (balance < 0 || balance !== entry.balanceAfter) return false;
  }
  return true;
}
