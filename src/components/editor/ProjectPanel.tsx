import { Folder, FileJson, Image as ImageIcon, Box, Clock, Layout, List } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function ProjectPanel() {
    const animation = useStore((state) => state.animation);
    const layers = animation.layers;
    const assets = animation.assets || [];

    // Filter assets into categories
    const compositions = assets.filter(a => a.layers && a.layers.length > 0);
    const images = assets.filter(a => a.u && a.p);

    const durationSeconds = (animation.op - animation.ip) / animation.fr;

    return (
        <div className="h-full w-full bg-[#0a0a0a] border-r border-border/10 flex flex-col text-xs overflow-hidden">
            <div className="flex border-b border-border/10 shrink-0">
                <div className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#151515] text-blue-400 font-bold border-b-2 border-blue-500">
                    <Box className="w-3.5 h-3.5" />
                    Project
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Project Summary */}
                <div className="p-3 bg-white/[0.02] border-b border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground uppercase text-[9px] font-bold">Name</span>
                        <span className="text-foreground font-medium truncate max-w-[120px]">{animation.nm}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                            <Layout className="w-3 h-3" />
                            <span>{animation.w}x{animation.h}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                            <Clock className="w-3 h-3" />
                            <span>{durationSeconds.toFixed(1)}s</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                            <List className="w-3 h-3" />
                            <span>{layers.length} Layers</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                            <span className="font-bold text-[9px]">FPS</span>
                            <span>{animation.fr}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="space-y-4">
                        {/* Compositions Section */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground/40 uppercase font-black text-[9px] tracking-widest">
                                <Folder className="w-3 h-3" />
                                <span>Compositions</span>
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-500/10 text-blue-400 rounded cursor-pointer border border-blue-500/20">
                                    <FileJson className="w-3.5 h-3.5" />
                                    <span className="truncate font-medium">{animation.nm} (Root)</span>
                                </div>
                                {compositions.map((comp, idx) => (
                                    <div
                                        key={comp.id || idx}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/[0.05] text-foreground/70 rounded cursor-pointer transition-colors pl-4"
                                        draggable={true}
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('assetId', comp.id);
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                    >
                                        <FileJson className="w-3.5 h-3.5 text-yellow-500/70" />
                                        <span className="truncate">{comp.id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Assets Section */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground/40 uppercase font-black text-[9px] tracking-widest">
                                <Folder className="w-3 h-3" />
                                <span>Assets</span>
                            </div>
                            <div className="space-y-0.5">
                                {images.length === 0 && (
                                    <div className="px-4 py-2 text-[10px] text-muted-foreground/30 italic">
                                        No external assets
                                    </div>
                                )}
                                {images.map((asset, idx) => (
                                    <div
                                        key={asset.id || idx}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/[0.05] text-foreground/70 rounded cursor-pointer transition-colors pl-4 group"
                                        draggable={true}
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('assetId', asset.id);
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                    >
                                        <ImageIcon className="w-3.5 h-3.5 text-purple-400/70" />
                                        <div className="flex flex-col truncate">
                                            <span className="truncate">{asset.p || asset.id}</span>
                                            <span className="text-[8px] opacity-40">{asset.w}x{asset.h}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
