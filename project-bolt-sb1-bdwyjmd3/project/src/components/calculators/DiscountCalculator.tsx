import { useState } from 'react';
import CalculatorCard from '../ui/CalculatorCard';
import InputField from '../ui/InputField';
import ResultDisplay from '../ui/ResultDisplay';
import { Tag } from 'lucide-react';

function DiscountCalculator() {
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [result, setResult] = useState<{ final: number; saved: number } | null>(null);

  const calculate = () => {
    const price = parseFloat(originalPrice);
    const discount = parseFloat(discountPercent);

    if (!isNaN(price) && !isNaN(discount)) {
      const saved = (price * discount) / 100;
      const final = price - saved;
      setResult({ final, saved });
    } else {
      setResult(null);
    }
  };

  return (
    <CalculatorCard
      title="Discount Calculator"
      description="Calculate discounted price and savings amount"
      icon={<Tag className="w-6 h-6" />}
      example="Example: 30% discount on $500 = $350"
    >
      <div className="space-y-4">
        <InputField
          label="Original Price"
          value={originalPrice}
          onChange={(e) => {
            setOriginalPrice(e.target.value);
            calculate();
          }}
          placeholder="500"
          type="number"
        />
        <InputField
          label="Discount Rate (%)"
          value={discountPercent}
          onChange={(e) => {
            setDiscountPercent(e.target.value);
            calculate();
          }}
          placeholder="30"
          type="number"
        />
        {result !== null && (
          <div className="space-y-3 mt-4">
            <ResultDisplay
              value={result.saved}
              label="You Save"
              suffix="$"
              color="green"
              progress={parseFloat(discountPercent) || 0}
            />
            <ResultDisplay
              value={result.final}
              label="Final Price"
              suffix="$"
              color="blue"
            />
          </div>
        )}
      </div>
    </CalculatorCard>
  );
}

export default DiscountCalculator;
