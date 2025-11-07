import PercentOfNumber from './calculators/PercentOfNumber';
import WhatPercent from './calculators/WhatPercent';
import PercentChange from './calculators/PercentChange';
import PercentIncrease from './calculators/PercentIncrease';
import VATCalculator from './calculators/VATCalculator';
import DiscountCalculator from './calculators/DiscountCalculator';

function CalculatorGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PercentOfNumber />
        <WhatPercent />
        <PercentChange />
        <PercentIncrease />
        <VATCalculator />
        <DiscountCalculator />
      </div>
    </section>
  );
}

export default CalculatorGrid;
