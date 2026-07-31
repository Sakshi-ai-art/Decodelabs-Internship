import React from 'react';
import { 
  Sparkles, 
  PenTool, 
  History, 
  BarChart3, 
  Linkedin, 
  Instagram, 
  Mail, 
  Twitter, 
  Facebook,
  ArrowRight
} from 'lucide-react';

export default function Dashboard({ setCurrentPage }) {
  const platformIcons = {
    LinkedIn: { icon: Linkedin, color: 'bg-blue-500/10 text-blue-500' },
    Instagram: { icon: Instagram, color: 'bg-pink-500/10 text-pink-500' },
    Email: { icon: Mail, color: 'bg-red-500/10 text-red-500' },
    "Twitter/X": { icon: Twitter, color: 'bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-white' },
    Facebook: { icon: Facebook, color: 'bg-indigo-600/10 text-indigo-600' },
  };

  const tones = [
    { name: 'Professional', desc: 'Authoritative, polished, business-focused.' },
    { name: 'Casual', desc: 'Informal, relaxed, everyday conversational.' },
    { name: 'Friendly', desc: 'Warm, positive, trust-building.' },
    { name: 'Luxury', desc: 'Elegantly sophisticated and premium.' },
    { name: 'Persuasive', desc: 'High-converting and benefits-driven.' },
    { name: 'Humorous', desc: 'Witty, lighthearted, and memorable.' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-3xl p-8 md:p-12 shadow-xl shadow-indigo-500/10">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-violet-500 rounded-full blur-3xl opacity-25" />
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Introducing AI Tone Transformer 2.0</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Craft high-converting copy in seconds.
          </h2>
          <p className="text-slate-200 text-sm md:text-base leading-relaxed">
            Generate multiple professional marketing variations optimized for LinkedIn, Instagram, Email, Twitter/X, and Facebook. Instantly fine-tune tone, temperature, and structure parameters.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={() => setCurrentPage('generator')}
              className="flex items-center gap-2 bg-white text-indigo-700 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <span>Launch Copy Generator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage('history')}
              className="flex items-center gap-2 bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 text-white hover:bg-indigo-500/30 font-semibold px-6 py-3 rounded-xl transition-all"
            >
              <History className="w-4 h-4" />
              <span>View Saved History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Formulate Prompts</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live preview prompts dynamically compiled with custom product rules and platform goals.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Structured Output</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Generates exactly three variations concurrently—including custom headings, body, call-to-actions, and tags.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Analytics Tracking</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Monitor total copy saves, popular generation channels, optimal temperature parameters, and historical growth.</p>
          </div>
        </div>
      </div>

      {/* Grid: Channels & Tones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Supported Channels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Supported Platforms</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Object.entries(platformIcons).map(([platform, config]) => {
              const Icon = config.icon;
              return (
                <div key={platform} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{platform}</h4>
                      <p className="text-xs text-slate-400">
                        {platform === 'LinkedIn' && 'Professional business posts (150-300 words)'}
                        {platform === 'Instagram' && 'Engaging captions with emojis and tags'}
                        {platform === 'Email' && 'Structured Subject line, body, and CTA button text'}
                        {platform === 'Twitter/X' && 'Impactful punchy text under 280 characters'}
                        {platform === 'Facebook' && 'Conversational storytelling style'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Copywriting Tones */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Copywriting Tones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tones.map((tone) => (
              <div key={tone.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{tone.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tone.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
