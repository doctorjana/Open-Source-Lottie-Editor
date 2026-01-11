import { useStore } from '../../store/useStore';
import { type Vector3, type ShapeElement } from '../../types/lottie';
import { clsx } from 'clsx';
import { Lock, Timer, TimerOff, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FontManager, type FontMetadata } from '../../lib/FontManager';
import { getLottieVal } from '../../lib/lottieUtils';

// Helper to convert normalized RGB [0-1] to Hex
const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return "#" + toHex(r) + toHex(g) + toHex(b);
};

// Helper to convert Hex to normalized RGB [0-1]
const hexToRgb = (hex: string): Vector3 => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
};

export function PropertiesPanel() {
    const selectedLayerId = useStore((state) => state.selectedLayerId);
    const layers = useStore((state) => state.animation.layers);
    const updateLayer = useStore((state) => state.updateLayer);
    const toggleAnimation = useStore((state) => state.toggleAnimation);
    const addKeyframe = useStore((state) => state.addKeyframe);
    const currentTime = useStore((state) => state.currentTime);
    const lockedIds = useStore((state) => state.lockedIds);
    const syncTextToShapes = useStore((state) => state.syncTextToShapes);

    const [fonts, setFonts] = useState<FontMetadata[]>([]);
    const [fontSearch, setFontSearch] = useState('');

    useEffect(() => {
        FontManager.getFonts().then(setFonts);
    }, []);

    const selectedLayer = layers.find(l => l.ind === selectedLayerId);
    const isLocked = selectedLayer ? !!lockedIds[selectedLayer.ind] : false;

    // Unified helper for property values
    const getVal = <T,>(prop: any): T => getLottieVal<T>(prop, currentTime, 0);

    // --- Transform Updaters ---

    const handlePropertyChange = (path: string, value: any, prop: any) => {
        if (!selectedLayer) return;
        if (prop.a === 1) {
            addKeyframe(selectedLayer.ind, path, currentTime, value);
        } else {
            // Static update
            const pathParts = path.split('.');
            const lastPart = pathParts.pop()!;
            let target: any = selectedLayer;
            pathParts.forEach(p => target = target[p]);

            updateLayer(selectedLayer.ind, {
                [pathParts[0] || lastPart]: (target === selectedLayer)
                    ? { ...(selectedLayer[lastPart as keyof typeof selectedLayer] as any), k: value }
                    : { ...selectedLayer.ks, [lastPart]: { ...prop, k: value } }
            });

            // Special case for deep updates like ks.p
            if (path.startsWith('ks.')) {
                updateLayer(selectedLayer.ind, {
                    ks: { ...selectedLayer.ks, [lastPart]: { ...prop, k: value } }
                });
            }
        }
    };

    const handlePosChange = (axis: 0 | 1, value: number) => {
        if (!selectedLayer) return;
        const p = selectedLayer.ks.p;
        const currentVal = [...getVal<Vector3>(p)];
        currentVal[axis] = value;
        handlePropertyChange('ks.p', currentVal, p);
    };

    const handleScaleChange = (value: number) => {
        if (!selectedLayer) return;
        const s = selectedLayer.ks.s;
        const newK: Vector3 = [value, value, 100];
        handlePropertyChange('ks.s', newK, s);
    };

    const handleRotationChange = (value: number) => {
        if (!selectedLayer) return;
        handlePropertyChange('ks.r', value, selectedLayer.ks.r);
    };

    const handleOpacityChange = (value: number) => {
        if (!selectedLayer) return;
        handlePropertyChange('ks.o', value, selectedLayer.ks.o);
    };

    // --- Color Updaters ---

    const findFillShape = (shapes: ShapeElement[], pathPrefix = "shapes"): { shape: ShapeElement, path: string } | null => {
        for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            const currentPath = `${pathPrefix}.${i}`;
            if (s.ty === 'fl') return { shape: s, path: currentPath };
            if (s.ty === 'gr' && s.it) {
                const found = findFillShape(s.it, `${currentPath}.it`);
                if (found) return found;
            }
        }
        return null;
    };

    const findStrokeShape = (shapes: ShapeElement[], pathPrefix = "shapes"): { shape: any, path: string } | null => {
        for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            const currentPath = `${pathPrefix}.${i}`;
            if (s.ty === 'st') return { shape: s, path: currentPath };
            if (s.ty === 'gr' && s.it) {
                const found = findStrokeShape(s.it, `${currentPath}.it`);
                if (found) return found;
            }
        }
        return null;
    };

    const findPathShape = (shapes: ShapeElement[], pathPrefix = "shapes"): { shape: any, path: string } | null => {
        for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            const currentPath = `${pathPrefix}.${i}`;
            if (s.ty === 'sh') return { shape: s, path: currentPath };
            if (s.ty === 'gr' && s.it) {
                const found = findPathShape(s.it, `${currentPath}.it`);
                if (found) return found;
            }
        }
        return null;
    };

    const handleShapePropertyChange = (shapesPath: string, value: any, prop: any) => {
        if (!selectedLayer || !selectedLayer.shapes) return;

        if (prop?.a === 1) {
            addKeyframe(selectedLayer.ind, shapesPath, currentTime, value);
        } else {
            const newShapes = JSON.parse(JSON.stringify(selectedLayer.shapes));
            const pathParts = shapesPath.split('.'); // e.g., ["shapes", "0", "it", "1", "c", "k"] or similar
            let current = newShapes;
            for (let i = 1; i < pathParts.length - 1; i++) {
                current = current[pathParts[i]];
            }

            const lastKey = pathParts[pathParts.length - 1];
            if (prop && prop.k !== undefined) {
                current[lastKey].k = value;
            } else {
                current[lastKey] = value;
            }

            updateLayer(selectedLayer.ind, { shapes: newShapes });
        }
    };

    const handleColorChange = (hex: string) => {
        if (!selectedLayer || !selectedLayer.shapes) return;
        const fillInfo = findFillShape(selectedLayer.shapes);
        if (fillInfo && fillInfo.shape.c) {
            const rgb = hexToRgb(hex);
            if (fillInfo.shape.c.a === 1) {
                addKeyframe(selectedLayer.ind, `${fillInfo.path}.c`, currentTime, rgb);
            } else {
                const newShapes = JSON.parse(JSON.stringify(selectedLayer.shapes));
                const pathParts = fillInfo.path.split('.');
                let current = newShapes;
                for (let i = 1; i < pathParts.length - 1; i++) current = current[pathParts[i]];
                current[pathParts[pathParts.length - 1]].c.k = rgb;
                updateLayer(selectedLayer.ind, { shapes: newShapes });
            }
        }
    };

    // --- Render Components ---

    const Stopwatch = ({ path, prop }: { path: string, prop: any }) => (
        <button
            onClick={() => selectedLayer && toggleAnimation(selectedLayer.ind, path)}
            className={clsx(
                "p-1 rounded hover:bg-white/10 transition-colors",
                prop?.a === 1 ? "text-blue-500" : "text-muted-foreground/30"
            )}
        >
            {prop?.a === 1 ? <Timer className="w-3 h-3" /> : <TimerOff className="w-3 h-3" />}
        </button>
    );

    if (!selectedLayer) {
        return (
            <div className="h-full w-full bg-background flex flex-col">
                <div className="h-8 border-b flex items-center px-4 bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground">Properties</span>
                </div>
                <div className="p-4 text-xs text-muted-foreground flex items-center justify-center flex-1">Select a layer to edit</div>
            </div>
        );
    }

    const pos = getVal<Vector3>(selectedLayer.ks.p);
    const scale = getVal<Vector3>(selectedLayer.ks.s);
    const rot = getVal<number>(selectedLayer.ks.r);
    const op = getVal<number>(selectedLayer.ks.o);

    let currentColor = "#ffffff";
    let colorProp = null;
    let colorPath = "";

    let strokeColor = "#000000";
    let strokeProp = null;
    let strokePath = "";
    let strokeWidth = 0;
    let strokeWidthProp = null;
    let strokeWidthPath = "";

    let isClosed = false;
    let pathProp = null;
    let pathInfo = null;

    if (selectedLayer.shapes) {
        const fillInfo = findFillShape(selectedLayer.shapes);
        if (fillInfo && fillInfo.shape.c) {
            const rgb = getVal<Vector3>(fillInfo.shape.c);
            currentColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
            colorProp = fillInfo.shape.c;
            colorPath = `${fillInfo.path}.c`;
        }

        const strokeInfo = findStrokeShape(selectedLayer.shapes);
        if (strokeInfo) {
            if (strokeInfo.shape.c) {
                const rgb = getVal<Vector3>(strokeInfo.shape.c);
                strokeColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
                strokeProp = strokeInfo.shape.c;
                strokePath = `${strokeInfo.path}.c`;
            }
            if (strokeInfo.shape.w) {
                strokeWidth = getVal<number>(strokeInfo.shape.w);
                strokeWidthProp = strokeInfo.shape.w;
                strokeWidthPath = `${strokeInfo.path}.w`;
            }
        }

        pathInfo = findPathShape(selectedLayer.shapes);
        if (pathInfo && pathInfo.shape.ks) {
            const ks = getVal<any>(pathInfo.shape.ks);
            isClosed = ks?.c || false;
            pathProp = pathInfo.shape.ks;
        }
    }

    return (
        <div className={clsx("h-full w-full bg-background flex flex-col text-xs transition-opacity", isLocked && "opacity-60 pointer-events-none")}>
            <div className="h-8 border-b flex items-center px-4 bg-muted/20 shrink-0 justify-between">
                <span className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Properties</span>
                {isLocked && <Lock className="w-3 h-3 text-red-500" />}
            </div>
            <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Layer Name</label>
                    <input
                        disabled={isLocked}
                        className="w-full bg-input border border-border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500/50"
                        value={selectedLayer.nm}
                        onChange={(e) => updateLayer(selectedLayer.ind, { nm: e.target.value })}
                    />
                </div>

                {selectedLayer.text !== undefined && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/50 pb-1">
                            <h3 className="flex items-center gap-2 font-bold text-foreground/70 uppercase tracking-tighter">
                                <Type className="w-3 h-3" />
                                Text
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[9px] text-muted-foreground uppercase font-bold">Content</label>
                                <textarea
                                    className="w-full bg-input border border-border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500/50 resize-none min-h-[60px]"
                                    value={selectedLayer.text}
                                    onChange={(e) => {
                                        updateLayer(selectedLayer.ind, { text: e.target.value });
                                        syncTextToShapes(selectedLayer.ind);
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-muted-foreground uppercase font-bold">Font Family</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Search fonts..."
                                        className="w-full bg-input border border-border rounded px-2 py-1 text-[10px]"
                                        value={fontSearch}
                                        onChange={(e) => setFontSearch(e.target.value)}
                                    />
                                    <select
                                        className="w-full bg-input border border-border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500/50"
                                        value={selectedLayer.font}
                                        onChange={(e) => {
                                            updateLayer(selectedLayer.ind, { font: e.target.value });
                                            syncTextToShapes(selectedLayer.ind);
                                        }}
                                    >
                                        {fonts.filter(f => f.family.toLowerCase().includes(fontSearch.toLowerCase())).slice(0, 50).map(f => (
                                            <option key={f.family} value={f.family}>{f.family}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-muted-foreground uppercase font-bold">Size</label>
                                <input
                                    type="number"
                                    className="w-full bg-input border border-border rounded px-2 py-1"
                                    value={selectedLayer.fontSize}
                                    onChange={(e) => {
                                        updateLayer(selectedLayer.ind, { fontSize: Number(e.target.value) });
                                        syncTextToShapes(selectedLayer.ind);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1">
                        <h3 className="font-bold text-foreground/70 uppercase tracking-tighter">Transform</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Stopwatch path="ks.p" prop={selectedLayer.ks.p} />
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground uppercase">Position X</label>
                                    <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(pos[0])} onChange={(e) => handlePosChange(0, Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground uppercase">Position Y</label>
                                    <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(pos[1])} onChange={(e) => handlePosChange(1, Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Stopwatch path="ks.s" prop={selectedLayer.ks.s} />
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] text-muted-foreground uppercase">Scale %</label>
                                <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(scale[0])} onChange={(e) => handleScaleChange(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Stopwatch path="ks.r" prop={selectedLayer.ks.r} />
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] text-muted-foreground uppercase">Rotation</label>
                                <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(rot)} onChange={(e) => handleRotationChange(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Stopwatch path="ks.o" prop={selectedLayer.ks.o} />
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] text-muted-foreground uppercase">Opacity %</label>
                                <div className="flex items-center gap-3">
                                    <input type="range" className="flex-1 accent-blue-500" value={op} onChange={(e) => handleOpacityChange(Number(e.target.value))} />
                                    <span className="w-8 text-right font-mono text-[10px]">{Math.round(op)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {selectedLayer.ty === 4 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/50 pb-1">
                            <h3 className="font-bold text-foreground/70 uppercase tracking-tighter">Styles</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Stopwatch path={colorPath} prop={colorProp} />
                            <div className="flex-1 flex items-center justify-between">
                                <label className="text-[9px] text-muted-foreground uppercase">Fill Color</label>
                                <input type="color" className="w-8 h-8 rounded bg-transparent border-0 p-0 cursor-pointer" value={currentColor} onChange={(e) => handleColorChange(e.target.value)} />
                            </div>
                        </div>

                        {strokePath && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={strokePath} prop={strokeProp} />
                                    <div className="flex-1 flex items-center justify-between">
                                        <label className="text-[9px] text-muted-foreground uppercase">Stroke Color</label>
                                        <input type="color" className="w-8 h-8 rounded bg-transparent border-0 p-0 cursor-pointer" value={strokeColor} onChange={(e) => handleShapePropertyChange(strokePath, hexToRgb(e.target.value), strokeProp)} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={strokeWidthPath} prop={strokeWidthProp} />
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-muted-foreground uppercase">Stroke Width</label>
                                        <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(strokeWidth)} onChange={(e) => handleShapePropertyChange(strokeWidthPath, Number(e.target.value), strokeWidthProp)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {pathInfo && (
                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-4 w-4 appearance-none rounded border border-border bg-input transition-all checked:bg-blue-500 checked:border-blue-500"
                                            checked={isClosed}
                                            onChange={(e) => {
                                                const currentKs = getVal<any>(pathProp);
                                                handleShapePropertyChange(`${pathInfo!.path}.ks`, { ...currentKs, c: e.target.checked }, pathProp);
                                            }}
                                        />
                                        <svg className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground group-hover:text-foreground transition-colors">Closed Loop</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
