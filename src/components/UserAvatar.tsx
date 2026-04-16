import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { getFrameStyle } from '../constants';

interface UserAvatarProps {
  user: User | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export default function UserAvatar({ user, size = 'md', className, onClick }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg border',
    md: 'w-12 h-12 rounded-xl border-2',
    lg: 'w-16 h-16 rounded-2xl border-2',
    xl: 'w-20 h-20 rounded-2xl border-2'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  if (!user) {
    return (
      <div className={cn(sizeClasses[size], "bg-zinc-800 border-zinc-700 flex items-center justify-center", className)}>
        <UserIcon className={cn(iconSizes[size], "text-zinc-600")} />
      </div>
    );
  }

  const frame = user.customization?.frame || 'none';
  const frameStyle = getFrameStyle(frame);

  return (
    <div 
      onClick={onClick}
      className={cn(
        sizeClasses[size], 
        "bg-zinc-900 flex items-center justify-center relative transition-all",
        frame === 'none' ? "border-zinc-700" : "border-transparent",
        onClick ? "cursor-pointer hover:opacity-90 active:scale-95" : "",
        className
      )}
      style={frameStyle}
    >
      {/* Container for the actual image/icon to ensure rounding and overflow control without clipping the frame's glow */}
      <div className="absolute inset-0 overflow-hidden rounded-inherit flex items-center justify-center">
        {user.profilePhoto ? (
          <img 
            src={user.profilePhoto} 
            alt={user.username} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <UserIcon className={cn(iconSizes[size], "text-zinc-600")} />
        )}
      </div>
      
      {/* Secondary glow layer for better frame visibility */}
      <div className="absolute -inset-[1px] rounded-inherit border-inherit opacity-30 pointer-events-none" />
    </div>
  );
}
