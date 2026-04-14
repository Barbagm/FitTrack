import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X } from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementPopupProps {
  announcements: Announcement[];
  onClose: (id: string) => void;
}

export default function AnnouncementPopup({ announcements, onClose }: AnnouncementPopupProps) {
  const activeAnnouncements = announcements.filter(a => new Date(a.expiresAt) > new Date());

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="fixed top-24 left-6 right-6 z-[100] space-y-3 pointer-events-none">
      <AnimatePresence>
        {activeAnnouncements.map(ann => (
          <motion.div 
            key={ann.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-orange-500 text-white p-4 rounded-2xl shadow-2xl shadow-orange-500/30 flex items-start gap-3 border border-white/20 pointer-events-auto"
          >
            <div className="bg-white/20 p-2 rounded-xl">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Informativo</p>
              <p className="text-sm font-medium leading-tight">{ann.message}</p>
            </div>
            <button 
              onClick={() => onClose(ann.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
