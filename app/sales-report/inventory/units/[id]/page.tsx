import React from 'react';
import { notFound } from 'next/navigation';
import UnitPage from '../../components/UnitPage';
import { loadInventoryDataset, mockUnits } from '../../lib/mockData';
import type { InventoryUnit } from '../../types';

interface UnitPageRouteProps {
  params: Promise<{ id: string }>;
}

export default async function UnitPageRoute({ params }: UnitPageRouteProps) {
  const { id } = await params;
  await loadInventoryDataset();
  const unit = mockUnits.find((u: InventoryUnit) => u.id === id);
  if (!unit) notFound();
  return <UnitPage unit={unit} />;
}
