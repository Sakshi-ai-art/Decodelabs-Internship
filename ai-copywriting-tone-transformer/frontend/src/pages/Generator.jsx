import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  Download, 
  Database,
  ArrowRight,
  HelpCircle,
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';

export default function Generator() {
  // Form states
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [tone, setTone] = useState('Professional');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(1000);
  
  // App UI states
  const [loading, setLoading] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Result states
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [variations, setVariations] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [savedIndex, setSavedIndex] = useState(null);

  const platforms = ['LinkedIn', 'Instagram', 'Email', 'Twitter/X', 'Facebook'];
  const tones = ['Professional', 'Casual', 'Friendly', 'Luxury', 'Persuasive', 'Humorous'];

  const getPromptPreview = () => {
    const base = `You are an expert marketing copywriter.

Product Name: ${productName || '[Product Name]'}
Description: ${productDescription || '[Product Description]'}
Platform: ${platform}
Tone: ${tone}

Generate high-converting marketing content specifically optimized for the selected platform.
Include relevant hashtags where appropriate.
Keep formatting suitable for the platform.`;

    const platformRules = {
      LinkedIn: "- Tone & Style: Professional, business-focused, authoritative, yet engaging.\n- Length: 150-300 words.\n- Format: Structured paragraphs with clear key points, industry insights, and professional hooks.",
      Instagram: "- Tone & Style: Engaging, visually appealing, friendly, and relatable.\n- Emojis: Generous use of relevant emojis to break up text and draw attention.\n- Length: Light-to-medium caption.\n- Hashtags: Integrate a list of 5-15 highly relevant hashtags at the bottom.",
      Email: "- Format: Structure your copy explicitly as an Email with a Subject Line, Body, and a Call to Action (CTA) Button Text.\n- Tone & Style: Informative, direct, and persuasive, written to encourage click-through rates.",
      "Twitter/X": "- Length: STRICTLY under 280 characters in total.\n- Style: High-impact, concise, catchy hook, and immediate value proposition. Use 1-2 hashtags maximum.",
      Facebook: "- Tone & Style: Storytelling, conversational, relatable, and narrative-focused.\n- Length: Medium length (around 100-200 words) that builds community engagement and invites comments."
    };

    const toneInstructions = {
      Professional: "Write in an authoritative, expert, clear, and business-focused tone, using industry-appropriate terminology without jargon.",
      Casual: "Write in an informal, relaxed, everyday conversational style. Use friendly contractions and keep it down-to-earth.",
      Friendly: "Write in a warm, welcoming, positive, and supportive manner that establishes trust and connection with the reader.",
      Luxury: "Write in an elegant, sophisticated, exclusive, and premium tone. Emphasize high quality, craftsmanship, prestige, and unique value.",
      Persuasive: "Write in a highly compelling, benefits-driven, call-to-action focused tone. Use psychological triggers, highlight solutions to problems, and emphasize urgency.",
      Humorous: "Write in a witty, lighthearted, clever, and entertaining manner. Use wordplay, gentle sarcasm, or situational humor where appropriate to make the copy memorable."
    };

    return `${base}\n\nPlatform-Specific Guidelines for ${platform}:\n${platformRules[platform] || ''}\n\nTone Guidance for '${tone}':\n${toneInstructions[tone] || ''}`;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!productName || !productDescription) {
      setError("Please fill out the Product Name and Description fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setVariations([]);
    setSavedIndex(null);

    try {
      const result = await apiService.generateCopy({
        product_name: productName,
        product_description: productDescription,
        platform,
        tone,
        temperature: parseFloat(temperature),
        top_p: parseFloat(topP),
        max_tokens: parseInt(maxTokens)
      });
      
      setVariations(result.variations);
      setGeneratedPrompt(result.prompt);
      setActiveTab(0);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to generate copy. Please check your network and OpenAI API keys.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDb = async (index) => {
    const variation = variations[index];
    try {
      await apiService.saveContent({
        product_name: productName,
        platform,
        tone,
        prompt: generatedPrompt,
        headline: variation.headline,
        content: variation.content,
        cta: variation.cta,
        hashtags: variation.hashtags || [],
        temperature: parseFloat(temperature),
        top_p: parseFloat(topP)
      });
      
      setSavedIndex(index);
      setSuccessMessage("Variation saved successfully to history database!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to save content: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCopyToClipboard = (index) => {
    const variation = variations[index];
    const formatting = platform === 'Email' 
      ? `Subject: ${variation.headline}\n\nBody:\n${variation.content}\n\nCTA Button: ${variation.cta}`
      : `${variation.headline}\n\n${variation.content}\n\n${variation.cta}\n\n${(variation.hashtags || []).join(' ')}`;
      
    navigator.clipboard.writeText(formatting);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadTxt = (index) => {
    const variation = variations[index];
    const text = `PRODUCT: ${productName}
PLATFORM: ${platform}
TONE: ${tone}
TEMPERATURE: ${temperature} | TOP-P: ${topP}
DATE: ${new Date().toLocaleDateString()}

=========================================
${platform === 'Email' ? 'SUBJECT LINE' : 'HEADLINE'}
=========================================
${variation.headline}

=========================================
${platform === 'Email' ? 'EMAIL BODY' : 'BODY COPY'}
=========================================
${variation.content}

=========================================
${platform === 'Email' ? 'CTA BUTTON TEXT' : 'CALL TO ACTION (CTA)'}
=========================================
${variation.cta}

${variation.hashtags && variation.hashtags.length > 0 ? `
=========================================
HASHTAGS
=========================================
${variation.hashtags.join(' ')}` : ''}
`;

    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `copy-${platform.toLowerCase()}-${tone.toLowerCase()}-v${index + 1}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadPdf = (index) => {
    const variation = variations[index];
    const doc = new jsPDF();
    
    // Title header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`ToneTransformer Copywriting - ${platform}`, 20, 20);
    
    // Metadata
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Product Name: ${productName}`, 20, 28);
    doc.text(`Tone: ${tone}  |  Temp: ${temperature}  |  Top-P: ${topP}`, 20, 33);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 20, 38);
    
    // Draw boundary line
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);
    
    doc.setTextColor(30, 41, 59); // Slate-800
    
    // Headline
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(platform === 'Email' ? "Email Subject Line:" : "Headline / Hook:", 20, 52);
    
    doc.setFont("helvetica", "normal");
    const headlineLines = doc.splitTextToSize(variation.headline, 160);
    doc.text(headlineLines, 20, 58);
    
    let currentY = 58 + (headlineLines.length * 6) + 6;
    
    // Body Content
    doc.setFont("helvetica", "bold");
    doc.text(platform === 'Email' ? "Email Body Content:" : "Body Copy Caption:", 20, currentY);
    
    doc.setFont("helvetica", "normal");
    const bodyLines = doc.splitTextToSize(variation.content, 160);
    doc.text(bodyLines, 20, currentY + 6);
    
    currentY = currentY + 6 + (bodyLines.length * 5.5) + 6;
    
    // CTA
    doc.setFont("helvetica", "bold");
    doc.text(platform === 'Email' ? "CTA Button Text:" : "Call to Action (CTA):", 20, currentY);
    
    doc.setFont("helvetica", "normal");
    const ctaLines = doc.splitTextToSize(variation.cta, 160);
    doc.text(ctaLines, 20, currentY + 6);
    
    currentY = currentY + 6 + (ctaLines.length * 6) + 6;
    
    // Hashtags
    if (variation.hashtags && variation.hashtags.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Recommended Hashtags:", 20, currentY);
      
      doc.setFont("helvetica", "normal");
      const tagsString = variation.hashtags.join(' ');
      const tagLines = doc.splitTextToSize(tagsString, 160);
      doc.text(tagLines, 20, currentY + 6);
    }
    
    doc.save(`copy-${platform.toLowerCase()}-${tone.toLowerCase()}-v${index + 1}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Input Side - 5 columns */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Sliders className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Generator Settings</h3>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Product Name */}
            <div>
              <label htmlFor="productName" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Product Name
              </label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. FitPulse Smartwatch"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Product Description
              </label>
              <textarea
                id="description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product's key features, target market, benefits, and special offers..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                required
              />
            </div>

            {/* Target Platform & Tone in grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="platform" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Target Platform
                </label>
                <select
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer"
                >
                  {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="tone" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer"
                >
                  {tones.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Advanced Parameter Tuning Slider Toggle */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setShowParameters(!showParameters)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-all uppercase tracking-wider"
              >
                <span>Advanced Model Options</span>
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {showParameters && (
                <div className="space-y-4 mt-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 animate-fadeIn">
                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="temperature" className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        Temperature: <span className="font-mono text-indigo-500">{temperature}</span>
                      </label>
                      <HelpCircle className="w-3 h-3 text-slate-400" title="Higher values make output more creative, lower values more deterministic." />
                    </div>
                    <input
                      id="temperature"
                      type="range"
                      min="0.0"
                      max="1.5"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Top-P */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="topP" className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        Top-P: <span className="font-mono text-indigo-500">{topP}</span>
                      </label>
                      <HelpCircle className="w-3 h-3 text-slate-400" title="Nucleus sampling limit: only words covering Top-P probability mass are evaluated." />
                    </div>
                    <input
                      id="topP"
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(e.target.value)}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="maxTokens" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Max Output Tokens: <span className="font-mono text-indigo-500">{maxTokens}</span>
                      </label>
                    </div>
                    <input
                      id="maxTokens"
                      type="number"
                      min="50"
                      max="2000"
                      step="50"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Preview Toggle */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-all uppercase tracking-wider"
              >
                <span>Live Prompt Preview</span>
                <Eye className="w-3.5 h-3.5" />
              </button>

              {showPromptPreview && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed animate-fadeIn select-text">
                  {getPromptPreview()}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/10 active:scale-98 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing & Generating Copy...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Marketing Copy</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-500 dark:text-red-400 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Generation Error</p>
              <p className="mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Output Workspace - 7 columns */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-500 dark:text-emerald-400 text-xs animate-fadeIn">
            <Check className="w-4 h-4 shrink-0" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col">
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-500 absolute top-5 left-5 animate-pulse" />
              </div>
              <div className="text-center space-y-2 max-w-sm">
                <h4 className="font-bold text-slate-800 dark:text-white">Compiling AI Engine...</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Inference parameters loaded. Structuring 3 custom variations according to rules: {platform} & Tone: {tone}.
                </p>
              </div>
            </div>
          )}

          {!loading && variations.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-800/80">
                <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="font-bold text-slate-800 dark:text-white">Workspace Idle</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fill in your product credentials on the left side panel and click "Generate" to structure high-converting marketing variations.
                </p>
              </div>
            </div>
          )}

          {!loading && variations.length > 0 && (
            <div className="flex-1 flex flex-col animate-fadeIn select-text">
              
              {/* Variation Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-6 shrink-0">
                {variations.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                      activeTab === idx
                        ? 'bg-indigo-550 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                        : 'text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Variation {idx + 1}
                  </button>
                ))}
              </div>

              {/* Variation Content */}
              <div className="flex-1 space-y-6">
                
                {/* Headline / Subject */}
                <div>
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {platform === 'Email' ? 'Subject Line' : 'Headline / Post Hook'}
                  </h5>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {variations[activeTab].headline}
                  </div>
                </div>

                {/* Body Content */}
                <div>
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {platform === 'Email' ? 'Email Body' : 'Copy Content'}
                  </h5>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                    {variations[activeTab].content}
                  </div>
                </div>

                {/* Call to Action */}
                <div>
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {platform === 'Email' ? 'CTA Button Text' : 'Call to Action (CTA)'}
                  </h5>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 text-sm font-semibold text-slate-900 dark:text-indigo-400 leading-relaxed">
                    {variations[activeTab].cta}
                  </div>
                </div>

                {/* Hashtags */}
                {variations[activeTab].hashtags && variations[activeTab].hashtags.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Hashtags
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {variations[activeTab].hashtags.map((tag, tIdx) => (
                        <span 
                          key={tIdx} 
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200/50 dark:border-slate-700/50"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Action Toolbar */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-6 flex flex-wrap gap-3 shrink-0">
                {/* Clipboard */}
                <button
                  onClick={() => handleCopyToClipboard(activeTab)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all hover:text-slate-800 active:scale-95"
                >
                  {copiedIndex === activeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Copy</span>
                    </>
                  )}
                </button>

                {/* TXT */}
                <button
                  onClick={() => handleDownloadTxt(activeTab)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all hover:text-slate-800 active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download TXT</span>
                </button>

                {/* PDF */}
                <button
                  onClick={() => handleDownloadPdf(activeTab)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all hover:text-slate-800 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {/* Save DB */}
                <button
                  onClick={() => handleSaveToDb(activeTab)}
                  disabled={savedIndex === activeTab}
                  className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 ${
                    savedIndex === activeTab
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-550/20'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/10 disabled:opacity-50'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{savedIndex === activeTab ? 'Saved to DB' : 'Save to History'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
