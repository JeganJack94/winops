import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, RotateCcw, Share2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

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

  const shareWhatsApp = () => {
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const lines = currencyNotes
      .filter(note => Number(denominations[note]) > 0)
      .map(note => {
        const count = denominations[note];
        const subtotal = note * count;
        return `${note} x ${count} = ₹${subtotal.toLocaleString('en-IN')}`;
      });

    if (lines.length === 0) {
      alert("Please enter some denominations first!");
      return;
    }

    const text = `*Win Express – Cash Denomination Report*\nDate: ${today}\n\n${lines.join('\n')}\n\n*Total Amount: ₹${totalCurrency.toLocaleString('en-IN')}*\n*Total Notes: ${totalNotesCount}*`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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

      <div className="max-w-2xl mx-auto">
        
        {/* --- Currency Denomination Counter --- */}
        <Card className="border-emerald-200 dark:border-emerald-900/50 shadow-xl shadow-emerald-100/50 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-4 flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <IndianRupee size={20} className="stroke-[2.5]" />
              <h3 className="font-bold">Cash Denominations</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={shareWhatsApp}
                className="p-2 text-emerald-600 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-lg transition-colors cursor-pointer"
                title="Share on WhatsApp"
              >
                <Share2 size={18} />
              </button>
              <button 
                onClick={clearDenominations}
                className="p-2 text-emerald-600 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-lg transition-colors cursor-pointer"
                title="Clear All"
              >
                <RotateCcw size={18} />
              </button>
            </div>
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
      </div>
    </motion.div>
  );
}
