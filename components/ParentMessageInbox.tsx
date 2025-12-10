
import React, { useState } from 'react';
import { ParentMessage, ChildProfile } from '../types';
import { t } from '../utils/translations';

interface ParentMessageInboxProps {
  messages: ParentMessage[];
  profile: ChildProfile;
  onRespond: (messageId: string, response: string) => void;
  onExit: () => void;
  onRecordReply: () => void;
}

export const ParentMessageInbox: React.FC<ParentMessageInboxProps> = ({ messages, profile, onRespond, onExit, onRecordReply }) => {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  
  // Show newest delivered messages first
  const deliveredMessages = messages.filter(m => m.isDelivered).sort((a,b) => b.timestamp - a.timestamp);
  
  const activeMessage = deliveredMessages.find(m => m.id === activeMessageId);

  const handleEmojiResponse = (emoji: string) => {
      if (activeMessageId) {
          onRespond(activeMessageId, emoji);
          // Auto close after response
          setTimeout(() => setActiveMessageId(null), 1000);
      }
  };

  return (
    <div className="h-full flex flex-col bg-pink-50 relative">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-white shadow-sm z-10 shrink-0">
             <button onClick={onExit} className="bg-gray-100 p-2 rounded-full">
                 <i className="fa-solid fa-arrow-left text-gray-500"></i>
             </button>
             <h1 className="font-bold text-xl text-pink-600 flex items-center gap-2">
                 <i className="fa-solid fa-envelope"></i> {t(profile.language, 'parentInbox')}
             </h1>
             <div className="w-10"></div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4">
            {deliveredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-pink-300 gap-4">
                    <i className="fa-regular fa-envelope-open text-6xl"></i>
                    <p className="font-bold text-lg">{t(profile.language, 'inboxEmpty')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {deliveredMessages.map(msg => (
                        <button 
                            key={msg.id}
                            onClick={() => setActiveMessageId(msg.id)}
                            className={`bg-white p-4 rounded-3xl shadow-md text-left transition-transform active:scale-95 border-2 ${!msg.isRead ? 'border-pink-400 ring-2 ring-pink-100' : 'border-transparent'} relative`}
                        >
                             {!msg.isRead && (
                                 <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">New!</span>
                             )}
                             
                             <div className="flex items-center gap-4 mb-2">
                                 <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 text-2xl">
                                     {msg.type === 'video' ? <i className="fa-solid fa-video"></i> : 
                                      msg.type === 'audio' ? <i className="fa-solid fa-microphone"></i> : 
                                      <i className="fa-solid fa-heart"></i>}
                                 </div>
                                 <div className="flex-1">
                                     <p className="font-bold text-gray-800 line-clamp-1">{msg.content || t(profile.language, 'messageFromParent')}</p>
                                     <p className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                 </div>
                             </div>

                             {msg.childResponse && (
                                 <div className="bg-gray-50 rounded-xl p-2 mt-2 flex items-center gap-2">
                                     <i className="fa-solid fa-reply text-gray-400 text-xs"></i>
                                     <span className="text-xl">{msg.childResponse}</span>
                                 </div>
                             )}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Active Message Viewer Overlay */}
        {activeMessage && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-3xl w-full max-w-md p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
                    <button 
                        onClick={() => setActiveMessageId(null)}
                        className="absolute top-4 right-4 bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center z-20"
                    >
                        <i className="fa-solid fa-times"></i>
                    </button>

                    <h2 className="text-center font-bold text-xl text-pink-600 mb-6">{t(profile.language, 'messageFromParent')}</h2>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto mb-6 flex flex-col items-center">
                        {activeMessage.mediaBase64 ? (
                             activeMessage.type === 'video' ? (
                                 <video 
                                    src={`data:video/mp4;base64,${activeMessage.mediaBase64}`} 
                                    controls 
                                    autoPlay 
                                    className="w-full rounded-2xl shadow-sm bg-black max-h-64" 
                                 />
                             ) : activeMessage.type === 'audio' ? (
                                 <div className="bg-pink-50 p-6 rounded-3xl flex flex-col items-center gap-4 w-full">
                                     <i className="fa-solid fa-headphones text-6xl text-pink-300"></i>
                                     <audio 
                                        src={`data:audio/mp3;base64,${activeMessage.mediaBase64}`} 
                                        controls 
                                        className="w-full"
                                     />
                                 </div>
                             ) : null
                        ) : null}

                        {activeMessage.content && (
                            <div className="mt-4 p-4 bg-pink-50 rounded-2xl w-full text-center">
                                <p className="text-2xl font-bold text-gray-700">"{activeMessage.content}"</p>
                            </div>
                        )}
                    </div>

                    {/* Response Actions */}
                    {!activeMessage.childResponse ? (
                        <div className="grid grid-cols-4 gap-3">
                             <button onClick={() => handleEmojiResponse('❤️')} className="aspect-square bg-red-100 rounded-2xl text-4xl flex items-center justify-center hover:scale-110 transition-transform">❤️</button>
                             <button onClick={() => handleEmojiResponse('👍')} className="aspect-square bg-blue-100 rounded-2xl text-4xl flex items-center justify-center hover:scale-110 transition-transform">👍</button>
                             <button onClick={() => handleEmojiResponse('🤗')} className="aspect-square bg-purple-100 rounded-2xl text-4xl flex items-center justify-center hover:scale-110 transition-transform">🤗</button>
                             <button onClick={onRecordReply} className="aspect-square bg-gray-100 rounded-2xl text-2xl flex flex-col items-center justify-center gap-1 hover:bg-gray-200 transition-colors">
                                 <i className="fa-solid fa-microphone text-gray-500"></i>
                                 <span className="text-[10px] font-bold text-gray-500">{t(profile.language, 'sendReply')}</span>
                             </button>
                        </div>
                    ) : (
                        <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                            <p className="text-green-600 font-bold">{t(profile.language, 'replySent')} {activeMessage.childResponse}</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
