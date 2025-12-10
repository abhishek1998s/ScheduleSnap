
import React, { useState } from 'react';
import { MeltdownPrediction } from '../types';
import { t } from '../utils/translations';

interface MeltdownPredictionAlertProps {
  prediction: MeltdownPrediction;
  onDismiss: () => void;
  onAction: (action: string) => void;
  language?: string;
}

export const MeltdownPredictionAlert: React.FC<MeltdownPredictionAlertProps> = ({ prediction, onDismiss, onAction, language }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // If risk is low, don't show anything (or handle in parent)
  if (prediction.riskLevel === 'low') return null;

  const isHigh = prediction.riskLevel === 'high' || prediction.riskLevel === 'imminent';
  const bgColor = isHigh ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = isHigh ? 'border-red-200' : 'border-yellow-200';
  const textColor = isHigh ? 'text-red-800' : 'text-yellow-800';
  const icon = isHigh ? 'fa-triangle-exclamation' : 'fa-bell';

  if (isMinimized) {
      return (
          <button 
            onClick={() => setIsMinimized(false)}
            className={`fixed bottom-24 left-4 z-50 ${isHigh ? 'bg-red-500' : 'bg-yellow-500'} text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center animate-pulse`}
          >
              <i className={`fa-solid ${icon}`}></i>
          </button>
      );
  }

  return (
    <div className={`fixed bottom-20 left-4 right-4 z-50 rounded-2xl shadow-2xl border-2 ${bgColor} ${borderColor} p-4 animate-slideUp`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isHigh ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    <i className={`fa-solid ${icon}`}></i>
                </div>
                <div>
                    <h3 className={`font-bold text-lg leading-none ${textColor}`}>
                        {t(language, 'riskLevel')}: {prediction.riskLevel.toUpperCase()}
                    </h3>
                    <p className={`text-xs font-bold opacity-70 ${textColor}`}>
                        {prediction.timeEstimate} • {prediction.confidence}% {t(language, 'confidence')}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsMinimized(true)} className="text-gray-400 hover:text-gray-600 p-1">
                    <i className="fa-solid fa-minus"></i>
                </button>
                <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 p-1">
                    <i className="fa-solid fa-times"></i>
                </button>
            </div>
        </div>

        {/* Why / Factors */}
        <div className="mb-4">
             <p className={`text-xs font-bold uppercase mb-1 opacity-60 ${textColor}`}>{t(language, 'whyRisk')}</p>
             <ul className="space-y-1">
                 {prediction.riskFactors.slice(0, 2).map((factor, i) => (
                     <li key={i} className={`text-sm flex items-start gap-2 ${textColor}`}>
                         <i className="fa-solid fa-circle-dot text-[6px] mt-1.5 opacity-50"></i>
                         <span>{factor.factor} <span className="opacity-60 text-xs">({factor.evidence})</span></span>
                     </li>
                 ))}
             </ul>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
            {prediction.preventionStrategies.slice(0, 2).map((strat, i) => (
                <button 
                    key={i}
                    onClick={() => onAction(strat.strategy)}
                    className={`py-2 px-3 rounded-lg text-sm font-bold truncate text-center transition-colors shadow-sm border ${
                        isHigh 
                            ? 'bg-white text-red-600 border-red-100 hover:bg-red-50' 
                            : 'bg-white text-yellow-700 border-yellow-100 hover:bg-yellow-50'
                    }`}
                >
                    {strat.strategy}
                </button>
            ))}
            <button 
                onClick={() => onAction('calm_mode')}
                className={`col-span-2 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 ${isHigh ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
            >
                <i className="fa-solid fa-wind"></i> {t(language, 'startCalmMode')}
            </button>
        </div>
    </div>
  );
};
