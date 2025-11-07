import { useState } from 'react';
import CalculatorCard from '../ui/CalculatorCard';
import InputField from '../ui/InputField';
import ResultDisplay from '../ui/ResultDisplay';
import { Plus, Minus } from 'lucide-react';

function PercentIncrease() {
  const [number, setNumber] = useState('');
  const [percent, setPercent] = useState('');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const num = parseFloat(number);
    const perc = parseFloat(percent);

    if (!isNaN(num) && !isNaN(perc)) {
      const change = (num * perc) / 100;
      setResult(operation === 'add' ? num + change : num - change);
    } else {
      setResult(null);
    }
  };

  return (
    <CalculatorCard
      title="Add/Subtract Percent"
      description="Add or subtract a percentage from a number"
      icon={operation === 'add' ? <Plus className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
      example={`Example: 100 + 20% = 120`}
    >
      <div className="space-y-4">
        <InputField
          label="Number"
          value={number}
          onChange={(e) => {
            setNumber(e.target.value);
            calculate();
          }}
          placeholder="100"
          type="number"
        />
        <InputField
          label="Percentage (%)"
          value={percent}
          onChange={(e) => {
            setPercent(e.target.value);
            calculate();
          }}
          placeholder="20"
          type="number"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setOperation('add');
              calculate();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              operation === 'add'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add
          </button>
          <button
            onClick={() => {
              setOperation('subtract');
              calculate();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              operation === 'subtract'
                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Minus className="w-4 h-4 inline mr-2" />
            Subtract
          </button>
        </div>
        {result !== null && (
          <ResultDisplay
            value={result}
            label="Result"
            color={operation === 'add' ? 'green' : 'red'}
          />
        )}
      </div>
    </CalculatorCard>
  );
}

export default PercentIncrease;
