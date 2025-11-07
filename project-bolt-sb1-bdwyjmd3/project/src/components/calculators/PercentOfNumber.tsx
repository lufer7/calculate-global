import { useState } from 'react';
import CalculatorCard from '../ui/CalculatorCard';
import InputField from '../ui/InputField';
import ResultDisplay from '../ui/ResultDisplay';
import { Calculator } from 'lucide-react';

function PercentOfNumber() {
  const [number, setNumber] = useState('');
  const [percent, setPercent] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const num = parseFloat(number);
    const perc = parseFloat(percent);

    if (!isNaN(num) && !isNaN(perc)) {
      setResult((num * perc) / 100);
    } else {
      setResult(null);
    }
  };

  return (
    <CalculatorCard
      title="Percent of Number"
      description="Calculate a specific percentage of a number"
      icon={<Calculator className="w-6 h-6" />}
      example="Example: 15% of 200 = 30"
    >
      <div className="space-y-4">
        <InputField
          label="Number"
          value={number}
          onChange={(e) => {
            setNumber(e.target.value);
            calculate();
          }}
          placeholder="200"
          type="number"
        />
        <InputField
          label="Percentage (%)"
          value={percent}
          onChange={(e) => {
            setPercent(e.target.value);
            calculate();
          }}
          placeholder="15"
          type="number"
        />
        {result !== null && (
          <ResultDisplay
            value={result}
            label="Result"
            progress={(parseFloat(percent) || 0) > 100 ? 100 : (parseFloat(percent) || 0)}
          />
        )}
      </div>
    </CalculatorCard>
  );
}

export default PercentOfNumber;
