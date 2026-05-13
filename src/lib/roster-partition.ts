/** `is_starter !== false` cuenta como titular (incluye undefined/null por compatibilidad). */
export function partitionRosterByStarter<T extends { is_starter?: boolean | null }>(
  athletes: T[],
): { titulares: T[]; suplentes: T[] } {
  const titulares = athletes.filter((a) => a.is_starter !== false)
  const suplentes = athletes.filter((a) => a.is_starter === false)
  return { titulares, suplentes }
}

export function isRosterTitular(isStarter?: boolean | null): boolean {
  return isStarter !== false
}
