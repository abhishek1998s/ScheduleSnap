
import React, { useState } from 'react';
import { searchAutismResources } from '../services/geminiService';
import { ResearchResult } from '../types';

interface ResearchToolProps {
  onExit: () => void;
}

export const ResearchTool: React.FC<ResearchToolProps> = ({ onExit }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
        const res = await searchAutismResources(query);
        setResult(res);
    } catch (error) {
        alert("Search failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
       <div className="bg-white p-4 shadow-sm border-b flex items-center gap-4">
          <button onClick={onExit}><i className="fa-solid fa-arrow-left text-gray-500"></i></button>
          <h1 className="font-bold text-slate-800">Research & Resources</h1>
       </div>

       <div className="p-4 flex-1 overflow-y-auto">
          <form onSubmit={handleSearch} className="mb-6">
             <div className="relative">
                 <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask about autism, therapies, rights..."
                    className="w-full p-4 pr-12 rounded-2xl border border-slate-200 shadow-sm focus:border-primary outline-none"
                 />
                 <button 
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-2 bottom-2 w-10 bg-primary text-white rounded-xl flex items-center justify-center"
                 >
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-search"></i>}
                 </button>
             </div>
          </form>

          {result && (
              <div className="animate-fadeIn space-y-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm">
                      <h2 className="font-bold text-slate-800 mb-2">Answer</h2>
                      <div className="prose text-slate-600 leading-relaxed">
                          {result.answer.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                      </div>
                  </div>

                  {result.sources.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl shadow-sm">
                          <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Sources</h2>
                          <div className="space-y-3">
                              {result.sources.map((source, i) => (
                                  <a 
                                    key={i} 
                                    href={source.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                  >
                                      <div className="font-bold text-primary text-sm">{source.title}</div>
                                      <div className="text-xs text-slate-400 truncate">{source.uri}</div>
                                  </a>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          )}

          {!result && !loading && (
              <div className="text-center text-slate-400 mt-12">
                  <i className="fa-solid fa-book-open text-4xl mb-4"></i>
                  <p>Search for evidence-based information<br/>powered by Google.</p>
              </div>
          )}
       </div>
    </div>
  );
};
