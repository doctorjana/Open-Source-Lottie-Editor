import React, { useState, useEffect } from 'react';
import { IconManager, type IconMetadata } from '../../lib/IconManager';
import { useStore } from '../../store/useStore';
import { Search, Loader2, Plus } from 'lucide-react';

export const IconPanel: React.FC = () => {
    const [icons, setIcons] = useState<IconMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [preset, setPreset] = useState<'draw-in' | 'scale-in' | 'fade-in'>('draw-in');

    const addIconLayer = useStore(state => state.addIconLayer);

    useEffect(() => {
        IconManager.getIcons().then(list => {
            setIcons(list);
            setLoading(false);
        });
    }, []);

    const filteredIcons = icons.filter(icon =>
        icon.name.toLowerCase().includes(search.toLowerCase()) ||
        icon.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 50); // Limit for performance

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-border/10 overflow-hidden">
            <div className="p-4 border-b border-border/10 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Material Icons</h2>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search icons..."
                        className="w-full bg-[#1a1a1a] border border-border/20 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Animation Preset</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['draw-in', 'scale-in', 'fade-in'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPreset(p)}
                                className={`text-[10px] py-1 px-2 rounded border transition-all ${preset === p
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-[#1a1a1a] border-border/20 text-muted-foreground hover:border-border/50'
                                    }`}
                            >
                                {p.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Loading icons...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {filteredIcons.map(icon => (
                            <button
                                key={icon.name}
                                onClick={() => addIconLayer(icon.name, preset)}
                                className="aspect-square flex flex-col items-center justify-center bg-[#1a1a1a] border border-border/10 rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative overflow-hidden"
                                title={icon.name}
                            >
                                <img
                                    src={IconManager.getIconSvgUrl(icon.name)}
                                    alt={icon.name}
                                    className="w-8 h-8 opacity-70 group-hover:opacity-100 invert transition-opacity"
                                />
                                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Plus className="w-5 h-5 text-blue-400" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
