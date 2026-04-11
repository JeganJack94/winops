import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { checklistService } from '../services/checklistService';
import { useToast } from '../hooks/useToast';
import { 
  ClipboardList, 
  Sun, 
  Moon, 
  StickyNote, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  Circle,
  Truck,
  Share2,
  Camera,
  Download,
  QrCode,
  LayoutGrid,
  Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import QRCodeLib from 'qrcode';
import JsBarcode from 'jsbarcode';

const SOD_TASKS = [
  { id: 'sod_1', title: 'Verify Assigned Count', subtitle: 'Check total assigned shipments & note it' },
  { id: 'sod_2', title: 'Handle RTO / Cancel / Pickup', subtitle: 'Create dummy runsheet & bundle all parcels' },
  { id: 'sod_3', title: 'Create Outbound & CF Count', subtitle: 'Generate outbound + note final carry forward' },
  { id: 'sod_4', title: 'Cash Preparation', subtitle: 'Verify cash & prepare denomination notes' },
  { id: 'sod_5', title: 'Sort & Assign Shipments', subtitle: 'Area-wise sorting + assign to riders' }
];

const EOD_TASKS = [
  { id: 'eod_1', title: 'Close Runsheets', subtitle: 'Ensure all runsheets are completed' },
  { id: 'eod_2', title: 'Update WinOps', subtitle: 'Delivery & pickup count update' },
  { id: 'eod_3', title: 'Reconciliation', subtitle: 'Verify each runsheet properly' },
  { id: 'eod_4', title: 'Cash Settlement', subtitle: 'Collect, verify & update cash' },
  { id: 'eod_5', title: 'Share EOD Summary', subtitle: 'WhatsApp update + note next day assigned' }
];

export default function Checklist() {
  const toast = useToast();
  const [activeDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState({
    checkedItems: [],
    outbound: { rto: 0, cancel: 0, pickup: 0, replacement: 0 }
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const unsubData = checklistService.subscribeToChecklist(activeDate, (doc) => {
      if (doc) setData(doc);
    });
    
    const unsubNotes = checklistService.subscribeToNotes((val) => {
      setNotes(val);
    });

    return () => {
      unsubData();
      unsubNotes();
    };
  }, [activeDate]);

  const toggleTask = async (taskId) => {
    const newChecked = data.checkedItems.includes(taskId)
      ? data.checkedItems.filter(id => id !== taskId)
      : [...data.checkedItems, taskId];
    
    await checklistService.updateChecklist(activeDate, { ...data, checkedItems: newChecked });
  };

  const updateOutbound = async (field, value) => {
    const newOutbound = { ...data.outbound, [field]: Number(value) };
    await checklistService.updateChecklist(activeDate, { ...data, outbound: newOutbound });
  };

  const updateNotesLocal = (val) => {
    setNotes(val);
  };

  const handleNotesBlur = async () => {
    await checklistService.updateNotes(notes);
  };

  const outboundTotal = useMemo(() => {
    return Object.values(data.outbound).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [data.outbound]);

  const shareOutbound = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleDateString('en-IN', { month: 'long' });
    
    // Simple ordinal logic
    const j = day % 10, k = day % 100;
    let suffix = "th";
    if (j === 1 && k !== 11) suffix = "st";
    else if (j === 2 && k !== 12) suffix = "nd";
    else if (j === 3 && k !== 13) suffix = "rd";
    
    const dateStr = `${day}${suffix} ${month}`;
    
    const text = `🌞 Good Morning..\n\n${dateStr}\nOutbound created\n------------------\nRTO - ${data.outbound.rto}\nCancel - ${data.outbound.cancel}\nPickup - ${data.outbound.pickup}\nReplacement - ${data.outbound.replacement}\n------------------\nTotal = ${outboundTotal}\n--------------------`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const resetOutbound = async () => {
    if (window.confirm("Are you sure you want to clear all outbound counts?")) {
      const emptyOutbound = { rto: 0, cancel: 0, pickup: 0, replacement: 0 };
      await checklistService.updateChecklist(activeDate, { ...data, outbound: emptyOutbound });
      toast.success("Outbound counts cleared");
    }
  };

  const progress = useMemo(() => {
    const total = SOD_TASKS.length + EOD_TASKS.length;
    return Math.round((data.checkedItems.length / total) * 100);
  }, [data.checkedItems]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ClipboardList size={32} className="text-primary"/>
            Daily CheckList
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium font-mono uppercase tracking-widest text-xs">
            {new Date(activeDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-3 px-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Daily Progress</p>
                <p className="text-sm font-black text-primary">{progress}%</p>
              </div>
              <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary"
                />
              </div>
           </div>
        </div>
      </div>
      
      {/* 🚀 Barcode & QR Generator Section (Moved to Top) */}
      <CodeGenerator />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Checklist */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* SOD Checklist */}
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 rounded-[2.5rem]">
              <CardHeader className="flex flex-row items-center gap-3 border-b-0 pb-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-600">
                  <Sun size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">SOD Checklist</CardTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start of Day Tasks</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {SOD_TASKS.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    isChecked={data.checkedItems.includes(task.id)} 
                    onToggle={() => toggleTask(task.id)}
                  />
                ))}
              </CardContent>
            </Card>

            {/* EOD Checklist */}
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 rounded-[2.5rem]">
              <CardHeader className="flex flex-row items-center gap-3 border-b-0 pb-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600">
                  <Moon size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">EOD Checklist</CardTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End of Day Tasks</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {EOD_TASKS.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    isChecked={data.checkedItems.includes(task.id)} 
                    onToggle={() => toggleTask(task.id)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden">
             <CardHeader className="flex flex-row items-center gap-3 border-b-0 pb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600">
                  <StickyNote size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Temporary Notes</CardTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IDs, Counts, Quick Reminders</p>
                </div>
              </CardHeader>
              <CardContent>
                <textarea 
                  value={notes}
                  onChange={(e) => updateNotesLocal(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Paste shipment IDs or daily counts here..."
                  className="w-full h-40 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed"
                />
              </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <div className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-indigo-600 text-white rounded-[2.5rem] sticky top-8 overflow-hidden">
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black text-xl">Outbound Tracking</h3>
                  <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Daily Shipment Summary</p>
                </div>
              </div>
              <button 
                onClick={resetOutbound}
                title="Reset Counts"
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-indigo-100 hover:text-white"
              >
                <RotateCcw size={18} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <OutboundInput label="RTO" value={data.outbound.rto} onChange={(v) => updateOutbound('rto', v)} />
                <OutboundInput label="Cancel" value={data.outbound.cancel} onChange={(v) => updateOutbound('cancel', v)} />
                <OutboundInput label="Pickup" value={data.outbound.pickup} onChange={(v) => updateOutbound('pickup', v)} />
                <OutboundInput label="Replacement" value={data.outbound.replacement} onChange={(v) => updateOutbound('replacement', v)} />
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-black uppercase tracking-widest text-indigo-100">Total Outbound</span>
                  <span className="text-4xl font-black">{outboundTotal}</span>
                </div>

                <button 
                  onClick={shareOutbound}
                  className="w-full bg-white text-indigo-600 hover:bg-slate-50 py-4 rounded-3xl font-black text-lg shadow-xl shadow-black/10 flex items-center justify-center gap-3 transition-all active:scale-95 border-0"
                >
                  <Share2 size={24}/> Share Details
                </button>
              </div>

              <p className="text-[11px] text-indigo-100 text-center font-medium italic opacity-60">
                Format: Good Morning Template (WhatsApp)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeGenerator() {
  const toast = useToast();
  const [codeValue, setCodeValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [codeType, setCodeType] = useState('both'); // qr, barcode, both
  const codeRef = useRef(null);

  const buildAndShareCanvas = async (mode) => {
    // mode: 'share' | 'download'
    if (!codeValue) return;

    const PAD   = 40;  // padding around the codes
    const GAP   = 32;  // gap between QR and Barcode when showing both
    const QR_SIZE = 260;
    const BAR_W  = 380;
    const BAR_H  = 120;
    const LABEL_H = 28;
    const FONT   = '13px Arial';
    const showQR  = codeType === 'qr'  || codeType === 'both';
    const showBar = codeType === 'barcode' || codeType === 'both';

    try {
      // --- 1. Generate QR image (returns a data-URL PNG) ---
      let qrImg = null;
      if (showQR) {
        const qrDataUrl = await QRCodeLib.toDataURL(codeValue, {
          width: QR_SIZE,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        qrImg = await new Promise((res) => {
          const img = new Image();
          img.onload = () => res(img);
          img.src = qrDataUrl;
        });
      }

      // --- 2. Generate Barcode on an off-screen SVG → PNG ---
      let barImg = null;
      if (showBar) {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svgEl, codeValue, {
          format: 'CODE128',
          width: 2,
          height: BAR_H,
          fontSize: 18,
          background: '#FFFFFF',
          lineColor: '#000000',
          margin: 10,
          displayValue: true,
        });
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        barImg = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => { URL.revokeObjectURL(url); res(img); };
          img.onerror = rej;
          img.src = url;
        });
      }

      // --- 3. Compute canvas dimensions ---
      let canvasW = PAD * 2;
      let canvasH = PAD * 2;

      if (codeType === 'qr') {
        canvasW += QR_SIZE;
        canvasH += QR_SIZE + LABEL_H;
      } else if (codeType === 'barcode') {
        canvasW += BAR_W;
        canvasH += barImg.naturalHeight + LABEL_H;
      } else { // both – side by side
        canvasW += QR_SIZE + GAP + BAR_W;
        canvasH += Math.max(QR_SIZE, barImg.naturalHeight) + LABEL_H;
      }

      // --- 4. Draw onto canvas ---
      const canvas = document.createElement('canvas');
      canvas.width  = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.fillStyle = '#555'
      ctx.font      = FONT;
      ctx.textAlign = 'center';

      let xCursor = PAD;

      if (showQR) {
        ctx.drawImage(qrImg, xCursor, PAD, QR_SIZE, QR_SIZE);
        ctx.fillText('QR Code', xCursor + QR_SIZE / 2, PAD + QR_SIZE + LABEL_H - 6);
        xCursor += QR_SIZE + GAP;
      }
      if (showBar) {
        const bh = barImg.naturalHeight;
        const yOff = showQR ? (QR_SIZE - bh) / 2 : 0; // vertical-center barcode next to QR
        ctx.drawImage(barImg, xCursor, PAD + yOff, BAR_W, bh);
        ctx.fillText('Barcode', xCursor + BAR_W / 2, PAD + Math.max(QR_SIZE, bh) + LABEL_H - 6);
      }

      // --- 5. Share or Download ---
      canvas.toBlob(async (imgBlob) => {
        if (!imgBlob) { toast.error('Failed to create image'); return; }
        const fileName = `Code-${codeValue}-${codeType}.png`;
        const file = new File([imgBlob], fileName, { type: 'image/png' });

        if (mode === 'share' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Shipment Code: ${codeValue}`,
              text: `${codeType.toUpperCase()} code for ${codeValue}`,
            });
          } catch (err) {
            if (err.name !== 'AbortError') downloadFile(imgBlob);
          }
        } else {
          downloadFile(imgBlob);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Code generation failed:', err);
      toast.error('Failed to generate image');
    }
  };

  const handleShareImage = () => buildAndShareCanvas('share');
  const handleDownload   = () => buildAndShareCanvas('download');

  const downloadFile = (blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Code-${codeValue}-${codeType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Image saved successfully');
  };

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600">
            <Truck size={20} />
          </div>
          <div>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Code Generator</CardTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shipment / Order ID Tool</p>
          </div>
        </div>

        {/* Type Selection Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
          <TypeTab 
            active={codeType === 'qr'} 
            onClick={() => setCodeType('qr')} 
            icon={<QrCode size={14}/>} 
            label="QR" 
          />
          <TypeTab 
            active={codeType === 'barcode'} 
            onClick={() => setCodeType('barcode')} 
            icon={<Maximize size={14}/>} 
            label="Bar" 
          />
          <TypeTab 
            active={codeType === 'both'} 
            onClick={() => setCodeType('both')} 
            icon={<LayoutGrid size={14}/>} 
            label="Both" 
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="relative">
              <input 
                type="text"
                value={codeValue}
                onChange={(e) => {
                  setCodeValue(e.target.value.toUpperCase());
                  setShowResults(e.target.value.length > 0);
                }}
                placeholder="Enter ID (e.g. WEXP1234567)"
                className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-slate-200 font-bold"
              />
            </div>
            
            {showResults && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleShareImage}
                  className="col-span-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Camera size={20} /> Share via WhatsApp
                </button>
                <button 
                  onClick={handleDownload}
                  className="col-span-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                >
                  <Download size={18} /> Save PNG
                </button>
              </div>
            )}
          </div>

          {showResults ? (
            <div className="flex-none flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 min-h-[180px]">
              <div 
                id="capture-area"
                ref={codeRef}
                className={`flex flex-col sm:flex-row items-center gap-8 p-6 bg-white rounded-2xl ${codeType === 'both' ? 'min-w-[400px]' : 'min-w-[200px]'} justify-center`}
              >
                {(codeType === 'qr' || codeType === 'both') && (
                  <div className="flex flex-col items-center gap-2">
                    <QRCode 
                      value={codeValue} 
                      size={140} 
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                    <span className="text-[10px] font-black text-slate-400 uppercase">QR Code</span>
                  </div>
                )}
                {(codeType === 'barcode' || codeType === 'both') && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="transform scale-90 origin-center px-4">
                      <Barcode 
                        value={codeValue} 
                        height={70} 
                        width={1.8} 
                        fontSize={14}
                        background="transparent"
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Barcode</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-300 dark:text-slate-700 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
              <CheckCircle2 size={40} className="mb-2 opacity-20"/>
              <p className="text-xs font-black uppercase tracking-widest text-center">Select type & enter ID</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TypeTab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
        active 
          ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TaskItem({ task, isChecked, onToggle }) {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
        isChecked 
          ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 shadow-sm' 
          : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:shadow-md'
      }`}
    >
      <div className={isChecked ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}>
        {isChecked ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </div>
      <div>
        <p className={`text-sm font-black transition-all ${isChecked ? 'text-emerald-700 dark:text-emerald-400 line-through opacity-70' : 'text-slate-700 dark:text-slate-200'}`}>
          {task.title}
        </p>
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
          {task.subtitle}
        </p>
      </div>
    </motion.div>
  );
}

function OutboundInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-xs font-black uppercase tracking-widest text-indigo-100">{label}</label>
      <input 
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-right font-black outline-none focus:ring-2 focus:ring-white/30 transition-all"
      />
    </div>
  );
}
