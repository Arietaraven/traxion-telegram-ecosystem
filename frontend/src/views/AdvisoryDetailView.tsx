import React from 'react';

interface AdvisoryProps {
  title: string;              // Extracted by OCR or fallback file header string
  status: 'active' | 'done' | 'upcoming' | string;
  imageUrl: string;           // The direct downloadUrl generated via the Google Drive asset ID
  dateDescription?: string;   // Helpful tracking string parsed by our backend regex engine
}

export const AdvisoryDetailView: React.FC<AdvisoryProps> = ({ title, status, imageUrl, dateDescription }) => {
  const statusUpper = status.toUpperCase();
  
  // Dynamic color matching variables matching the text badge rules
  const getStatusStyles = () => {
    switch (statusUpper) {
      case 'ACTIVE': return { bg: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' };
      case 'DONE': return { bg: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' };
      default: return { bg: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className="max-w-md mx-auto m-4 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 font-sans">
      {/* Visual Header Banner Block */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Official Advisory</span>
          <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles.bg}`}>
            <span className={`h-2 w-2 rounded-full mr-1.5 ${styles.dot}`}></span>
            {statusUpper}
          </div>
        </div>

        <h1 className="text-lg font-bold text-gray-900 mb-1">{title}</h1>
        {dateDescription && (
          <p className="text-xs text-gray-500 mb-2">{dateDescription}</p>
        )}
      </div>

      {/* 🖼️ THE REFACTOR HOOK: Native Official Image Asset Presentation Frame */}
      <div className="w-full bg-gray-50 border-t border-b border-gray-100 relative flex justify-center items-center">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-auto max-h-[500px] object-contain loading-lazy"
          loading="lazy"
          onError={(e) => {
            // Safe fallback if the real-time download URL fails or hits Drive quotas
            e.currentTarget.src = 'https://placehold.co/600x600/0f172a/ffffff?text=Image+Temporarily+Unavailable';
          }}
        />
      </div>

      <div className="p-4 bg-gray-50 text-center">
        <p className="text-xs text-gray-400 italic">
          💡 This update was automatically synced in real-time from the cloud advisory repository.
        </p>
      </div>
    </div>
  );
};