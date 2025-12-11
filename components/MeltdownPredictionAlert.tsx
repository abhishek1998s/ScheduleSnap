
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

  // Fun names for risk levels to match screenshot vibe
  const riskPersona = isHigh ? "The Mixed-Up Monster" : "The Wobbly Jelly";

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
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isHigh ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'} shrink-0`}>
                    <i className={`fa-solid ${icon}`}></i>
                </div>
                <div>
                    <h3 className={`font-bold text-lg leading-none ${textColor}`}>
                        {riskPersona}
                    </h3>
                    <p className={`text-xs font-bold opacity-80 ${textColor} mt-1`}>
                        {t(language, 'riskLevel')}: {prediction.riskLevel.toUpperCase()} • {prediction.confidence}%
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsMinimized(true)} className="text-gray-400 hover:text-gray-600 p-2" aria-label="Minimize Alert">
                    <i className="fa-solid fa-minus"></i>
                </button>
                <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 p-2" aria-label="Dismiss Alert">
                    <i className="fa-solid fa-times"></i>
                </button>
            </div>
        </div>

        {/* Why / Factors */}
        <div className="mb-4 bg-white/50 p-3 rounded-xl">
             <p className={`text-xs font-bold uppercase mb-2 opacity-70 ${textColor}`}>{t(language, 'whyRisk')}</p>
             <ul className="space-y-2">
                 {prediction.riskFactors.slice(0, 2).map((factor, i) => (
                     <li key={i} className={`text-sm flex items-start gap-2 ${textColor} leading-tight`}>
                         <i className="fa-solid fa-circle-dot text-[6px] mt-1.5 opacity-50 shrink-0"></i>
                         <span>
                             <span className="font-bold">{factor.factor}</span> 
                             <span className="opacity-80 ml-1 block text-xs mt-0.5">{factor.evidence}</span>
                         </span>
                     </li>
                 ))}
             </ul>
        </div>

        {/* Actions - Now wrapping text to show full detail */}
        <div className="grid grid-cols-2 gap-3 mb-2">
            {prediction.preventionStrategies.slice(0, 2).map((strat, i) => (
                <button 
                    key={i}
                    onClick={() => onAction(strat.strategy)}
                    className={`p-3 rounded-xl text-xs font-bold text-left transition-colors shadow-sm border h-full flex items-center ${
                        isHigh 
                            ? 'bg-white text-red-700 border-red-100 hover:bg-red-50' 
                            : 'bg-white text-yellow-700 border-yellow-100 hover:bg-yellow-50'
                    }`}
                >
                    {strat.strategy}
                </button>
            ))}
        </div>
        
        <button 
            onClick={() => onAction('calm_mode')}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 text-lg transform active:scale-95 transition-all ${isHigh ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
        >
            <i className="fa-solid fa-wind"></i> {t(language, 'startCalmMode')}
        </button>
    </div>
  );
};
