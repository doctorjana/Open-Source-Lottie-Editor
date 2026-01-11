import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { clsx } from 'clsx';
import { ChevronRight, ChevronDown, Eye, Lock, Search, Filter, Link2, Ghost, Hash } from 'lucide-react';
import type { Layer } from '../../types/lottie';

const SIDEBAR_DEFAULT_WIDTH = 420; // Increased for more columns
const FRAME_WIDTH = 10;

// Helper to render property rows generically
const PropertyRow = ({
    label,
    value,
    prop,
    indent = 0,
    onExpand,
    sidebarWidth
}: {
    label: string,
    value?: string,
    prop?: any,
    indent?: number,
    onExpand?: () => void,
    sidebarWidth: number
}) => {
    const setTime = useStore(state => state.setTime);
    const keyframes = prop?.a === 1 && Array.isArray(prop.k) ? prop.k : [];

    return (
        <div className="h-6 flex items-center border-b border-border/5 text-[10px] hover:bg-white/[0.02] group/prop">
            <div
                className="sticky left-0 z-20 border-r border-border/20 flex items-center shrink-0 pr-2 bg-[#0d0d0d]"
                style={{ width: `${sidebarWidth}px`, paddingLeft: `${indent * 12 + 12}px` }}
            >
                {onExpand && (
                    <button onClick={(e) => { e.stopPropagation(); onExpand(); }} className="mr-1.5 p-0.5 rounded hover:bg-white/10 transition-colors">
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </button>
                )}
                <span className="text-muted-foreground/60 flex-1 truncate uppercase tracking-tighter">{label}</span>
                {value && <span className="text-blue-400/80 font-mono text-[9px] ml-2 opacity-0 group-hover/prop:opacity-100 transition-opacity">{value}</span>}
            </div>
            {/* Timeline Track Area for Property */}
            <div className="flex-1 relative h-full min-w-[3000px] border-r border-white/[0.02]">
                {keyframes.map((kf: any, i: number) => (
                    <div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rotate-45 border border-white/20 shadow-[0_0_5px_rgba(59,130,246,0.5)] cursor-pointer hover:scale-125 transition-transform"
                        style={{ left: `${kf.t * FRAME_WIDTH}px`, marginLeft: '-4px' }}
                        onClick={(e) => { e.stopPropagation(); setTime(kf.t); }}
                        title={`Keyframe at ${Math.round(kf.t)}f`}
                    />
                ))}
            </div>
        </div>
    );
};

