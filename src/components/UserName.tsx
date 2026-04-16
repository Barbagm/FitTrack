import React from 'react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { Crown } from 'lucide-react';

interface UserNameProps {
  user: User;
  className?: string;
  showCrown?: boolean;
}

export default function UserName({ user, className, showCrown = true }: UserNameProps) {
  const isNeon = user.customization?.nameStyle === 'neon';
  const hasGlow = user.customization?.hasGlow || isNeon;
  const color = user.customization?.nameColor || '#ffffff';

  const isPremium = (user: any | null) => {
    if (!user?.premiumUntil) return false;
    return new Date(user.premiumUntil) > new Date();
  };

  return (
    <span 
      className={cn("font-bold flex items-center gap-2", className)}
      style={{ 
        color: color,
        textShadow: hasGlow 
          ? `0 0 10px ${color}, 0 0 20px ${color}44` 
          : 'none',
        filter: isNeon ? 'brightness(1.5) contrast(1.1)' : 'none'
      }}
    >
      {user.username}
      {showCrown && isPremium(user) && (
        <Crown className="w-3 h-3 text-orange-500 fill-orange-500/20" />
      )}
    </span>
  );
}
