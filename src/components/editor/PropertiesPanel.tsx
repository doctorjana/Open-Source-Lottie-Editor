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
    const convertToPath = useStore((state) => state.convertToPath);
    const selectedShapePath = useStore((state) => state.selectedShapePath);

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
                [pathParts[0]]: (target === selectedLayer)
                    ? { ...(selectedLayer[lastPart as keyof typeof selectedLayer] as any), k: value }
                    : deepUpdate(selectedLayer[pathParts[0] as keyof typeof selectedLayer], pathParts.slice(1), value, prop)
            });
        }
    };

    const deepUpdate = (obj: any, path: string[], value: any, prop: any): any => {
        if (path.length === 0) {
            return prop && prop.k !== undefined ? { ...prop, k: value } : value;
        }
        const key = path[0];
        const nextPath = path.slice(1);
        if (Array.isArray(obj)) {
            const idx = parseInt(key);
            const newArr = [...obj];
            newArr[idx] = deepUpdate(obj[idx], nextPath, value, prop);
            return newArr;
        } else {
            return {
                ...obj,
                [key]: deepUpdate(obj[key], nextPath, value, prop)
            };
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

    const findPathShape = (shapes: any[], pathPrefix = "shapes"): { shape: any, path: string } | null => {
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

    const findParametricShape = (shapes: any[], pathPrefix = "shapes"): { shape: any, path: string } | null => {
        for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            const currentPath = `${pathPrefix}.${i}`;
            if (s.ty === 'rc' || s.ty === 'el' || s.ty === 'sr') return { shape: s, path: currentPath };
            if (s.ty === 'gr' && s.it) {
                const found = findParametricShape(s.it, `${currentPath}.it`);
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

    const parametricInfo = selectedLayer.shapes ? findParametricShape(selectedLayer.shapes) : null;

    let selectedShape: any = null;
    if (selectedShapePath && selectedLayer) {
        const pathParts = selectedShapePath.split('.');
        let current: any = selectedLayer;
        pathParts.forEach(p => {
            if (current && current[p] !== undefined) current = current[p];
        });
        selectedShape = current;
    }

    return (
        <div className={clsx("h-full w-full bg-background flex flex-col text-xs transition-opacity", isLocked && "opacity-60 pointer-events-none")}>
            <div className="h-8 border-b flex items-center px-4 bg-muted/20 shrink-0 justify-between">
                <span className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">
                    {selectedShapePath ? `Selection: ${selectedShape?.nm || selectedShape?.ty}` : 'Properties'}
                </span>
                {isLocked && <Lock className="w-3 h-3 text-red-500" />}
            </div>
            <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
                {selectedShapePath && selectedShape && (
                    <div className="space-y-4 p-3 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                                {selectedShape.ty === 'gr' ? 'Group' :
                                    selectedShape.ty === 'fl' ? 'Fill' :
                                        selectedShape.ty === 'st' ? 'Stroke' :
                                            selectedShape.ty === 'sh' ? 'Path' :
                                                selectedShape.ty === 'tr' ? 'Transform' : 'Item'} Properties
                            </span>
                            <button
                                onClick={() => useStore.getState().selectShape(null)}
                                className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                            >Close</button>
                        </div>

                        {/* Group / Shape Name */}
                        <div className="space-y-1">
                            <label className="text-[9px] text-muted-foreground uppercase">Name</label>
                            <input
                                className="w-full bg-input border border-border rounded px-2 py-1"
                                value={selectedShape.nm || ''}
                                onChange={(e) => handlePropertyChange(`${selectedShapePath}.nm`, e.target.value, null)}
                            />
                        </div>

                        {/* Fill Properties */}
                        {selectedShape.ty === 'fl' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={`${selectedShapePath}.c`} prop={selectedShape.c} />
                                    <div className="flex-1 flex items-center justify-between">
                                        <label className="text-[9px] text-muted-foreground uppercase">Color</label>
                                        <input
                                            type="color"
                                            className="w-8 h-8 rounded bg-transparent border-0 p-0 cursor-pointer"
                                            value={rgbToHex(getLottieVal<Vector3>(selectedShape.c, currentTime, 0)[0], getLottieVal<Vector3>(selectedShape.c, currentTime, 0)[1], getLottieVal<Vector3>(selectedShape.c, currentTime, 0)[2])}
                                            onChange={(e) => handlePropertyChange(`${selectedShapePath}.c`, hexToRgb(e.target.value), selectedShape.c)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={`${selectedShapePath}.o`} prop={selectedShape.o} />
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-muted-foreground uppercase">Opacity %</label>
                                        <input
                                            type="range"
                                            className="w-full accent-blue-500"
                                            value={getLottieVal<number>(selectedShape.o, currentTime, 100)}
                                            onChange={(e) => handlePropertyChange(`${selectedShapePath}.o`, Number(e.target.value), selectedShape.o)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stroke Properties */}
                        {selectedShape.ty === 'st' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={`${selectedShapePath}.c`} prop={selectedShape.c} />
                                    <div className="flex-1 flex items-center justify-between">
                                        <label className="text-[9px] text-muted-foreground uppercase">Color</label>
                                        <input
                                            type="color"
                                            className="w-8 h-8 rounded bg-transparent border-0 p-0 cursor-pointer"
                                            value={rgbToHex(getLottieVal<Vector3>(selectedShape.c, currentTime, 0)[0], getLottieVal<Vector3>(selectedShape.c, currentTime, 0)[1], getLottieVal<Vector3>(selectedShape.c, currentTime, 0)[2])}
                                            onChange={(e) => handlePropertyChange(`${selectedShapePath}.c`, hexToRgb(e.target.value), selectedShape.c)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={`${selectedShapePath}.w`} prop={selectedShape.w} />
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-muted-foreground uppercase">Width</label>
                                        <input
                                            type="number"
                                            className="w-full bg-input border border-border rounded px-2 py-1"
                                            value={getLottieVal<number>(selectedShape.w, currentTime, 1)}
                                            onChange={(e) => handlePropertyChange(`${selectedShapePath}.w`, Number(e.target.value), selectedShape.w)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Path Properties */}
                        {selectedShape.ty === 'sh' && (
                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-4 w-4 appearance-none rounded border border-border bg-input transition-all checked:bg-blue-500 checked:border-blue-500"
                                            checked={getLottieVal<any>(selectedShape.ks, currentTime, {}).c || false}
                                            onChange={(e) => {
                                                const currentKs = getLottieVal<any>(selectedShape.ks, currentTime, {});
                                                handlePropertyChange(`${selectedShapePath}.ks`, { ...currentKs, c: e.target.checked }, selectedShape.ks);
                                            }}
                                        />
                                        <svg className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground group-hover:text-foreground transition-colors">Closed Loop</span>
                                </label>
                                <p className="text-[9px] text-muted-foreground mt-2 italic">Edit vertices directly on the canvas using the selection tool.</p>
                            </div>
                        )}

                        {/* Rectangle / Ellipse Properties */}
                        {(selectedShape.ty === 'rc' || selectedShape.ty === 'el') && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={`${selectedShapePath}.s`} prop={selectedShape.s} />
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-muted-foreground uppercase">Size</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(getLottieVal<number[]>(selectedShape.s, currentTime, [100, 100])[0])} onChange={(e) => {
                                                const val = [...getLottieVal<number[]>(selectedShape.s, currentTime, [100, 100])];
                                                val[0] = Number(e.target.value);
                                                handlePropertyChange(`${selectedShapePath}.s`, val, selectedShape.s);
                                            }} />
                                            <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(getLottieVal<number[]>(selectedShape.s, currentTime, [100, 100])[1])} onChange={(e) => {
                                                const val = [...getLottieVal<number[]>(selectedShape.s, currentTime, [100, 100])];
                                                val[1] = Number(e.target.value);
                                                handlePropertyChange(`${selectedShapePath}.s`, val, selectedShape.s);
                                            }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Stopwatch path={`${selectedShapePath}.p`} prop={selectedShape.p} />
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-muted-foreground uppercase">Position</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(getLottieVal<number[]>(selectedShape.p, currentTime, [0, 0])[0])} onChange={(e) => {
                                                const val = [...getLottieVal<number[]>(selectedShape.p, currentTime, [0, 0])];
                                                val[0] = Number(e.target.value);
                                                handlePropertyChange(`${selectedShapePath}.p`, val, selectedShape.p);
                                            }} />
                                            <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={Math.round(getLottieVal<number[]>(selectedShape.p, currentTime, [0, 0])[1])} onChange={(e) => {
                                                const val = [...getLottieVal<number[]>(selectedShape.p, currentTime, [0, 0])];
                                                val[1] = Number(e.target.value);
                                                handlePropertyChange(`${selectedShapePath}.p`, val, selectedShape.p);
                                            }} />
                                        </div>
                                    </div>
                                </div>
                                {selectedShape.ty === 'rc' && (
                                    <div className="flex items-center gap-2">
                                        <Stopwatch path={`${selectedShapePath}.r`} prop={selectedShape.r} />
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[9px] text-muted-foreground uppercase">Roundness</label>
                                            <input type="number" className="w-full bg-input border border-border rounded px-2 py-1" value={getLottieVal<number>(selectedShape.r, currentTime, 0)} onChange={(e) => handlePropertyChange(`${selectedShapePath}.r`, Number(e.target.value), selectedShape.r)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Merge Paths */}
                        {selectedShape.ty === 'mm' && (
                            <div className="space-y-1">
                                <label className="text-[9px] text-muted-foreground uppercase">Mode</label>
                                <select
                                    className="w-full bg-input border border-border rounded px-2 py-1"
                                    value={selectedShape.mm || 1}
                                    onChange={(e) => handlePropertyChange(`${selectedShapePath}.mm`, Number(e.target.value), null)}
                                >
                                    <option value={1}>Normal (Merge)</option>
                                    <option value={2}>Add</option>
                                    <option value={3}>Subtract</option>
                                    <option value={4}>Intersect</option>
                                    <option value={5}>Exclude Intersections</option>
                                </select>
                            </div>
                        )}

                        {/* Trim Paths */}
                        {selectedShape.ty === 'tm' && (
                            <div className="space-y-3">
                                {[['s', 'Start %'], ['e', 'End %'], ['o', 'Offset']].map(([key, label]) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <Stopwatch path={`${selectedShapePath}.${key}`} prop={selectedShape[key]} />
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[9px] text-muted-foreground uppercase">{label}</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    className="flex-1 accent-purple-500"
                                                    value={getLottieVal<number>(selectedShape[key], currentTime, key === 'e' ? 100 : 0)}
                                                    onChange={(e) => handlePropertyChange(`${selectedShapePath}.${key}`, Number(e.target.value), selectedShape[key])}
                                                />
                                                <span className="w-8 text-right font-mono text-[9px]">{Math.round(getLottieVal<number>(selectedShape[key], currentTime, key === 'e' ? 100 : 0))}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transform Properties (Deep) */}
                        {(selectedShape.ty === 'tr' || selectedShape.tr) && (
                            <div className="space-y-4 pt-2">
                                <div className="border-t border-white/5 pt-3">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">Transform</span>
                                </div>
                                {['a', 'p', 's', 'r', 'o'].map(key => {
                                    const tr = selectedShape.ty === 'tr' ? selectedShape : selectedShape.tr;
                                    const prop = tr[key];
                                    if (!prop) return null;
                                    const label = key === 'a' ? 'Anchor' : key === 'p' ? 'Position' : key === 's' ? 'Scale' : key === 'r' ? 'Rotation' : 'Opacity';
                                    const prefix = selectedShape.ty === 'tr' ? selectedShapePath : `${selectedShapePath}.tr`;

                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            <Stopwatch path={`${prefix}.${key}`} prop={prop} />
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] text-muted-foreground uppercase">{label}</label>
                                                {key === 'r' || key === 'o' ? (
                                                    <input
                                                        type="number"
                                                        className="w-full bg-input border border-border rounded px-2 py-1"
                                                        value={Math.round(getLottieVal<number>(prop, currentTime, 0))}
                                                        onChange={(e) => handlePropertyChange(`${prefix}.${key}`, Number(e.target.value), prop)}
                                                    />
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-input border border-border rounded px-2 py-1"
                                                            value={Math.round(getLottieVal<number[]>(prop, currentTime, [0, 0])[0])}
                                                            onChange={(e) => {
                                                                const val = [...getLottieVal<number[]>(prop, currentTime, [0, 0])];
                                                                val[0] = Number(e.target.value);
                                                                handlePropertyChange(`${prefix}.${key}`, val, prop);
                                                            }}
                                                        />
                                                        <input
                                                            type="number"
                                                            className="w-full bg-input border border-border rounded px-2 py-1"
                                                            value={Math.round(getLottieVal<number[]>(prop, currentTime, [0, 0])[1])}
                                                            onChange={(e) => {
                                                                const val = [...getLottieVal<number[]>(prop, currentTime, [0, 0])];
                                                                val[1] = Number(e.target.value);
                                                                handlePropertyChange(`${prefix}.${key}`, val, prop);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

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

                        {parametricInfo && (
                            <div className="pt-4">
                                <button
                                    onClick={() => convertToPath(selectedLayer.ind, parametricInfo.path)}
                                    className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] uppercase font-bold tracking-widest transition-all"
                                >
                                    Convert to Bezier Path
                                </button>
                                <p className="text-[9px] text-muted-foreground mt-2 italic">Standard shapes must be converted to paths before their vertices can be edited.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
