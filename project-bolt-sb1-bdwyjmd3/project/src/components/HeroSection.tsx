import { Percent } from 'lucide-react';

function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-2xl mb-6 animate-float">
          <Percent className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          All Your Percentage Calculations
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 mt-2">
            In One Place
          </span>
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Calculate percentages instantly with practical and easy-to-use calculator tools
        </p>
      </div>
    </section>
  );
}

export default HeroSection;
