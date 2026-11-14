import React, { useEffect, useState } from 'react';
import { Bot, Cat, GraduationCap, Rocket, Star } from 'lucide-react';
import { AVATAR_OPTIONS, AvatarId, PresetAvatarId, resolveAvatarId } from './profile';

interface UserAvatarProps {
  avatarId: AvatarId;
  photoURL?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, { box: string; icon: string }> = {
  xs: { box: 'w-6 h-6', icon: 'w-3.5 h-3.5' },
  sm: { box: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { box: 'w-14 h-14', icon: 'w-7 h-7' },
};

function renderPresetIcon(id: PresetAvatarId, className: string) {
  switch (id) {
    case 'rocket':
      return <Rocket className={className} aria-hidden="true" />;
    case 'bot':
      return <Bot className={className} aria-hidden="true" />;
    case 'cat':
      return <Cat className={className} aria-hidden="true" />;
    case 'star':
      return <Star className={className} aria-hidden="true" />;
    case 'owl':
    default:
      return <GraduationCap className={className} aria-hidden="true" />;
  }
}

export default function UserAvatar({
  avatarId,
  photoURL,
  displayName,
  size = 'sm',
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoURL, avatarId]);

  const effective = resolveAvatarId(avatarId, imgError ? null : photoURL);
  const { box, icon } = SIZE_CLASSES[size];

  if (effective === 'google' && photoURL && !imgError) {
    return (
      <img
        src={photoURL}
        alt={displayName || '用户头像'}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${box} rounded-full object-cover border-[2.5px] border-ink bg-white shrink-0 ${className}`}
      />
    );
  }

  const presetId: PresetAvatarId = effective === 'google' ? 'owl' : effective;
  const preset = AVATAR_OPTIONS.find((item) => item.id === presetId) ?? AVATAR_OPTIONS[0];

  return (
    <span
      className={`${box} rounded-full bg-gradient-to-br ${preset.gradient} border-[2.5px] border-ink text-white inline-flex items-center justify-center shrink-0 ${className}`}
      role="img"
      aria-label={displayName || preset.label}
    >
      {renderPresetIcon(preset.id, icon)}
    </span>
  );
}