// Recursive Layer Composition
const LayerRow = ({ layer, index, sidebarWidth, indent = 0, parentId = '' }: { layer: Layer, index: number, sidebarWidth: number, indent?: number, parentId?: string }) => {
    const selectedLayerId = useStore((state) => state.selectedLayerId);
    const selectLayer = useStore((state) => state.selectLayer);
    const expandedIds = useStore((state) => state.expandedIds);
    const toggleExpansion = useStore((state) => state.toggleExpansion);
    const updateLayer = useStore((state) => state.updateLayer);
    const lockedIds = useStore((state) => state.lockedIds);
    const toggleLock = useStore((state) => state.toggleLock);

    const isExpanded = !!expandedIds[`layer-${layer.ind}`];
    const isTransformExpanded = !!expandedIds[`layer-${layer.ind}-transform`];
    const isLocked = !!lockedIds[layer.ind];
    const isHidden = !!layer.hd;

    // Derived dimensions for AE columns
    const nameWidth = sidebarWidth * 0.45;
    const switchesWidth = 80;
    const modesWidth = 80;
    const parentWidth = sidebarWidth - nameWidth - switchesWidth - modesWidth;

    return (
        <div className="flex flex-col">
            {/* Layer Header Row */}
            <div
                className={clsx(
                    "h-8 flex items-center border-b border-border/20 text-[11px] cursor-pointer select-none group/row transition-colors",
                    selectedLayerId === layer.ind ? "bg-blue-500/10" : "hover:bg-white/5",
                    isHidden && "opacity-40"
                )}
                onClick={() => selectLayer(layer.ind)}
            >
                {/* Left Panel: All Columns (Sticky) */}
                <div
                    className="sticky left-0 z-30 border-r border-border/30 flex items-center shrink-0 bg-[#0d0d0d] group-hover/row:bg-[#151515] transition-colors h-full"
                    style={{ width: `${sidebarWidth}px` }}
                >
                    {/* 1. Visibility & Lock (Switches area start) */}
                    <div className="flex gap-1.5 text-muted-foreground/30 px-2 shrink-0" style={{ paddingLeft: `${indent * 12 + 8}px` }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); updateLayer(layer.ind, { hd: !isHidden }); }}
                            className={clsx("hover:text-blue-400 p-0.5 rounded transition-colors", !isHidden && "text-blue-500/80 active:opacity-100")}
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleLock(layer.ind); }}
                            className={clsx("hover:text-red-400 p-0.5 rounded transition-colors", isLocked && "text-red-500/80 active:opacity-100")}
                        >
                            <Lock className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* 2. Layer Number */}
                    <span className="w-6 text-center font-mono text-[10px] text-muted-foreground/40 shrink-0">{index + 1}</span>

                    {/* 3. Layer Name & Icon */}
                    <div className="flex items-center gap-1.5 overflow-hidden px-1" style={{ width: `${nameWidth}px` }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleExpansion(`layer-${layer.ind}`); }}
                            className="p-0.5 rounded-sm hover:bg-white/10 text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        <div className={clsx("w-2 h-2 rounded-full shrink-0", layer.ty === 4 ? "bg-purple-500/60" : "bg-blue-400/60")} />
                        <span className={clsx(
                            "truncate font-medium flex-1",
                            selectedLayerId === layer.ind ? "text-blue-400" : "text-foreground/80"
                        )}>
                            {layer.nm || `Layer ${layer.ind}`}
                        </span>
                    </div>

                    {/* 4. Parent & Link Column (Placeholder) */}
                    <div className="border-l border-border/10 h-full flex items-center px-2 gap-1.5 shrink-0" style={{ width: `${parentWidth}px` }}>
                        <Link2 className="w-3 h-3 text-muted-foreground/20" />
                        <span className="text-[9px] text-muted-foreground/30 truncate">None</span>
                    </div>

                    {/* 5. Mode Column (Placeholder) */}
                    <div className="border-l border-border/10 h-full flex items-center px-2 shrink-0 bg-white/[0.02]" style={{ width: `${modesWidth}px` }}>
                        <span className="text-[9px] text-muted-foreground/40 font-semibold uppercase tracking-tight">Normal</span>
                    </div>

                    {/* 6. TrkMat Column (Placeholder) */}
                    <div className="border-l border-border/10 h-full flex items-center px-2 shrink-0 gap-1.5" style={{ width: `${switchesWidth}px` }}>
                        <Ghost className="w-3 h-3 text-muted-foreground/10" />
                        <span className="text-[9px] text-muted-foreground/20">None</span>
                    </div>
                </div>

                {/* Right Panel: Time Bar (Scrollable) */}
                <div className="flex-1 relative h-full min-w-[3000px] bg-slate-900/5">
                    {/* Layer Bar */}
                    <div
                        className="absolute top-2 bottom-2 bg-gradient-to-r from-purple-500/40 to-purple-400/20 border border-purple-500/40 rounded shadow-inner cursor-ew-resize group/bar"
                        style={{ left: `${layer.ip * FRAME_WIDTH}px`, width: `${(layer.op - layer.ip) * FRAME_WIDTH}px` }}
                    >
                        {/* Handles for in/out points */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20 opacity-0 group-hover/bar:opacity-100" />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20 opacity-0 group-hover/bar:opacity-100" />
                    </div>
                </div>
            </div>

            {/* Expanded Properties */}
            {isExpanded && (
                <div className="bg-black/40">
                    {/* Transform Group */}
                    <div className="h-7 flex items-center border-b border-border/5 text-[10px] hover:bg-white/[0.02]">
                        <div
                            className="sticky left-0 z-30 border-r border-border/10 flex items-center shrink-0 bg-[#0d0d0d]"
                            style={{ width: `${sidebarWidth}px`, paddingLeft: `${(indent + 1) * 12 + 12}px` }}
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleExpansion(`layer-${layer.ind}-transform`); }}
                                className="mr-2 p-0.5 hover:bg-white/5 rounded transition-colors"
                            >
                                {isTransformExpanded ? <ChevronDown className="w-3 h-3 text-blue-400/80" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                            </button>
                            <span className="font-bold text-muted-foreground/50 tracking-widest uppercase text-[9px]">Transform</span>
                        </div>
                        <div className="flex-1 min-w-[3000px] border-r border-white/5" />
                    </div>

                    {/* Transform Properties */}
                    {isTransformExpanded && (
                        <div className="divide-y divide-white/[0.03]">
                            <PropertyRow sidebarWidth={sidebarWidth} indent={2} label="Anchor Point" prop={layer.ks.a} value={JSON.stringify(layer.ks.a.k)} />
                            <PropertyRow sidebarWidth={sidebarWidth} indent={2} label="Position" prop={layer.ks.p} value={JSON.stringify(layer.ks.p.k)} />
                            <PropertyRow sidebarWidth={sidebarWidth} indent={2} label="Scale" prop={layer.ks.s} value={JSON.stringify(layer.ks.s.k)} />
                            <PropertyRow sidebarWidth={sidebarWidth} indent={2} label="Rotation" prop={layer.ks.r} value={JSON.stringify(layer.ks.r?.k ?? 0) + "°"} />
                            <PropertyRow sidebarWidth={sidebarWidth} indent={2} label="Opacity" prop={layer.ks.o} value={JSON.stringify(layer.ks.o.k) + "%"} />
                        </div>
                    )}

                    {/* Shapes Group */}
                    {layer.ty === 4 && layer.shapes && layer.shapes.length > 0 && (
                        <>
                            <div className="h-7 flex items-center border-b border-border/5 text-[10px] hover:bg-white/[0.02] group/shapes">
                                <div
                                    className="sticky left-0 z-30 border-r border-border/10 flex items-center pl-10 shrink-0 bg-[#0d0d0d]"
                                    style={{ width: `${sidebarWidth}px` }}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleExpansion(`layer-${layer.ind}-shapes`); }}
                                        className="mr-2 p-0.5 hover:bg-white/5 rounded transition-colors"
                                    >
                                        {expandedIds[`layer-${layer.ind}-shapes`] ? <ChevronDown className="w-3 h-3 text-purple-400" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                                    </button>
                                    <span className="font-bold text-purple-400/50 tracking-widest uppercase text-[9px]">Contents</span>
                                </div>
                                <div className="flex-1 min-w-[3000px] border-r border-white/5" />
                            </div>

                            {expandedIds[`layer-${layer.ind}-shapes`] && (
                                <div className="bg-white/[0.01]">
                                    {layer.shapes.map((shape, sIdx) => (
                                        <ShapeRow
                                            key={`${layer.ind}-s-${sIdx}`}
                                            shape={shape}
                                            indent={3}
                                            layerInd={layer.ind}
                                            sidebarWidth={sidebarWidth}
                                            path={`shapes.${sIdx}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Precomp Content */}
                    {layer.ty === 0 && layer.refId && (
                        <>
                            <div className="h-7 flex items-center border-b border-border/5 text-[10px] hover:bg-white/[0.02] group/precomp">
                                <div
                                    className="sticky left-0 z-30 border-r border-border/10 flex items-center pl-10 shrink-0 bg-[#0d0d0d]"
                                    style={{ width: `${sidebarWidth}px` }}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleExpansion(`layer-${layer.ind}-precomp`); }}
                                        className="mr-2 p-0.5 hover:bg-white/5 rounded transition-colors"
                                    >
                                        {expandedIds[`layer-${layer.ind}-precomp`] ? <ChevronDown className="w-3 h-3 text-blue-400" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                                    </button>
                                    <span className="font-bold text-blue-400/50 tracking-widest uppercase text-[9px]">Layers</span>
                                </div>
                                <div className="flex-1 min-w-[3000px] border-r border-white/5" />
                            </div>

                            {expandedIds[`layer-${layer.ind}-precomp`] && (
                                <div className="bg-white/[0.01]">
                                    {useStore.getState().animation.assets?.find(a => a.id === layer.refId)?.layers?.map((subLayer, subIdx) => (
                                        <LayerRow
                                            key={`${layer.ind}-l-${subLayer.ind || subIdx}`}
                                            layer={subLayer}
                                            index={subIdx}
                                            sidebarWidth={sidebarWidth}
                                            indent={2}
                                            parentId={`layer-${layer.ind}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const ShapeRow = ({
    shape,
    indent,
    layerInd,
    sidebarWidth,
    path
}: {
    shape: any,
    indent: number,
    layerInd: number,
    sidebarWidth: number,
    path: string
}) => {
    const expandedIds = useStore(state => state.expandedIds);
    const toggleExpansion = useStore(state => state.toggleExpansion);

    const isExpanded = !!expandedIds[`layer-${layerInd}-shape-${path}`];
    const isTransformExpanded = !!expandedIds[`layer-${layerInd}-shape-${path}-transform`];

    return (
        <div className="flex flex-col border-b border-border/5">
            <div className="h-7 flex items-center hover:bg-white/[0.02]">
                <div
                    className="sticky left-0 z-30 border-r border-border/10 flex items-center shrink-0 bg-[#0d0d0d]"
                    style={{ width: `${sidebarWidth}px`, paddingLeft: `${indent * 12 + 12}px` }}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleExpansion(`layer-${layerInd}-shape-${path}`); }}
                        className="mr-1.5 p-0.5 hover:bg-white/5 rounded transition-colors"
                    >
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-purple-400/60" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                    </button>
                    <div className="w-1.5 h-1.5 rounded-sm bg-purple-500/40 mr-2 shrink-0" />
                    <span className="text-muted-foreground/80 truncate text-[10px]">{shape.nm || shape.ty}</span>
                </div>
                <div className="flex-1 min-w-[3000px] border-r border-white/5" />
            </div>

            {isExpanded && (
                <div className="bg-black/20">
                    {/* Nested items if group */}
                    {shape.ty === 'gr' && shape.it && (
                        shape.it.map((child: any, cIdx: number) => (
                            <ShapeRow
                                key={`${layerInd}-s-${path}-it-${cIdx}`}
                                shape={child}
                                indent={indent + 1}
                                layerInd={layerInd}
                                sidebarWidth={sidebarWidth}
                                path={`${path}.it.${cIdx}`}
                            />
                        ))
                    )}

                    {/* Shape Transform if it exists */}
                    {(shape.ty === 'gr' || shape.ty === 'rc' || shape.ty === 'el' || shape.ty === 'sr') && (
                        <div className="h-6 flex items-center border-b border-border/5 text-[9px] hover:bg-white/[0.02]">
                            <div
                                className="sticky left-0 z-30 border-r border-border/10 flex items-center shrink-0 bg-[#0d0d0d]"
                                style={{ width: `${sidebarWidth}px`, paddingLeft: `${(indent + 1) * 12 + 12}px` }}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpansion(`layer-${layerInd}-shape-${path}-transform`); }}
                                    className="p-0.5 hover:bg-white/5 rounded transition-colors"
                                >
                                    {isTransformExpanded ? <ChevronDown className="w-2.5 h-2.5 text-blue-400/60" /> : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/20" />}
                                </button>
                                <span className="font-bold text-muted-foreground/30 tracking-tight uppercase ml-1">Transform</span>
                            </div>
                            <div className="flex-1 min-w-[3000px] border-r border-white/5" />
                        </div>
                    )}

                    {isTransformExpanded && (
                        <div className="divide-y divide-white/[0.02]">
                            {/* tr is usually for group, p/s/a/r are for shapes directly sometimes */}
                            {shape.tr && (
                                <>
                                    <PropertyRow sidebarWidth={sidebarWidth} indent={indent + 2} label="Anchor Point" prop={shape.tr.a} value={JSON.stringify(shape.tr.a?.k)} />
                                    <PropertyRow sidebarWidth={sidebarWidth} indent={indent + 2} label="Position" prop={shape.tr.p} value={JSON.stringify(shape.tr.p?.k)} />
                                    {shape.tr.s && <PropertyRow sidebarWidth={sidebarWidth} indent={indent + 2} label="Scale" prop={shape.tr.s} value={JSON.stringify(shape.tr.s?.k)} />}
                                    {shape.tr.r && <PropertyRow sidebarWidth={sidebarWidth} indent={indent + 2} label="Rotation" prop={shape.tr.r} value={JSON.stringify(shape.tr.r?.k ?? 0) + "°"} />}
                                    {shape.tr.o && <PropertyRow sidebarWidth={sidebarWidth} indent={indent + 2} label="Opacity" prop={shape.tr.o} value={JSON.stringify(shape.tr.o?.k) + "%"} />}
                                </>
                            )}
                            {/* Direct properties for rect/ellipse etc */}
                            {shape.p && <PropertyRow sidebarWidth={sidebarWidth} indent={indent + 2} label="Position" prop={shape.p} value={JSON.stringify(shape.p.k)} />}
                            {shape.s && <PropertyRow sidebarWidth={sidebarWidth} indent={indent + 2} label="Size" prop={shape.s} value={JSON.stringify(shape.s.k)} />}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export function Timeline() {
    const layers = useStore((state) => state.animation.layers);
    const currentTime = useStore((state) => state.currentTime);
    const setTime = useStore((state) => state.setTime);
    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
    const isResizing = useRef(false);

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frame = Math.max(0, x / FRAME_WIDTH);
        setTime(frame);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.buttons === 1 && !isResizing.current) {
            handleScrub(e);
        }
    };

    // Sidebar Resizing
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newWidth = Math.max(250, Math.min(800, e.clientX - 20));
            setSidebarWidth(newWidth);
        };
        const handleGlobalMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, []);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'ew-resize';
    };

    return (
        <div className="h-full w-full bg-[#0d0d0d] flex flex-col text-[11px] select-none text-slate-300 overflow-hidden">
            {/* Context Toolbar */}
            <div className="h-9 border-b border-border/30 flex items-center bg-[#151515] shrink-0 px-3 justify-between shadow-2xl z-50">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2 group/search">
                        <Search className="w-3.5 h-3.5 text-muted-foreground/40 group-focus-within/search:text-blue-400 transition-colors" />
                        <input
                            placeholder="Find layer..."
                            className="bg-transparent border-none outline-none text-[11px] w-48 placeholder:text-muted-foreground/20 text-foreground"
                        />
                    </div>
                    <div className="h-4 w-[1px] bg-border/40" />
                    <div className="flex gap-4">
                        <button className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground transition-colors">
                            <Filter className="w-3.5 h-3.5" />
                            <span className="font-semibold uppercase tracking-tighter text-[9px]">Filters</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground transition-colors">
                            <Ghost className="w-3.5 h-3.5" />
                            <span className="font-semibold uppercase tracking-tighter text-[9px]">Shy</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 font-mono text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                        <span className="text-[10px] opacity-40">TIME</span>
                        <span>{Math.floor(currentTime / 60).toString().padStart(2, '0')} : {Math.round(currentTime % 60).toString().padStart(2, '0')}f</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Main Area */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#0d0d0d]">
                {/* Header (Sticky Top) */}
                <div className="sticky top-0 z-50 h-8 flex items-center bg-[#1a1a1a] border-b border-border/50">
                    <div
                        className="sticky left-0 z-[60] h-full border-r border-border/50 px-3 flex items-center shrink-0 bg-[#1a1a1a]"
                        style={{ width: `${sidebarWidth}px` }}
                    >
                        <div className="flex-1 flex items-center gap-2">
                            <span className="font-bold uppercase tracking-widest text-[9px] text-muted-foreground/60">Layer Name</span>
                        </div>
                        <div className="h-full border-l border-border/10 flex items-center px-2 shrink-0 gap-8">
                            <span className="text-muted-foreground/40 text-[9px] font-bold uppercase tracking-widest">Parent / Link</span>
                            <span className="text-muted-foreground/40 text-[9px] font-bold uppercase tracking-widest">Mode</span>
                        </div>

                        {/* Resize Handle */}
                        <div
                            className="absolute -right-0.5 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/80 transition-colors z-[70] active:bg-blue-400"
                            onMouseDown={startResizing}
                        />
                    </div>

                    {/* Time Ruler Area (Sticky Top, Scrolls Horizontally) */}
                    <div
                        className="flex-1 relative h-full cursor-pointer min-w-[3000px] border-b border-white/[0.02]"
                        onMouseDown={handleScrub}
                        onMouseMove={handleMouseMove}
                    >
                        <div className="absolute inset-0 bg-[#1a1a1a]" />

                        {/* Time Ruler Labels */}
                        <div className="absolute inset-0 flex items-end pb-1 text-[9px] text-muted-foreground/30 font-mono select-none pointer-events-none px-1">
                            {Array.from({ length: 150 }).map((_, i) => (
                                <div key={i} className={clsx("absolute bottom-0 border-l h-1.5", i % 10 === 0 ? "border-white/20 h-3" : "border-white/5 h-1.5")} style={{ left: `${i * 10 * FRAME_WIDTH}px` }}>
                                    {i % 10 === 0 && <span className="pl-1.5 mb-1 inline-block">{i * 10}f</span>}
                                </div>
                            ))}
                        </div>

                        {/* Scrubber Playhead (Top portion) */}
                        <div
                            className="absolute top-0 bottom-0 w-[1.5px] bg-blue-500 z-50 pointer-events-none shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                            style={{ left: `${currentTime * FRAME_WIDTH}px` }}
                        >
                            <div className="absolute -top-1 -left-[5.5px] w-3 h-5 bg-blue-500 rounded-sm shadow-xl flex items-center justify-center border border-white/20">
                                <div className="w-[1px] h-3 bg-white/40" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="relative min-w-fit flex flex-col">
                    {/* Background Grid (Spans whole width) */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[5]"
                        style={{
                            backgroundSize: `${FRAME_WIDTH}px 100%`,
                            backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px)',
                            marginLeft: `${sidebarWidth}px`
                        }}
                    />

                    {/* Global Playhead Line (extends down entire list) */}
                    <div
                        className="absolute top-0 bottom-0 w-[1px] bg-blue-500/20 pointer-events-none z-20"
                        style={{ left: `${sidebarWidth + currentTime * FRAME_WIDTH}px` }}
                    />

                    {/* Layer List */}
                    <div className="relative z-10 flex flex-col min-h-[500px]">
                        {layers.map((layer, index) => (
                            <LayerRow key={layer.ind} layer={layer} index={index} sidebarWidth={sidebarWidth} />
                        ))}
                        {layers.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-20 italic text-sm tracking-widest text-center">
                                <Ghost className="w-12 h-12 mb-4" />
                                <p>No layers in current composition</p>
                                <p className="text-[10px] mt-2 non-italic opacity-50 uppercase tracking-tighter text-blue-400">Drag files to viewport or click Add button</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline Bottom Status */}
            <div className="h-7 bg-[#0a0a0a] border-t border-border/20 flex items-center px-4 justify-between text-[10px] text-muted-foreground/40 font-medium tracking-tight shrink-0">
                <div className="flex gap-6 items-center">
                    <span className="flex items-center gap-2"><Hash className="w-3 h-3" /> {layers.length} Layers</span>
                    <span>1920 x 1080 (60.00 fps)</span>
                </div>
                <div className="flex gap-4">
                    <button className="hover:text-blue-400 text-blue-500/40 uppercase tracking-widest text-[9px] transition-colors">Switches</button>
                    <button className="hover:text-blue-400 text-blue-500/40 uppercase tracking-widest text-[9px] transition-colors">Modes</button>
                    <div className="w-[1px] h-3 bg-border/20 mx-1" />
                    <span className="hover:text-foreground cursor-pointer transition-colors">Render: Quarter</span>
                </div>
            </div>
        </div>
    );
}
