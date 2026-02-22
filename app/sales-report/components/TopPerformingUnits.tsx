import React from 'react';
import UnitCard from './UnitCard';
import type { TopUnit } from '../types';

interface TopPerformingUnitsProps {
  units: TopUnit[];
}

const TopPerformingUnits: React.FC<TopPerformingUnitsProps> = ({ units }) => {
  return (
    <section>
      <h3
        className="text-xl font-bold text-gray-900 mb-4"
        style={{ fontFamily: 'Poppins' }}
      >
        Top performing units
      </h3>
      <div className="space-y-4">
        {units.map((unit) => (
          <UnitCard key={unit.id} unit={unit} />
        ))}
      </div>
    </section>
  );
};

export default TopPerformingUnits;
