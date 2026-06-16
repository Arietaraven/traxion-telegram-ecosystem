import React, { useState } from 'react';

interface FaqProps {
  category: string;
  keyword: string;
  question: string;
  answer: string;
}

export const FaqDetailView: React.FC<FaqProps> = ({ category, keyword, question, answer }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto m-4 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 font-sans">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md font-semibold border border-blue-100">
            {category.toUpperCase()}
          </span>
          <span className="text-xs text-gray-400 font-mono">#{keyword}</span>
        </div>

        <h1 className="text-lg font-bold text-gray-900 mb-4">{question}</h1>
        
        <div className="relative group">
          <div className="flex justify-between items-center bg-gray-900 text-gray-300 text-xs px-4 py-2 rounded-t-lg font-mono">
            <span>Implementation Manual Documentation</span>
            <button 
              onClick={handleCopy}
              className="text-gray-400 hover:text-white transition-colors focus:outline-none"
            >
              {copied ? '✅ Copied!' : '📋 Copy Code'}
            </button>
          </div>
          <pre className="bg-gray-950 text-emerald-400 text-xs p-4 rounded-b-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap max-h-96 border-t border-gray-800">
            <code>{answer}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};