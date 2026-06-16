import React from 'react';

interface AdvisoryProps {
  title: string;
  description: string;
  status: 'active' | 'done' | 'upcoming' | string;
  eventDate: string;
}

export const AdvisoryDetailView: React.FC<AdvisoryProps> = ({ title, description, status, eventDate }) => {
  const statusUpper = status.toUpperCase();
  
  // Dynamic color matching variables based on system rules
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
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">System Advisory</span>
          <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles.bg}`}>
            <span className={`h-2 w-2 rounded-full mr-1.5 ${styles.dot}`}></span>
            {statusUpper}
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-xs text-gray-500 mb-4">🗓️ Scheduled Window: {new Date(eventDate).toLocaleString()}</p>
        
        <hr className="border-gray-100 my-4" />
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Impact Description</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>
      </div>
    </div>
  );
};