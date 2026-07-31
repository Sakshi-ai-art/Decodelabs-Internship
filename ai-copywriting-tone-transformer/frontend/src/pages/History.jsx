import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  ExternalLink,
  Calendar,
  X,
  SlidersHorizontal,
  Linkedin,
  Instagram,
  Mail,
  Twitter,
  Facebook,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';

export default function History() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [tone, setTone] = useState('');

  // Modal Detail state
  const [selectedItem, setSelectedItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const platforms = ['LinkedIn', 'Instagram', 'Email', 'Twitter/X', 'Facebook'];
  const tones = ['Professional', 'Casual', 'Friendly', 'Luxury', 'Persuasive', 'Humorous'];

  const platformIcons = {
    LinkedIn: Linkedin,
    Instagram: Instagram,
    Email: Mail,
    "Twitter/X": Twitter,
    Facebook: Facebook
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await apiService.getHistory({
        search: search || undefined,
        platform: platform || undefined,
        tone: tone || undefined
      });
      setHistoryItems(items);
    } catch (err) {
      setError("Failed to fetch history logs: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter adjustments
  useEffect(() => {
    fetchHistory();
  }, [platform, tone]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this copywriting log from history?")) return;
    
    try {
      await apiService.deleteHistoryItem(id);
      setHistoryItems(historyItems.filter(item => item.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err) {
      alert("Failed to delete item: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCopyToClipboard = (item) => {
    const formatting = item.platform === 'Email' 
      ? `Subject: ${item.headline}\n\nBody:\n${item.content}\n\nCTA Button: ${item.cta}`
      : `${item.headline}\n\n${item.content}\n\n${item.cta}\n\n${(item.hashtags || []).join(' ')}`;
      
    navigator.clipboard.writeText(formatting);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadTxt = (item) => {
    const text = `PRODUCT: ${item.product_name}
PLATFORM: ${item.platform}
TONE: ${item.tone}
TEMPERATURE: ${item.temperature} | TOP-P: ${item.top_p}
DATE: ${new Date(item.timestamp).toLocaleString()}

=========================================
${item.platform === 'Email' ? 'SUBJECT LINE' : 'HEADLINE'}
=========================================
${item.headline}

=========================================
${item.platform === 'Email' ? 'EMAIL BODY' : 'BODY COPY'}
=========================================
${item.content}

=========================================
${item.platform === 'Email' ? 'CTA BUTTON TEXT' : 'CALL TO ACTION (CTA)'}
=========================================
${item.cta}

${item.hashtags && item.hashtags.length > 0 ? `
=========================================
HASHTAGS
=========================================
${item.hashtags.join(' ')}` : ''}
`;

    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `saved-copy-${item.platform.toLowerCase()}-${item.tone.toLowerCase()}-${item.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadPdf = (item) => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`ToneTransformer Copywriting - ${item.platform}`, 20, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Product Name: ${item.product_name}`, 20, 28);
    doc.text(`Tone: ${item.tone}  |  Temp: ${item.temperature}  |  Top-P: ${item.top_p}`, 20, 33);
    doc.text(`Generated On: ${new Date(item.timestamp).toLocaleString()}`, 20, 38);
    
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);
    
    doc.setTextColor(30, 41, 59);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(item.platform === 'Email' ? "Email Subject Line:" : "Headline / Hook:", 20, 52);
    
    doc.setFont("helvetica", "normal");
    const headlineLines = doc.splitTextToSize(item.headline || '', 160);
    doc.text(headlineLines, 20, 58);
    
    let currentY = 58 + (headlineLines.length * 6) + 6;
    
    doc.setFont("helvetica", "bold");
    doc.text(item.platform === 'Email' ? "Email Body Content:" : "Body Copy Caption:", 20, currentY);
    
    doc.setFont("helvetica", "normal");
    const bodyLines = doc.splitTextToSize(item.content || '', 160);
    doc.text(bodyLines, 20, currentY + 6);
    
    currentY = currentY + 6 + (bodyLines.length * 5.5) + 6;
    
    doc.setFont("helvetica", "bold");
    doc.text(item.platform === 'Email' ? "CTA Button Text:" : "Call to Action (CTA):", 20, currentY);
    
    doc.setFont("helvetica", "normal");
    const ctaLines = doc.splitTextToSize(item.cta || '', 160);
    doc.text(ctaLines, 20, currentY + 6);
    
    currentY = currentY + 6 + (ctaLines.length * 6) + 6;
    
    if (item.hashtags && item.hashtags.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Recommended Hashtags:", 20, currentY);
      
      doc.setFont("helvetica", "normal");
      const tagsString = item.hashtags.join(' ');
      const tagLines = doc.splitTextToSize(tagsString, 160);
      doc.text(tagLines, 20, currentY + 6);
    }
    
    doc.save(`saved-copy-${item.platform.toLowerCase()}-${item.id}.pdf`);
  };

  const getPlatformIcon = (itemPlatform) => {
    const Icon = platformIcons[itemPlatform] || HelpCircle;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by Product Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <button type="submit" className="hidden" />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-450 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filters:</span>
          </div>

          {/* Platform filter */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Platforms</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Tone filter */}
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Tones</option>
            {tones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {(search || platform || tone) && (
            <button
              onClick={() => {
                setSearch('');
                setPlatform('');
                setTone('');
                setTimeout(() => fetchHistory(), 50);
              }}
              className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Database Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-500 dark:text-red-400 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {/* Grid view of history cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-12" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6" />
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : historyItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <Trash2 className="w-5 h-5 text-slate-350 dark:text-slate-600" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-white">No saved copywriting logs</h4>
            <p className="text-xs text-slate-400">Try generating a copy set and clicking "Save to History".</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historyItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer flex flex-col justify-between group relative select-text"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[140px]" title={item.product_name}>
                    {item.product_name}
                  </span>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Platform Badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                      {getPlatformIcon(item.platform)}
                      <span>{item.platform}</span>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-3 leading-relaxed">
                  <span className="font-bold block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    {item.platform === 'Email' ? 'Subject' : 'Headline'}
                  </span>
                  {item.headline || item.content}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </span>
                
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(item); }}
                    className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250"
                    title="Copy to Clipboard"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1 rounded bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-550 dark:text-slate-400 dark:hover:text-red-400"
                    title="Delete Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal View for detailed log description */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[85vh] select-text">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{selectedItem.product_name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Platform: {selectedItem.platform}  |  Tone: {selectedItem.tone}
                </p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Headline */}
              <div>
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {selectedItem.platform === 'Email' ? 'Subject Line' : 'Headline / Post Hook'}
                </h5>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  {selectedItem.headline}
                </div>
              </div>

              {/* Content Body */}
              <div>
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {selectedItem.platform === 'Email' ? 'Email Body' : 'Copy Content'}
                </h5>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.content}
                </div>
              </div>

              {/* Call to action */}
              <div>
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {selectedItem.platform === 'Email' ? 'CTA Button Text' : 'Call to Action (CTA)'}
                </h5>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 text-sm font-semibold text-slate-900 dark:text-indigo-400">
                  {selectedItem.cta}
                </div>
              </div>

              {/* Hashtags */}
              {selectedItem.hashtags && selectedItem.hashtags.length > 0 && (
                <div>
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Hashtags
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.hashtags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-300 rounded border border-slate-200/50 dark:border-slate-700/50"
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Model parameters detail */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 font-mono space-y-1.5">
                <p>TEMPERATURE: {selectedItem.temperature}  |  TOP-P: {selectedItem.top_p}</p>
                <p className="select-all block max-h-24 overflow-y-auto border border-dashed border-slate-200 dark:border-slate-800 p-2 rounded whitespace-pre-wrap">
                  COMPILED PROMPT:<br/>{selectedItem.prompt}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => handleCopyToClipboard(selectedItem)}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 bg-white dark:bg-slate-900"
              >
                {copiedId === selectedItem.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownloadTxt(selectedItem)}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 bg-white dark:bg-slate-900"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>TXT</span>
              </button>

              <button
                onClick={() => handleDownloadPdf(selectedItem)}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 bg-white dark:bg-slate-900"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>

              <button
                onClick={(e) => { handleDelete(selectedItem.id, e); }}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-655 dark:text-red-400 hover:text-red-700 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
