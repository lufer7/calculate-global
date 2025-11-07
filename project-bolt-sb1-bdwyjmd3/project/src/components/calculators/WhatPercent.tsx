import { useState } from 'react';
import CalculatorCard from '../ui/CalculatorCard';
import InputField from '../ui/InputField';
import ResultDisplay from '../ui/ResultDisplay';
import { Percent } from 'lucide-react';

function WhatPercent() {
  const [part, setPart] = useState('');
  const [whole, setWhole] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const partNum = parseFloat(part);
    const wholeNum = parseFloat(whole);

    if (!isNaN(partNum) && !isNaN(wholeNum) && wholeNum !== 0) {
      setResult((partNum / wholeNum) * 100);
    } else {
      setResult(null);
    }
  };

  return (
    <CalculatorCard
      title="What Percent?"
      description="Find what percentage one number is of another"
      icon={<Percent className="w-6 h-6" />}
      example="Example: 30 is 15% of 200"
    >
      <div className="space-y-4">
        <InputField
          label="Part (Number)"
          value={part}
          onChange={(e) => {
            setPart(e.target.value);
            calculate();
          }}
          placeholder="30"
          type="number"
        />
        <InputField
          label="Whole (Total)"
          value={whole}
          onChange={(e) => {
            setWhole(e.target.value);
            calculate();
          }}
          placeholder="200"
          type="number"
        />
        {result !== null && (
          <ResultDisplay
            value={result}
            label="Percentage"
            suffix="%"
            progress={result > 100 ? 100 : result}
          />
        )}
      </div>
    </CalculatorCard>
  );
}

export default WhatPercent;
