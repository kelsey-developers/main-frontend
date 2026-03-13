import { apiClient } from '@/lib/api/client';
import type { ChargeType } from '../types';

type PricingModel =
  | 'PER_BOOKING'
  | 'PER_NIGHT'
  | 'PER_PERSON'
  | 'PER_PERSON_PER_NIGHT'
  | 'MANUAL';

type BackendChargeType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  defaultAmount?: number | string | null;
  pricingModel: PricingModel;
  isActive: boolean;
};

type ListResponse = { chargeTypes: BackendChargeType[] };

const labelForPricingModel = (model: PricingModel): string => {
  switch (model) {
    case 'PER_BOOKING':
      return 'Per booking';
    case 'PER_NIGHT':
      return 'Per night';
    case 'PER_PERSON':
      return 'Per person (extra guests)';
    case 'PER_PERSON_PER_NIGHT':
      return 'Per person per night';
    case 'MANUAL':
      return 'Manual only';
  }
};

export async function fetchChargeTypes(): Promise<ChargeType[]> {
  const data = await apiClient.get<ListResponse>('/api/market/charge-types');
  const list = data.chargeTypes ?? [];
  return list
    .filter((ct) => ct.isActive)
    .map((ct) => ({
      id: ct.id,
      name: ct.name,
      description: ct.description ?? labelForPricingModel(ct.pricingModel),
      defaultAmount:
        ct.defaultAmount === null || ct.defaultAmount === undefined
          ? undefined
          : Number(ct.defaultAmount),
      appliedToBills: ct.pricingModel !== 'MANUAL',
      exampleLabel: `Configured in Admin (${ct.code})`,
    }));
}

