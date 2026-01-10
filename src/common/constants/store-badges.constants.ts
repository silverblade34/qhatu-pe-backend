export const STORE_BADGES = {
  VERIFICADO: 'Verificado',
  TOP_SELLER: 'Top Seller',
  ENVIO_RAPIDO: 'Envío Rápido',
  RESPONDE_RAPIDO: 'Responde Rápido',
  NUEVO: 'Nuevo',
  PREMIUM: 'Premium',
} as const;

export type StoreBadge = keyof typeof STORE_BADGES;

// Función helper para traducir badges
export function translateBadge(badge: string): string {
  return STORE_BADGES[badge as StoreBadge] || badge;
}