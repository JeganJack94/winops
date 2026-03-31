import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator as CalcIcon, IndianRupee, RotateCcw, Delete } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Calculator() {
  // --- Currency Denomination Calculator States ---
  const [denominations, setDenominations] = useState({
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
    10: '',
    5: '',
    2: '',
    1: ''
  });

  const currencyNotes = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  const handleDenominationChange = (note, value) => {
    // Only allow positive numbers
    const cleanValue = value.replace(/[^0-9]/g, '');
    setDenominations(prev => ({ ...prev, [note]: cleanValue }));
  };

  const clearDenominations = () => {
    setDenominations({
      500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: ''
    });
  };

  const totalCurrency = useMemo(() => {
    return currencyNotes.reduce((total, note) => {
      const count = Number(denominations[note]) || 0;
      return total + (note * count);
    }, 0);
  }, [denominations]);

  const totalNotesCount = useMemo(() => {
    return currencyNotes.reduce((total, note) => {
      return total + (Number(denominations[note]) || 0);
    }, 0);
  }, [denominations]);


  // --- Standard Calculator States ---
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);

  const handleDigit = (digit) => {
    if (isNewNumber) {
      setDisplay(digit);
      setIsNewNumber(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleOperator = (operator) => {
    if (equation && !isNewNumber) {
      handleEqual();
      setEquation(display + ' ' + operator + ' ');
    } else {
      setEquation(display + ' ' + operator + ' ');
    }
    setIsNewNumber(true);
  };

  const handleEqual = () => {
    if (!equation) return;
    try {
      // Evaluate basic math safely
      const parseStr = equation + display;
      // Note: intentionally using a simple mapped evaluator for safety over pure eval,
      // but typical JS calculator can be simplified with Function constructor for basic math only.
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${parseStr.replace(/×/g, '*').replace(/÷/g, '/')}`)();
      
      // Handle decimals nicely
      const finalResult = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(4)).toString();
      
      setDisplay(finalResult);
      setEquation('');
      setIsNewNumber(true);
    } catch (e) {
      setDisplay('Error');
      setEquation('');
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  };

  const handleDelete = () => {
    if (isNewNumber) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setIsNewNumber(true);
    }
  };

  const handleDecimal = () => {
    if (isNewNumber) {
      setDisplay('0.');
      setIsNewNumber(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleToggleSign = () => {
    if (display !== '0' && display !== 'Error') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-6 pb-12"
    >
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Calculators
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fast cash denomination counting and standard math utilities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* --- Currency Denomination Counter --- */}
        <Card className="border-emerald-200 dark:border-emerald-900/50 shadow-xl shadow-emerald-100/50 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-4 flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <IndianRupee size={20} className="stroke-[2.5]" />
              <h3 className="font-bold">Cash Denominations</h3>
            </div>
            <button 
              onClick={clearDenominations}
              className="p-2 text-emerald-600 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-lg transition-colors cursor-pointer"
              title="Clear All"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {currencyNotes.map(note => (
                <div key={note} className="flex items-center gap-4">
                  <div className="w-20 sm:w-24 flex items-center justify-between font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span>₹</span>
                    <span>{note}</span>
                  </div>
                  <span className="text-gray-400 font-bold">×</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={denominations[note]}
                    onChange={(e) => handleDenominationChange(note, e.target.value)}
                    className="flex-1 max-w-[120px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 transition-all text-center"
                  />
                  <span className="text-gray-400 font-bold ml-2">=</span>
                  <div className="flex-1 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                    ₹{((Number(denominations[note]) || 0) * note).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t-2 border-dashed border-emerald-200 dark:border-emerald-800/60">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Total Notes</p>
                  <p className="font-mono font-bold text-xl text-gray-700 dark:text-gray-300">{totalNotesCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mb-1 tracking-wider uppercase">Grand Total</p>
                  <p className="font-black text-4xl text-emerald-600 dark:text-emerald-400 drop-shadow-sm">
                    ₹{totalCurrency.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* --- Standard Calculator (Theme Style) --- */}
        <div className="w-full max-w-[340px] mx-auto lg:max-w-none lg:w-[340px] lg:ml-auto">
          <div className="bg-[#1c1c1e] dark:bg-[#151517] rounded-[2.5rem] p-5 lg:p-6 shadow-2xl border border-gray-800/20">
            {/* Display */}
            <div className="h-32 flex flex-col justify-end items-end mb-4 px-2">
              <div className="text-gray-400 text-sm h-6 mb-1 font-mono font-medium"> {equation} </div>
              <div className="text-white text-6xl font-light tracking-tight truncate w-full text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {display}
              </div>
            </div>

            {/* Numpad Grid */}
            <div className="grid grid-cols-4 gap-3 lg:gap-4">
              {/* Row 1 */}
              <CalcButton onClick={handleDelete} variant="top" icon={<Delete size={24}/>} />
              <CalcButton onClick={handleClear} variant="top" label="AC" />
              <CalcButton onClick={() => handleOperator('%')} variant="top" label="%" />
              <CalcButton onClick={() => handleOperator('/')} variant="operator" label="÷" />

              {/* Row 2 */}
              <CalcButton onClick={() => handleDigit('7')} variant="number" label="7" />
              <CalcButton onClick={() => handleDigit('8')} variant="number" label="8" />
              <CalcButton onClick={() => handleDigit('9')} variant="number" label="9" />
              <CalcButton onClick={() => handleOperator('*')} variant="operator" label="×" />

              {/* Row 3 */}
              <CalcButton onClick={() => handleDigit('4')} variant="number" label="4" />
              <CalcButton onClick={() => handleDigit('5')} variant="number" label="5" />
              <CalcButton onClick={() => handleDigit('6')} variant="number" label="6" />
              <CalcButton onClick={() => handleOperator('-')} variant="operator" label="−" />

              {/* Row 4 */}
              <CalcButton onClick={() => handleDigit('1')} variant="number" label="1" />
              <CalcButton onClick={() => handleDigit('2')} variant="number" label="2" />
              <CalcButton onClick={() => handleDigit('3')} variant="number" label="3" />
              <CalcButton onClick={() => handleOperator('+')} variant="operator" label="+" />

              {/* Row 5 */}
              <CalcButton onClick={handleToggleSign} variant="number" label="+/-" />
              <CalcButton onClick={() => handleDigit('0')} variant="number" label="0" />
              <CalcButton onClick={handleDecimal} variant="number" label="." />
              <CalcButton onClick={handleEqual} variant="operator" label="=" />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// Custom calc button matching the screenshot grid style
function CalcButton({ onClick, label, icon, variant, className = '' }) {
  const baseStyles = "rounded-full aspect-square flex items-center transition-all active:brightness-125 focus:outline-none";
  let variantStyles = "";
  
  if (variant === 'number') {
    variantStyles = "bg-[#333333] hover:bg-[#404040] text-gray-200 justify-center text-3xl font-normal shadow-sm";
  } else if (variant === 'top') {
    variantStyles = "bg-[#a5a5a5] hover:bg-[#d4d4d2] text-black font-medium justify-center text-2xl shadow-sm";
  } else if (variant === 'operator') {
    variantStyles = "bg-primary hover:bg-primary-hover text-white font-medium justify-center text-3xl shadow-sm";
  }

  return (
    <button onClick={onClick} className={`${baseStyles} ${variantStyles} ${className}`}>
      {icon || label}
    </button>
  );
}
