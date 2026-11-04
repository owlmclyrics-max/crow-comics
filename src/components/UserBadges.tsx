import React, { useState, useEffect } from 'react';
import type { Profile } from '../types/comic';
import { Shield, Heart, MessageSquare, Award } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface UserBadgesProps {
  profile: Profile;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  color: string;
}

export const UserBadges: React.FC<UserBadgesProps> = ({ profile }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [profile.id]);

  const fetchBadges = async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback para modo local
      setBadges([
        {
          id: 'novato',
          name: 'Novato',
          description: 'Te has registrado en la plataforma',
          icon: Shield,
          unlocked: true,
          color: 'red'
        }
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Contar favoritos del usuario
      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      // Contar comentarios del usuario
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const userBadges: Badge[] = [
        {
          id: 'novato',
          name: 'Novato',
          description: 'Te has registrado en la plataforma',
          icon: Shield,
          unlocked: true,
          color: 'red'
        },
        {
          id: 'coleccionista',
          name: 'Coleccionista',
          description: 'Has agregado 5 o más cómics a favoritos',
          icon: Heart,
          unlocked: (favoritesCount || 0) >= 5,
          color: 'rose'
        },
        {
          id: 'critico',
          name: 'Crítico',
          description: 'Has dejado 3 o más comentarios',
          icon: MessageSquare,
          unlocked: (commentsCount || 0) >= 3,
          color: 'amber'
        }
      ];

      setBadges(userBadges);
    } catch (err) {
      console.error('Error cargando insignias:', err);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      red: 'bg-accent/15 text-accent border-accent/50',
      rose: 'bg-accent/15 text-accent2 border-accent2/50',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    };
    return colors[color as keyof typeof colors] || colors.red;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-accent/30 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-mute">Cargando insignias...</span>
      </div>
    );
  }

  const unlockedBadges = badges.filter(b => b.unlocked);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold text-mute">
          Insignias ({unlockedBadges.length}/{badges.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`group relative px-3 py-1.5 rounded-lg border-2 transition-all ${
              badge.unlocked
                ? getColorClasses(badge.color)
                : 'bg-bg/60 text-faint border-line opacity-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <badge.icon className="w-4 h-4" />
              <span className="text-xs font-semibold">{badge.name}</span>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-bg border border-line text-xs text-mute whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <p className="font-semibold">{badge.name}</p>
              <p className="text-mute mt-1">{badge.description}</p>
              {!badge.unlocked && (
                <p className="text-accent2 mt-1 text-[10px]">🔒 Bloqueado</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
