import { useState } from 'react';
import CalculatorCard from '../ui/CalculatorCard';
import InputField from '../ui/InputField';
import ResultDisplay from '../ui/ResultDisplay';
import { TrendingUp, TrendingDown } from 'lucide-react';

function PercentChange() {
  const [oldValue, setOldValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const old = parseFloat(oldValue);
    const newVal = parseFloat(newValue);

    if (!isNaN(old) && !isNaN(newVal) && old !== 0) {
      const change = ((newVal - old) / Math.abs(old)) * 100;
      setResult(change);
    } else {
      setResult(null);
    }
  };

  const isIncrease = result !== null && result > 0;
  const isDecrease = result !== null && result < 0;

  return (
    <CalculatorCard
      title="Percent Change"
      description="Calculate percentage increase or decrease between two values"
      icon={isIncrease ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
      example="Example: From 100 to 150 is 50% increase"
    >
      <div className="space-y-4">
        <InputField
          label="Old Value"
          value={oldValue}
          onChange={(e) => {
            setOldValue(e.target.value);
            calculate();
          }}
          placeholder="100"
          type="number"
        />
        <InputField
          label="New Value"
          value={newValue}
          onChange={(e) => {
            setNewValue(e.target.value);
            calculate();
          }}
          placeholder="150"
          type="number"
        />
        {result !== null && (
          <ResultDisplay
            value={Math.abs(result)}
            label={isIncrease ? 'Increase' : isDecrease ? 'Decrease' : 'Change'}
            suffix="%"
            progress={Math.abs(result) > 100 ? 100 : Math.abs(result)}
            color={isIncrease ? 'green' : isDecrease ? 'red' : 'blue'}
          />
        )}
      </div>
    </CalculatorCard>
  );
}

export default PercentChange;
