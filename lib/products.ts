export type ProductKey = 'showcase' | 'retouch' | 'cull'

export const PRODUCTS: Record<ProductKey, { name: string; monthly: string; yearly: string; trialDays: number }> = {
  showcase: {
    name: 'Camrhia Showcase',
    monthly: 'price_1UcSpORMBLXaOVMJTVq5AZ1R',
    yearly: 'price_1UcTBrRMBLXaOVMJkuGXSXKe',
    trialDays: 14,
  },
  retouch: {
    name: 'Camri Retouch',
    monthly: 'price_1UcSyMRMBLXaOVMJhQoVc6CQ',
    yearly: 'price_1UcTDuRMBLXaOVMJTiSrxP0h',
    trialDays: 14,
  },
  cull: {
    name: 'Camri Cull',
    monthly: 'price_1UcSz1RMBLXaOVMJhUt69awW',
    yearly: 'price_1UcTEYRMBLXaOVMJqOtGCVyl',
    trialDays: 0,
  },
}

export function productForPrice(priceId?: string | null): ProductKey | null {
  if (!priceId) return null
  for (const key of Object.keys(PRODUCTS) as ProductKey[]) {
    if (PRODUCTS[key].monthly === priceId || PRODUCTS[key].yearly === priceId) return key
  }
  return null
}
