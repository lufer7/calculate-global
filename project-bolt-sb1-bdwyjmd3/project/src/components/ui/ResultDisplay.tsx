import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ResultDisplayProps {
  value: number;
  label: string;
  suffix?: string;
  progress?: number;
  color?: 'blue' | 'green' | 'red';
}

function ResultDisplay({ value, label, suffix = '', progress, color = 'blue' }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `${value.toFixed(2)}${suffix}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    red: 'from-red-500 to-rose-500',
  };

  const bgColorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const textColorClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    red: 'text-red-700 dark:text-red-300',
  };

  return (
    <div className={`p-4 ${bgColorClasses[color]} rounded-xl border-2 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors duration-300"
          title="Kopyala"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>
      <div className={`text-3xl font-bold ${textColorClasses[color]}`}>
        {value.toFixed(2)} {suffix}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default ResultDisplay;
