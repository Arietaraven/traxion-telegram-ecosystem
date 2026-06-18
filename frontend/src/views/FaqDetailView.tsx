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
    <div style={{
      width: '100%',
      maxWidth: '440px',
      margin: '0 auto',
      backgroundColor: 'var(--tg-theme-secondary-bg-color, #24303f)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '16px',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Top Header Row Block */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          fontSize: '11px',
          padding: '4px 8px',
          borderRadius: '6px',
          fontWeight: 600,
          letterSpacing: '0.5px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          {category.toUpperCase()}
        </span>
        <span style={{ fontSize: '11px', color: '#8aa1b5', fontFamily: 'monospace' }}>
          #{keyword}
        </span>
      </div>

      {/* Main Question Header */}
      <h1 style={{ 
        fontSize: '16px', 
        fontWeight: 'bold', 
        color: 'var(--tg-theme-text-color, #ffffff)', 
        margin: '0 0 16px 0',
        lineHeight: '1.4'
      }}>
        {question}
      </h1>
      
      {/* Document Code Container Section */}
      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Code Block Toolbar Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#111827',
          color: '#9ca3af',
          fontSize: '11px',
          padding: '8px 14px',
          fontFamily: 'monospace',
          borderBottom: '1px solid #1f2937'
        }}>
          <span>Implementation Manual</span>
          <button 
            onClick={handleCopy}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? '#34d399' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'inherit',
              transition: 'color 0.2s ease',
              outline: 'none',
              fontWeight: 'bold'
            }}
          >
            {copied ? '✅ Copied!' : '📋 Copy Code'}
          </button>
        </div>
        
        {/* Preformatted Code Field Screen */}
        <pre style={{
          backgroundColor: '#030712',
          color: '#34d399',
          fontSize: '12px',
          padding: '14px',
          margin: 0,
          overflowX: 'auto',
          fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '320px'
        }}>
          <code>{answer}</code>
        </pre>
      </div>
    </div>
  );
};