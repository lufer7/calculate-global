import { useState } from 'react';
import CalculatorCard from '../ui/CalculatorCard';
import InputField from '../ui/InputField';
import ResultDisplay from '../ui/ResultDisplay';
import { Receipt } from 'lucide-react';

function VATCalculator() {
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [includeVat, setIncludeVat] = useState(true);
  const [result, setResult] = useState<{ total: number; vat: number; base: number } | null>(null);

  const calculate = () => {
    const amt = parseFloat(amount);
    const rate = parseFloat(vatRate);

    if (!isNaN(amt) && !isNaN(rate)) {
      if (includeVat) {
        const base = amt / (1 + rate / 100);
        const vat = amt - base;
        setResult({ total: amt, vat, base });
      } else {
        const vat = (amt * rate) / 100;
        const total = amt + vat;
        setResult({ total, vat, base: amt });
      }
    } else {
      setResult(null);
    }
  };

  return (
    <CalculatorCard
      title="Tax (VAT) Calculator"
      description="Calculate price with or without tax"
      icon={<Receipt className="w-6 h-6" />}
      example="Example: $100 + 20% tax = $120"
    >
      <div className="space-y-4">
        <InputField
          label={includeVat ? 'Amount (Including Tax)' : 'Amount (Excluding Tax)'}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            calculate();
          }}
          placeholder="100"
          type="number"
        />
        <InputField
          label="Tax Rate (%)"
          value={vatRate}
          onChange={(e) => {
            setVatRate(e.target.value);
            calculate();
          }}
          placeholder="20"
          type="number"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIncludeVat(false);
              calculate();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              !includeVat
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Excl. Tax
          </button>
          <button
            onClick={() => {
              setIncludeVat(true);
              calculate();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              includeVat
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Incl. Tax
          </button>
        </div>
        {result !== null && (
          <div className="space-y-3 mt-4">
            <ResultDisplay
              value={result.base}
              label="Excluding Tax"
              suffix="$"
            />
            <ResultDisplay
              value={result.vat}
              label="Tax Amount"
              suffix="$"
              color="blue"
            />
            <ResultDisplay
              value={result.total}
              label="Total (Including Tax)"
              suffix="$"
              color="green"
            />
          </div>
        )}
      </div>
    </CalculatorCard>
  );
}

export default VATCalculator;
