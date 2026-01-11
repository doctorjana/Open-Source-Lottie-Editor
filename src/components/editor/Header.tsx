import { useStore } from '../../store/useStore';
import { type Layer } from '../../types/lottie';
import { clsx } from 'clsx';
import { Play, Pause, Square, Circle, Trash2, Star, Hexagon, PenTool, MousePointer2, Settings, Download, Upload, Type, ChevronDown, FileJson, FileArchive, Video } from 'lucide-react';
import { loadDotLottie, saveDotLottie, recordCanvasToVideo } from '../../lib/lottieUtils';
import { useState } from 'react';

export function Header() {
    const addLayer = useStore((state) => state.addLayer);
    const deleteLayer = useStore((state) => state.deleteLayer);
    const selectedLayerId = useStore((state) => state.selectedLayerId);
    const isPlaying = useStore((state) => state.isPlaying);
    const togglePlayback = useStore((state) => state.togglePlayback);
    const animation = useStore((state) => state.animation);
    const setAnimation = useStore((state) => state.setAnimation);
    const activeTool = useStore((state) => state.activeTool);
    const setTool = useStore((state) => state.setTool);
    const addTextLayer = useStore((state) => state.addTextLayer);
    const syncTextToShapes = useStore((state) => state.syncTextToShapes);

    const handleAddRect = () => {
        const newLayer: Layer = {
            ind: Date.now(),
            ty: 4,
            nm: "Rectangle Layer",
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: [960, 540, 0] },
                s: { a: 0, k: [100, 100, 100] },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [0, 0, 0] },
            },
            ip: 0,
            op: 300,
            st: 0,
            shapes: [{
                ty: "gr",
                nm: "Rectangle Group",
                it: [
                    {
                        ty: "rc",
                        nm: "Rectangle Path",
                        p: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [200, 200] },
                        r: { a: 0, k: 0 }
                    },
                    {
                        ty: "fl",
                        nm: "Fill",
                        c: { a: 0, k: [1, 0, 0] },
                        o: { a: 0, k: 100 }
                    },
                    {
                        ty: "tr",
                        nm: "Transform",
                        p: { a: 0, k: [0, 0] },
                        a: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [100, 100] },
                        r: { a: 0, k: 0 },
                        o: { a: 0, k: 100 }
                    }
                ]
            }]
        };
        addLayer(newLayer);
        setTool('select');
    };

    const handleAddCircle = () => {
        const newLayer: Layer = {
            ind: Date.now(),
            ty: 4,
            nm: "Ellipse Layer",
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: [960, 540, 0] },
                s: { a: 0, k: [100, 100, 100] },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [0, 0, 0] },
            },
            ip: 0,
            op: 300,
            st: 0,
            shapes: [{
                ty: "gr",
                nm: "Ellipse Group",
                it: [
                    {
                        ty: "el",
                        nm: "Ellipse Path",
                        p: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [200, 200] }
                    },
                    {
                        ty: "fl",
                        nm: "Fill",
                        c: { a: 0, k: [0, 0.5, 1] },
                        o: { a: 0, k: 100 }
                    },
                    {
                        ty: "tr",
                        nm: "Transform",
                        p: { a: 0, k: [0, 0] },
                        a: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [100, 100] },
                        r: { a: 0, k: 0 },
                        o: { a: 0, k: 100 }
                    }
                ]
            }]
        };
        addLayer(newLayer);
        setTool('select');
    };

    const handleAddStar = () => {
        const newLayer: Layer = {
            ind: Date.now(),
            ty: 4,
            nm: "Star Layer",
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: [960, 540, 0] },
                s: { a: 0, k: [100, 100, 100] },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [0, 0, 0] },
            },
            ip: 0,
            op: 300,
            st: 0,
            shapes: [{
                ty: "gr",
                nm: "Star Group",
                it: [
                    {
                        ty: "sr",
                        nm: "Star Path",
                        sy: 1, // Star
                        p: { a: 0, k: [0, 0] },
                        r: { a: 0, k: 0 },
                        pt: { a: 0, k: 5 }, // Points
                        ir: { a: 0, k: 50 }, // Inner Radius
                        is: { a: 0, k: 0 }, // Inner Roundness
                        or: { a: 0, k: 100 }, // Outer Radius
                        os: { a: 0, k: 0 } // Outer Roundness
                    },
                    {
                        ty: "fl",
                        nm: "Fill",
                        c: { a: 0, k: [1, 1, 0] },
                        o: { a: 0, k: 100 }
                    },
                    {
                        ty: "tr",
                        nm: "Transform",
                        p: { a: 0, k: [0, 0] },
                        a: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [100, 100] },
                        r: { a: 0, k: 0 },
                        o: { a: 0, k: 100 }
                    }
                ]
            }]
        };
        addLayer(newLayer);
        setTool('select');
    };

    const handleAddPolygon = () => {
        const newLayer: Layer = {
            ind: Date.now(),
            ty: 4, // Polygon
            nm: "Polygon Layer",
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: [960, 540, 0] },
                s: { a: 0, k: [100, 100, 100] },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [0, 0, 0] },
            },
            ip: 0,
            op: 300,
            st: 0,
            shapes: [{
                ty: "gr",
                nm: "Polygon Group",
                it: [
                    {
                        ty: "sr",
                        nm: "Polygon Path",
                        sy: 2, // Polygon
                        p: { a: 0, k: [0, 0] },
                        r: { a: 0, k: 0 },
                        pt: { a: 0, k: 6 }, // Points
                        or: { a: 0, k: 100 }, // Outer Radius
                        os: { a: 0, k: 0 } // Outer Roundness
                    },
                    {
                        ty: "fl",
                        nm: "Fill",
                        c: { a: 0, k: [0, 1, 0.5] },
                        o: { a: 0, k: 100 }
                    },
                    {
                        ty: "tr",
                        nm: "Transform",
                        p: { a: 0, k: [0, 0] },
                        a: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [100, 100] },
                        r: { a: 0, k: 0 },
                        o: { a: 0, k: 100 }
                    }
                ]
            }]
        };
        addLayer(newLayer);
        setTool('select');
    };

    const handleAddText = async () => {
        const text = prompt("Enter text:");
        if (text) {
            const ind = Date.now();
            addTextLayer(text);
            // We need to sync shapes immediately
            // But addTextLayer is not async but it updates state.
            // Since useStore actions are usually synchronous in state update,
            // we can call sync right after.
            setTimeout(() => syncTextToShapes(ind), 0);
        }
    };

    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportProgress, setExportProgress] = useState<number | null>(null);

    const handleExport = async (format: 'json' | 'lottie' | 'mp4') => {
        setIsExportOpen(false);
        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(animation));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "animation.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } else if (format === 'lottie') {
            const blob = await saveDotLottie(animation);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "animation.lottie";
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'mp4') {
            const canvas = document.querySelector('canvas');
            if (!canvas) return alert("Canvas not found for export");

            setExportProgress(0);
            try {
                // For MP4 export, we should ideally trigger a frame-by-frame render
                // But for now we'll use our basic recorder which captures what's on screen.
                // We'll jump to start and play once for recording.
                useStore.setState({ currentTime: 0, isPlaying: true });

                const blob = await recordCanvasToVideo(
                    canvas,
                    animation.op,
                    animation.fr,
                    (p) => setExportProgress(p * 100)
                );

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `animation.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Export failed", err);
                alert("Export failed");
            } finally {
                setExportProgress(null);
                useStore.setState({ isPlaying: false });
            }
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (file.name.endsWith('.lottie')) {
                const data = await loadDotLottie(file);
                setAnimation(data);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const json = JSON.parse(e.target?.result as string);
                        if (json.v && json.layers) {
                            setAnimation(json);
                        } else {
                            alert("Invalid Lottie JSON");
                        }
                    } catch (err) {
                        alert("Failed to parse JSON");
                    }
                };
                reader.readAsText(file);
            }
        } catch (err) {
            console.error("Import failed", err);
            alert("Import failed: " + (err instanceof Error ? err.message : String(err)));
        }
    };

    const ToolButton = ({ tool, icon: Icon, title, onClick }: { tool: any, icon: any, title: string, onClick?: () => void }) => (
        <button
            onClick={() => {
                setTool(tool);
                if (onClick) onClick();
            }}
            className={clsx(
                "p-1.5 rounded transition-colors group relative",
                activeTool === tool ? "bg-blue-500 text-white shadow-lg" : "hover:bg-muted text-muted-foreground"
            )}
            title={title}
        >
            <Icon className="w-4 h-4" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-0.5 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
                {title}
            </span>
        </button>
    );

    return (
        <header className="h-14 border-b bg-background flex items-center px-4 justify-between shrink-0 select-none shadow-sm z-50">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                        <span className="text-white font-black text-xs">L</span>
                    </div>
                    <h1 className="font-bold text-xs tracking-widest text-foreground uppercase">Lottie Editor</h1>
                </div>

                <div className="h-6 w-[1px] bg-border mx-2" />

                {/* Toolbar */}
                <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50">
                    <ToolButton tool="select" icon={MousePointer2} title="Selection Tool (V) - Move, Scale, Rotate" />
                    <ToolButton tool="pen" icon={PenTool} title="Pen Tool (G)" />
                    <ToolButton tool="text" icon={Type} title="Type Tool (T)" onClick={handleAddText} />
                    <div className="w-[1px] h-4 bg-border/50 mx-1" />
                    <ToolButton tool="rectangle" icon={Square} title="Rectangle Tool (R)" onClick={handleAddRect} />
                    <ToolButton tool="circle" icon={Circle} title="Ellipse Tool (O)" onClick={handleAddCircle} />
                    <ToolButton tool="star" icon={Star} title="Star Tool" onClick={handleAddStar} />
                    <ToolButton tool="polygon" icon={Hexagon} title="Polygon Tool" onClick={handleAddPolygon} />
                </div>

                <div className="h-6 w-[1px] bg-border mx-2" />

                <div className="flex gap-2">
                    <button
                        onClick={() => selectedLayerId && deleteLayer(selectedLayerId)}
                        disabled={!selectedLayerId}
                        className="p-1.5 hover:bg-red-500/10 rounded text-red-500/60 disabled:opacity-20 transition-all"
                        title="Delete Layer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border/50">
                    <button onClick={togglePlayback} className="p-1.5 hover:bg-muted rounded transition-colors" title={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <Pause className="w-4 h-4 fill-foreground" /> : <Play className="w-4 h-4 fill-foreground" />}
                    </button>
                </div>

                <div className="flex gap-1.5">
                    <label className="p-1.5 hover:bg-muted rounded flex items-center gap-2 cursor-pointer transition-colors" title="Import JSON or .lottie">
                        <Upload className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Import</span>
                        <input type="file" accept=".json,.lottie" className="hidden" onChange={handleImport} />
                    </label>

                    <div className="relative">
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="p-1.5 hover:bg-muted rounded flex items-center gap-2 transition-colors"
                            title="Export Options"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Export</span>
                            <ChevronDown className={clsx("w-3 h-3 transition-transform", isExportOpen && "rotate-180")} />
                        </button>

                        {isExportOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl overflow-hidden z-[100]">
                                <button
                                    onClick={() => handleExport('json')}
                                    className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 transition-colors"
                                >
                                    <FileJson className="w-4 h-4 text-orange-500" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold">Lottie JSON</span>
                                        <span className="text-[10px] text-muted-foreground">Standard .json file</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleExport('lottie')}
                                    className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 border-t border-border transition-colors"
                                >
                                    <FileArchive className="w-4 h-4 text-blue-500" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold">DotLottie</span>
                                        <span className="text-[10px] text-muted-foreground">Compressed .lottie file</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleExport('mp4')}
                                    className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 border-t border-border transition-colors group/video"
                                >
                                    <Video className="w-4 h-4 text-red-500" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold">Video</span>
                                        <span className="text-[10px] text-muted-foreground group-hover/video:text-red-500/70 transition-colors">Export as MP4/WebM</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {exportProgress !== null && (
                        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center">
                            <div className="bg-popover border border-border p-8 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                                    <Video className="w-8 h-8 text-blue-500 animate-pulse" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">Exporting Video</h3>
                                <p className="text-sm text-muted-foreground mb-6">Please keep this tab active while we render your animation...</p>

                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${exportProgress}%` }}
                                    />
                                </div>
                                <span className="text-xs font-mono font-bold text-blue-500">{Math.round(exportProgress)}%</span>
                            </div>
                        </div>
                    )}

                    <button className="p-1.5 hover:bg-muted rounded transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
}

