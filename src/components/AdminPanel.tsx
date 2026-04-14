import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  ShieldOff, 
  Palette, 
  Trophy, 
  Megaphone, 
  Calendar, 
  RefreshCw, 
  Pause, 
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Type
} from 'lucide-react';
import { motion } from 'motion/react';
import { User, AppState, Announcement, FitnessEvent, UserCustomization } from '../types';
import { cn, formatDuration } from '../lib/utils';
import { SHOP_ITEMS, getFrameStyle, getPhraseStyle } from '../constants';

interface AdminPanelProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function AdminPanel({ state, setState }: AdminPanelProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'announcements' | 'events' | 'sync'>('users');
  const [awardAllAmount, setAwardAllAmount] = useState<string>('');
  const [awardAllMessage, setAwardAllMessage] = useState<string>('');
  const [showAwardAllConfirm, setShowAwardAllConfirm] = useState(false);

  // User Actions
  const toggleBlock = (username: string) => {
    if (!state.syncActive) return;
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.username === username ? { ...u, blocked: !u.blocked } : u)
    }));
  };

  const updateCustomization = (username: string, customization: Partial<UserCustomization>) => {
    if (!state.syncActive) return;
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.username === username ? { 
        ...u, 
        customization: { ...u.customization, ...customization } 
      } : u)
    }));
  };

  const addTrophies = (username: string, amount: number) => {
    if (!state.syncActive) return;
    setState(prev => {
      const notification = {
        id: Math.random().toString(36).substr(2, 9),
        message: `O administrador enviou ${amount} troféus para você!`,
        type: 'bonus' as const,
        amount,
        createdAt: new Date().toISOString()
      };
      
      const newState = {
        ...prev,
        users: prev.users.map(u => u.username === username ? { ...u, trophies: u.trophies + amount } : u),
        notifications: [notification, ...prev.notifications].slice(0, 50)
      };
      
      if (newState.currentUser?.username === username) {
        newState.currentUser.trophies += amount;
      }
      
      return newState;
    });
  };

  const awardAll = (amount: number, message?: string) => {
    if (!state.syncActive) return;
    setState(prev => {
      const notification = {
        id: Math.random().toString(36).substr(2, 9),
        message: message || `O administrador enviou ${amount} troféus para TODOS!`,
        type: 'bonus' as const,
        amount,
        createdAt: new Date().toISOString()
      };
      
      const newState = {
        ...prev,
        users: prev.users.map(u => ({ ...u, trophies: u.trophies + amount })),
        notifications: [notification, ...prev.notifications].slice(0, 50)
      };
      
      if (newState.currentUser) {
        newState.currentUser.trophies += amount;
      }
      
      return newState;
    });
  };

  // Announcement Actions
  const addAnnouncement = (message: string, durationHours: number) => {
    if (!state.syncActive) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    const newAnnouncement: Announcement = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      duration: durationHours,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements, newAnnouncement]
    }));
  };

  // Event Actions
  const addEvent = (event: Omit<FitnessEvent, 'id' | 'active'>) => {
    if (!state.syncActive) return;
    const newEvent: FitnessEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      active: true
    };
    setState(prev => ({
      ...prev,
      events: [...prev.events, newEvent]
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header */}
      <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <SubTabButton active={activeSubTab === 'users'} onClick={() => setActiveSubTab('users')} icon={<Users className="w-4 h-4" />} label="Usuários" />
          <SubTabButton active={activeSubTab === 'announcements'} onClick={() => setActiveSubTab('announcements')} icon={<Megaphone className="w-4 h-4" />} label="Avisos" />
          <SubTabButton active={activeSubTab === 'events'} onClick={() => setActiveSubTab('events')} icon={<Calendar className="w-4 h-4" />} label="Eventos" />
          <SubTabButton active={activeSubTab === 'sync'} onClick={() => setActiveSubTab('sync')} icon={<RefreshCw className="w-4 h-4" />} label="Sinc" />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex flex-col gap-1">
            <input 
              type="number" 
              value={awardAllAmount}
              onChange={(e) => setAwardAllAmount(e.target.value)}
              placeholder="Qtd" 
              className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-bold"
            />
          </div>
          <button 
            onClick={() => {
              if (awardAllAmount && !isNaN(parseInt(awardAllAmount))) {
                setShowAwardAllConfirm(true);
              }
            }}
            className="px-3 py-2 bg-yellow-500/10 text-yellow-500 rounded-xl text-[10px] font-bold border border-yellow-500/20 flex items-center gap-1"
          >
            <Trophy className="w-3 h-3" /> Enviar para Todos
          </button>
        </div>
      </div>

      {/* Award All Confirmation Modal */}
      {showAwardAllConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold">Confirmar Envio</h3>
              <p className="text-zinc-500 text-sm">
                Você tem certeza que deseja enviar <span className="text-yellow-500 font-bold">{awardAllAmount} troféus</span> para todos os usuários?
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Mensagem Opcional</label>
              <input 
                type="text"
                value={awardAllMessage}
                onChange={(e) => setAwardAllMessage(e.target.value)}
                placeholder="Ex: Parabéns pelo esforço de hoje!"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowAwardAllConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  awardAll(parseInt(awardAllAmount), awardAllMessage);
                  setShowAwardAllConfirm(false);
                  setAwardAllAmount('');
                  setAwardAllMessage('');
                }}
                className="flex-1 py-3 bg-yellow-500 text-black rounded-xl font-bold text-sm"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {state.users.map((user, index) => (
            <div key={user.username} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center border-2 overflow-hidden relative",
                      user.customization.frame === 'none' ? "border-zinc-800" : ""
                    )} style={getFrameStyle(user.customization.frame)}>
                      <div className="absolute inset-0 rounded-xl border-inherit" />
                      {user.profilePhoto ? (
                        <img src={user.profilePhoto} className="w-full h-full object-cover rounded-lg" alt="" />
                      ) : (
                        <Users className="w-6 h-6 text-zinc-700" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold flex items-center gap-2" style={{ 
                      color: user.customization.nameColor,
                      textShadow: user.customization.hasGlow ? `0 0 10px ${user.customization.nameColor}` : 'none',
                      filter: user.customization.nameStyle === 'neon' ? 'brightness(1.5)' : 'none'
                    }}>
                      {user.username}
                      <span className="text-[10px] text-zinc-500 font-normal">#{index + 1}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500">{user.email}</p>
                    <p className="text-[10px] italic" style={getPhraseStyle(user.customization.phraseColor)}>
                      "{user.customization.phrase}"
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleBlock(user.username)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      user.blocked ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-red-400"
                    )}
                  >
                    {user.blocked ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setSelectedUser(selectedUser?.username === user.username ? null : user)}
                    className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-orange-500"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedUser?.username === user.username && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-4 pb-4 border-t border-zinc-800 pt-4 space-y-4"
                >
                  {/* Customization Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-500">Cor do Nome</label>
                      <input 
                        type="color" 
                        value={user.customization.nameColor}
                        onChange={(e) => updateCustomization(user.username, { nameColor: e.target.value })}
                        className="w-full h-8 bg-transparent rounded cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-500">Estilo</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateCustomization(user.username, { nameStyle: 'matte' })}
                          className={cn("flex-1 py-1 text-[10px] rounded border", user.customization.nameStyle === 'matte' ? "bg-zinc-100 text-zinc-900 border-zinc-100" : "border-zinc-700 text-zinc-500")}
                        >Fosco</button>
                        <button 
                          onClick={() => updateCustomization(user.username, { nameStyle: 'neon' })}
                          className={cn("flex-1 py-1 text-[10px] rounded border", user.customization.nameStyle === 'neon' ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]" : "border-zinc-700 text-zinc-500")}
                        >Neon</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-zinc-500">Brilho (Glow)</label>
                    <button 
                      onClick={() => updateCustomization(user.username, { hasGlow: !user.customization.hasGlow })}
                      className={cn("w-10 h-5 rounded-full relative transition-all", user.customization.hasGlow ? "bg-orange-500" : "bg-zinc-700")}
                    >
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", user.customization.hasGlow ? "right-1" : "left-1")} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-500">Moldura</label>
                    <select 
                      value={user.customization.frame}
                      onChange={(e) => updateCustomization(user.username, { frame: e.target.value as any })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs"
                    >
                      <option value="none">Nenhuma</option>
                      <optgroup label="Molduras Especiais (Exclusivas)">
                        {SHOP_ITEMS.filter(i => i.isSpecial).map(item => (
                          <option key={item.id} value={item.frameValue}>{item.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Molduras da Loja">
                        {SHOP_ITEMS.filter(i => i.type === 'frame' && !i.isSpecial).map(item => (
                          <option key={item.id} value={item.frameValue}>{item.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Legado">
                        <option value="neon">Neon Laranja</option>
                        <option value="arcs-2">2 Arcos Azuis</option>
                        <option value="arcs-3">3 Arcos Roxos</option>
                        <option value="special">Especial Dourado</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-500">Frase de Perfil</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={user.customization.phrase}
                        onChange={(e) => updateCustomization(user.username, { phrase: e.target.value })}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs"
                        placeholder="Ex: papaleguas passa mal"
                      />
                      <select 
                        value={user.customization.phraseColor || ''}
                        onChange={(e) => updateCustomization(user.username, { phraseColor: e.target.value })}
                        className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-[10px]"
                      >
                        <option value="">Padrão</option>
                        <optgroup label="Cores Foscas">
                          <option value="#71717a">Cinza</option>
                          <option value="#ef4444">Vermelho</option>
                          <option value="#3b82f6">Azul</option>
                          <option value="#22c55e">Verde</option>
                          <option value="#eab308">Amarelo</option>
                          <option value="#ffffff">Branco</option>
                        </optgroup>
                        <optgroup label="Neon">
                          <option value="#f97316">Neon Laranja</option>
                          <option value="#3b82f6">Neon Azul</option>
                          <option value="#a855f7">Neon Roxo</option>
                          <option value="#22c55e">Neon Verde</option>
                          <option value="#ec4899">Neon Rosa</option>
                        </optgroup>
                        <optgroup label="Gradientes (2 Cores)">
                          <option value="#f97316,#ef4444">Fogo (Lar/Ver)</option>
                          <option value="#3b82f6,#06b6d4">Oceano (Azu/Cia)</option>
                          <option value="#a855f7,#ec4899">Cyber (Rox/Ros)</option>
                          <option value="#22c55e,#eab308">Natureza (Ver/Ama)</option>
                        </optgroup>
                        <optgroup label="Gradientes (3 Cores)">
                          <option value="#a855f7,#3b82f6,#ec4899">Elite (Rox/Azu/Ros)</option>
                          <option value="#eab308,#ef4444,#eab308">Campeão (Dou/Ver/Dou)</option>
                          <option value="#ff0000,#00ff00,#0000ff">RGB (Ver/Ver/Azu)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-bold">{user.trophies} Troféus</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => addTrophies(user.username, 1)} className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold hover:bg-zinc-700">+1</button>
                      <button onClick={() => addTrophies(user.username, 5)} className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold hover:bg-zinc-700">+5</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-orange-500" />
              Novo Informativo
            </h3>
            <textarea 
              id="announcement-msg"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-orange-500/50 outline-none h-24"
              placeholder="Escreva o aviso para todos os usuários..."
            />
            <div className="flex gap-2">
              <select id="announcement-duration" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-xs flex-1">
                <option value="1">1 Hora</option>
                <option value="6">6 Horas</option>
                <option value="24">24 Horas</option>
                <option value="168">1 Semana</option>
              </select>
              <button 
                onClick={() => {
                  const msg = (document.getElementById('announcement-msg') as HTMLTextAreaElement).value;
                  const dur = parseInt((document.getElementById('announcement-duration') as HTMLSelectElement).value);
                  if (msg) {
                    addAnnouncement(msg, dur);
                    (document.getElementById('announcement-msg') as HTMLTextAreaElement).value = '';
                  }
                }}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 transition-all"
              >
                Enviar Aviso
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest px-2">Avisos Ativos</h4>
            {state.announcements.map(ann => (
              <div key={ann.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm">{ann.message}</p>
                  <p className="text-[10px] text-zinc-500">Expira em: {new Date(ann.expiresAt).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => setState(prev => ({ ...prev, announcements: prev.announcements.filter(a => a.id !== ann.id) }))}
                  className="text-zinc-600 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'events' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              Criar Evento Personalizado
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Nome do Evento</label>
                <input id="event-name" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs" placeholder="Ex: Desafio 10km Neon" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Tipo</label>
                <select id="event-type" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs">
                  <option value="Corrida">Corrida</option>
                  <option value="Caminhada">Caminhada</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Distância (KM)</label>
                <input id="event-km" type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs" placeholder="Ex: 5" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Troféus Finais</label>
                <input id="event-trophies" type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs" placeholder="Ex: 20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Checkpoints</label>
                <select id="event-use-checkpoints" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs">
                  <option value="false">Desativado</option>
                  <option value="true">Ativado</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Intervalo (Metros)</label>
                <input id="event-checkpoint-interval" type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs" placeholder="Ex: 500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Troféus Checkpoint</label>
                <input id="event-checkpoint-trophies" type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs" placeholder="Ex: 1" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Moldura Prêmio</label>
                <select id="event-reward-frame" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs">
                  <option value="none">Nenhuma</option>
                  <optgroup label="Molduras Especiais (Exclusivas)">
                    {SHOP_ITEMS.filter(i => i.isSpecial).map(item => (
                      <option key={item.id} value={item.frameValue}>{item.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Molduras da Loja">
                    {SHOP_ITEMS.filter(i => i.type === 'frame' && !i.isSpecial).map(item => (
                      <option key={item.id} value={item.frameValue}>{item.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Legado">
                    <option value="neon">Neon Laranja</option>
                    <option value="arcs-2">2 Arcos Azuis</option>
                    <option value="arcs-3">3 Arcos Roxos</option>
                    <option value="special">Especial Dourado</option>
                  </optgroup>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Duração Prêmio (Dias)</label>
                <input id="event-reward-duration" type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs" placeholder="Vazio para Permanente" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Frase Prêmio & Cor</label>
                <div className="flex gap-2">
                  <input id="event-reward-phrase" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs" placeholder="Ex: Desafio completo! Você superou seus limites!" />
                  <select id="event-reward-phrase-color" className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-[10px]">
                    <option value="">Padrão</option>
                    <option value="#f97316">Neon Laranja</option>
                    <option value="#3b82f6">Neon Azul</option>
                    <option value="#a855f7">Neon Roxo</option>
                    <option value="#22c55e">Neon Verde</option>
                    <option value="#ec4899">Neon Rosa</option>
                    <option value="#f97316,#ef4444">Fogo</option>
                    <option value="#3b82f6,#06b6d4">Oceano</option>
                    <option value="#a855f7,#ec4899">Cyber</option>
                    <option value="#a855f7,#3b82f6,#ec4899">Elite</option>
                    <option value="#eab308,#ef4444,#eab308">Campeão</option>
                  </select>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                const name = (document.getElementById('event-name') as HTMLInputElement).value;
                const type = (document.getElementById('event-type') as HTMLSelectElement).value as any;
                const distance = parseFloat((document.getElementById('event-km') as HTMLInputElement).value);
                const trophies = parseInt((document.getElementById('event-trophies') as HTMLInputElement).value);
                const useCheckpoints = (document.getElementById('event-use-checkpoints') as HTMLSelectElement).value === 'true';
                const checkpointInterval = parseInt((document.getElementById('event-checkpoint-interval') as HTMLInputElement).value);
                const checkpointTrophies = parseInt((document.getElementById('event-checkpoint-trophies') as HTMLInputElement).value);
                const rewardFrame = (document.getElementById('event-reward-frame') as HTMLSelectElement).value as any;
                const rewardPhrase = (document.getElementById('event-reward-phrase') as HTMLInputElement).value;
                const rewardPhraseColor = (document.getElementById('event-reward-phrase-color') as HTMLSelectElement).value;
                const rewardDuration = (document.getElementById('event-reward-duration') as HTMLInputElement).value ? parseInt((document.getElementById('event-reward-duration') as HTMLInputElement).value) : undefined;

                if (name && distance) {
                  addEvent({ 
                    name, 
                    type, 
                    distance, 
                    trophies, 
                    useCheckpoints, 
                    checkpointInterval, 
                    checkpointTrophies, 
                    rewardFrame, 
                    rewardPhrase,
                    rewardPhraseColor,
                    rewardDuration
                  });
                  ['event-name', 'event-km', 'event-trophies', 'event-checkpoint-interval', 'event-checkpoint-trophies', 'event-reward-phrase', 'event-reward-duration'].forEach(id => {
                    const el = document.getElementById(id) as HTMLInputElement;
                    if (el) el.value = '';
                  });
                }
              }}
              className="w-full bg-orange-500 text-white py-3 rounded-xl text-xs font-bold hover:bg-orange-600 transition-all"
            >
              Lançar Evento
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest px-2">Eventos em Andamento</h4>
            {state.events.map(ev => (
              <div key={ev.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{ev.name}</p>
                  <p className="text-[10px] text-zinc-500">{ev.distance}km • {ev.type} • Prêmio: {ev.trophies} Troféus</p>
                  {ev.useCheckpoints && <p className="text-[9px] text-orange-500/70 font-bold uppercase">Checkpoints: +{ev.checkpointTrophies} a cada {ev.checkpointInterval}m</p>}
                </div>
                <button 
                  onClick={() => setState(prev => ({ ...prev, events: prev.events.filter(e => e.id !== ev.id) }))}
                  className="text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center space-y-6">
            <div className={cn(
              "w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all duration-500",
              state.syncActive ? "bg-green-500/10 text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)]" : "bg-zinc-800 text-zinc-500"
            )}>
              {state.syncActive ? <RefreshCw className="w-10 h-10 animate-spin-slow" /> : <Pause className="w-10 h-10" />}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Sincronização Online</h3>
              <p className="text-zinc-500 text-xs px-4">
                {state.syncActive 
                  ? "Todas as alterações feitas pelo administrador estão sendo enviadas em tempo real para os usuários."
                  : "A sincronização está pausada. Nenhuma alteração será aplicada aos usuários até que seja reativada."}
              </p>
            </div>

            <button 
              onClick={() => setState(prev => ({ ...prev, syncActive: !prev.syncActive }))}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95",
                state.syncActive 
                  ? "bg-zinc-800 text-zinc-300 border border-zinc-700" 
                  : "bg-green-500 text-white shadow-lg shadow-green-500/20"
              )}
            >
              {state.syncActive ? "Parar Sincronização" : "Sincronizar Dados"}
            </button>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl">
            <h4 className="text-[10px] font-bold uppercase text-zinc-500 mb-3">Histórico de Ações</h4>
            <div className="space-y-2">
              <LogItem action="Admin logado" time="Agora" />
              <LogItem action="Sincronização ativada" time="Há 2 min" />
              <LogItem action="Banco de dados local atualizado" time="Há 5 min" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubTabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
        active ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function LogItem({ action, time }: { action: string, time: string }) {
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="text-zinc-400">{action}</span>
      <span className="text-zinc-600">{time}</span>
    </div>
  );
}
