import { create } from 'zustand';
import { type LottieAnimation, type Layer, createDefaultAnimation, type Vector2, type Vector3 } from '../types/lottie';
import { FontManager } from '../lib/FontManager';
import { toVector3, toVector2 } from '../lib/lottieUtils';
import { useHistory } from './useHistory';

interface EditorState {
    animation: LottieAnimation;
    selectedLayerId: number | null; // using 'ind' as ID usually
    currentTime: number;
    isPlaying: boolean;
    zoom: number;
    expandedIds: Record<string, boolean>;
    lockedIds: Record<number, boolean>;
    activeTool: 'select' | 'rectangle' | 'circle' | 'star' | 'polygon' | 'pen' | 'text';
    selectedShapePath: string | null; // e.g. "shapes.0.it.1"
    autoKey: boolean; // When true, any property change creates a keyframe

    // Actions
    setAnimation: (animation: LottieAnimation) => void;
    updateLayer: (index: number, layer: Partial<Layer>, skipHistory?: boolean) => void;
    updateLayerProperty: (layerInd: number, propertyPath: string, value: any, skipHistory?: boolean) => void;
    addLayer: (layer: Layer) => void;
    addTextLayer: (text: string) => void;
    deleteLayer: (index: number) => void;
    selectLayer: (index: number | null) => void;
    toggleExpansion: (id: string) => void;
    toggleLock: (id: number) => void;
    setTime: (time: number) => void;
    togglePlayback: () => void;
    setTool: (tool: 'select' | 'rectangle' | 'circle' | 'star' | 'polygon' | 'pen' | 'text') => void;
    toggleAutoKey: () => void;
    saveHistory: () => void;
    addKeyframe: (layerInd: number, propertyPath: string, time: number, value: any, skipHistory?: boolean) => void;
    toggleAnimation: (layerInd: number, propertyPath: string) => void;
    syncTextToShapes: (layerInd: number) => Promise<void>;
    convertToPath: (layerInd: number, shapePath: string) => void;
    deleteShape: (layerInd: number, shapePath: string) => void;
    deleteVertex: (layerInd: number, shapePath: string, vertexIndex: number) => void;
    addVertex: (layerInd: number, shapePath: string, afterIndex: number) => void;
    selectShape: (path: string | null) => void;
    setCanvasSize: (width: number, height: number) => void;
    addAsset: (asset: any) => void;
    addLayerFromAsset: (assetId: string, position?: [number, number]) => void;

    // Undo/Redo
    undo: () => void;
    redo: () => void;
}

export const useStore = create<EditorState>((set) => ({
    animation: createDefaultAnimation(),
    selectedLayerId: null,
    expandedIds: {},
    lockedIds: {},
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    activeTool: 'select',
    selectedShapePath: null,
    autoKey: false,

    setAnimation: (animation) => {
        console.log(`[setAnimation] Total Layers: ${animation.layers.length}, Assets: ${animation.assets?.length || 0}`);
        set({ animation, selectedLayerId: null, currentTime: 0, isPlaying: false });
    },

    updateLayer: (ind, layerUpdate, skipHistory = false) => set((state) => {
        if (!skipHistory) {
            useHistory.getState().pushState(state.animation);
        }
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind === ind) {
                return { ...layer, ...layerUpdate };
            }
            return layer;
        });
        return { animation: { ...state.animation, layers: newLayers } };
    }),

    addLayer: (layer) => set((state) => {
        useHistory.getState().pushState(state.animation);
        return {
            animation: {
                ...state.animation,
                layers: [layer, ...state.animation.layers]
            },
            selectedLayerId: layer.ind,
            activeTool: 'select',
            selectedShapePath: null
        };
    }),

    addTextLayer: (text) => set((state) => {
        const ind = Date.now();
        const newLayer: Layer = {
            ind,
            ty: 4, // We keep it as a shape layer internally for Lottie compatibility
            nm: `Text: ${text.substring(0, 10)}`,
            text: text,
            font: 'Roboto',
            fontSize: 48,
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: [state.animation.w / 2, state.animation.h / 2, 0] as Vector3 },
                s: { a: 0, k: [100, 100, 100] as Vector3 },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [0, 0, 0] as Vector3 },
            },
            ip: 0,
            op: state.animation.op,
            st: 0,
            shapes: [] // Will be filled by syncTextToShapes
        };
        return {
            animation: {
                ...state.animation,
                layers: [newLayer, ...state.animation.layers]
            },
            selectedLayerId: ind,
            activeTool: 'select',
            selectedShapePath: null
        };
    }),

    updateLayerProperty: (layerInd, propertyPath, value, skipHistory = false) => set((state) => {
        if (!skipHistory) {
            useHistory.getState().pushState(state.animation);
        }
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;
            const newLayer = JSON.parse(JSON.stringify(layer));
            const path = propertyPath.split('.');
            let current = newLayer;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            const key = path[path.length - 1];
            if (current[key] && current[key].a === 0) {
                current[key].k = value;
            } else {
                current[key] = value;
            }
            return newLayer;
        });
        return { animation: { ...state.animation, layers: newLayers } };
    }),

    saveHistory: () => {
        useHistory.getState().pushState(useStore.getState().animation);
    },

    deleteShape: (layerInd, shapePath) => set((state) => {
        useHistory.getState().pushState(state.animation);
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;
            const newLayer = JSON.parse(JSON.stringify(layer));
            const pathArr = shapePath.split('.');
            const index = parseInt(pathArr.pop()!);
            let current = newLayer;
            for (let i = 0; i < pathArr.length; i++) {
                current = current[pathArr[i]];
            }
            if (Array.isArray(current)) {
                current.splice(index, 1);
            }
            return newLayer;
        });
        return {
            animation: { ...state.animation, layers: newLayers },
            selectedShapePath: state.selectedShapePath === shapePath ? null : state.selectedShapePath
        };
    }),

    deleteLayer: (ind) => set((state) => {
        useHistory.getState().pushState(state.animation);
        return {
            animation: {
                ...state.animation,
                layers: state.animation.layers.filter(l => l.ind !== ind)
            },
            selectedLayerId: state.selectedLayerId === ind ? null : state.selectedLayerId
        };
    }),

    selectLayer: (id) => set({ selectedLayerId: id, activeTool: 'select', selectedShapePath: null }),

    selectShape: (path) => set({ selectedShapePath: path, activeTool: 'select' }),

    toggleExpansion: (id) => set((state) => ({
        expandedIds: {
            ...state.expandedIds,
            [id]: !state.expandedIds[id]
        }
    })),

    toggleLock: (id) => set((state) => ({
        lockedIds: {
            ...state.lockedIds,
            [id]: !state.lockedIds[id]
        }
    })),

    setTime: (time) => set({ currentTime: time }),

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setTool: (tool) => set({ activeTool: tool }),
    toggleAutoKey: () => set((state) => ({ autoKey: !state.autoKey })),

    addKeyframe: (layerInd, propertyPath, time, value, skipHistory = false) => set((state) => {
        if (!skipHistory) {
            useHistory.getState().pushState(state.animation);
        }
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;

            const newLayer = JSON.parse(JSON.stringify(layer));
            const path = propertyPath.split('.');
            let current = newLayer;

            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }

            const prop = current[path[path.length - 1]];
            if (!prop) return layer;

            // Check if value is a ShapePath (has v, i, o properties that are arrays)
            const isShapePath = value &&
                Array.isArray(value.v) &&
                Array.isArray(value.i) &&
                Array.isArray(value.o) &&
                typeof value.c === 'boolean';

            if (isShapePath) {
                // Handle ShapePath keyframes specially
                if (prop.a === 0) {
                    // Convert from static to animated
                    const staticPath = prop.k;
                    prop.a = 1;
                    prop.k = [{
                        t: 0,
                        s: [JSON.parse(JSON.stringify(staticPath))],
                        // Use linear easing for shape morphing
                        i: { x: 0.833, y: 0.833 },
                        o: { x: 0.167, y: 0.167 }
                    }];
                }

                const keyframes = prop.k as any[];
                const existingKeyframe = keyframes.find(k => Math.abs(k.t - time) < 0.1);

                if (existingKeyframe) {
                    existingKeyframe.s = [JSON.parse(JSON.stringify(value))];
                } else {
                    keyframes.push({
                        t: time,
                        s: [JSON.parse(JSON.stringify(value))],
                        i: { x: 0.833, y: 0.833 },
                        o: { x: 0.167, y: 0.167 }
                    });
                    keyframes.sort((a, b) => a.t - b.t);
                }

                // Sync 'e' (end values) for ShapePath keyframes
                for (let j = 0; j < keyframes.length; j++) {
                    const cur = keyframes[j];
                    const next = keyframes[j + 1];

                    if (next) {
                        cur.e = JSON.parse(JSON.stringify(next.s));
                    } else {
                        cur.e = JSON.parse(JSON.stringify(cur.s));
                    }

                    // Ensure easing handles exist
                    if (!cur.i) cur.i = { x: 0.833, y: 0.833 };
                    if (!cur.o) cur.o = { x: 0.167, y: 0.167 };
                }

                return newLayer;
            }

            // Ensure it's animated
            if (prop.a === 0) {
                const staticVal = prop.k;
                let valForKfs = Array.isArray(staticVal) ? staticVal : [staticVal];

                // Hard enforce dimensions for transform properties
                if (propertyPath.endsWith('.p') || propertyPath.endsWith('.a') || propertyPath.endsWith('.s')) {
                    if (propertyPath.includes('.it.') || propertyPath.includes('.shapes.')) {
                        valForKfs = toVector2(staticVal);
                    } else {
                        valForKfs = toVector3(staticVal, propertyPath.endsWith('.s') ? 100 : 0);
                    }
                }

                const dims = valForKfs.length;
                const i_o = {
                    x: Array(dims).fill(0.833),
                    y: Array(dims).fill(0.833)
                };

                prop.a = 1;
                prop.k = [{
                    t: 0,
                    s: JSON.parse(JSON.stringify(valForKfs)),
                    i: JSON.parse(JSON.stringify(i_o)),
                    o: JSON.parse(JSON.stringify({ x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }))
                }];
            }

            const keyframes = prop.k as any[];
            const valArray = Array.isArray(value) ? value : [value];
            const dims = keyframes[0]?.s?.length || valArray.length;

            // Ensure valArray matches dims if it's a scalar being added to a vector
            let finalValArray = valArray;
            if (valArray.length === 1 && dims > 1) {
                finalValArray = Array(dims).fill(valArray[0]);
            }

            const existingKeyframe = keyframes.find(k => Math.abs(k.t - time) < 0.1);

            if (existingKeyframe) {
                existingKeyframe.s = JSON.parse(JSON.stringify(finalValArray));
            } else {
                keyframes.push({
                    t: time,
                    s: JSON.parse(JSON.stringify(finalValArray)),
                    i: { x: Array(dims).fill(0.833), y: Array(dims).fill(0.833) },
                    o: { x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }
                });
                keyframes.sort((a, b) => a.t - b.t);
            }

            // Sync 'e' (end values) and ensure every kf has i/o
            for (let i = 0; i < keyframes.length; i++) {
                const cur = keyframes[i];
                const next = keyframes[i + 1];
                const curDims = cur.s.length;

                if (next) {
                    cur.e = JSON.parse(JSON.stringify(next.s));
                } else {
                    // Lottie-web needs 'e' to match 's' for the last keyframe in many renderers
                    cur.e = JSON.parse(JSON.stringify(cur.s));
                }

                if (!cur.i) cur.i = { x: Array(curDims).fill(0.833), y: Array(curDims).fill(0.833) };
                if (!cur.o) cur.o = { x: Array(curDims).fill(0.167), y: Array(curDims).fill(0.167) };
            }

            return newLayer;
        });

        return { animation: { ...state.animation, layers: newLayers } };
    }),

    toggleAnimation: (layerInd, propertyPath) => set((state) => {
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;

            const newLayer = JSON.parse(JSON.stringify(layer));
            const path = propertyPath.split('.');
            let current = newLayer;

            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }

            const prop = current[path[path.length - 1]];
            if (!prop) return layer;

            // Check if this is a ShapePath property (ks property on 'sh' type shapes)
            const isShapePathProperty = propertyPath.endsWith('.ks') &&
                prop.k &&
                (prop.a === 0 ? (prop.k.v !== undefined) : true);

            if (isShapePathProperty) {
                if (prop.a === 1) {
                    // Switching to static: take path from first keyframe
                    const firstKfPath = Array.isArray(prop.k) && prop.k[0]?.s ? prop.k[0].s[0] : prop.k;
                    prop.a = 0;
                    prop.k = JSON.parse(JSON.stringify(firstKfPath));
                } else {
                    // Switching to animated
                    const staticPath = prop.k;
                    const endTime = state.animation.op - 1;
                    prop.a = 1;
                    prop.k = [
                        {
                            t: 0,
                            s: [JSON.parse(JSON.stringify(staticPath))],
                            e: [JSON.parse(JSON.stringify(staticPath))],
                            i: { x: 0.833, y: 0.833 },
                            o: { x: 0.167, y: 0.167 }
                        },
                        {
                            t: endTime,
                            s: [JSON.parse(JSON.stringify(staticPath))],
                            e: [JSON.parse(JSON.stringify(staticPath))],
                            i: { x: 0.833, y: 0.833 },
                            o: { x: 0.167, y: 0.167 }
                        }
                    ];
                }
                return newLayer;
            }

            if (prop.a === 1) {
                // Switching to static: take value from first keyframe
                let value = Array.isArray(prop.k) ? prop.k[0].s : prop.k;

                // For scalars in ks, Lottie often prefers raw numbers when a=0
                if (Array.isArray(value) && value.length === 1 && (propertyPath.endsWith('.o') || propertyPath.endsWith('.r'))) {
                    value = value[0];
                }

                prop.a = 0;
                prop.k = value;
            } else {
                // Switching to animated
                const staticVal = prop.k;
                let valArray = Array.isArray(staticVal) ? staticVal : [staticVal];

                // Hard enforce dimensions for transform properties
                if (propertyPath.endsWith('.p') || propertyPath.endsWith('.a') || propertyPath.endsWith('.s')) {
                    // Shape group transforms (tr) often prefer Vector2 [x, y]
                    if (propertyPath.includes('.it.') || propertyPath.includes('.shapes.')) {
                        valArray = toVector2(staticVal);
                    } else {
                        valArray = toVector3(staticVal, propertyPath.endsWith('.s') ? 100 : 0);
                    }
                }

                const dims = valArray.length;
                const endTime = state.animation.op - 1;
                prop.a = 1;
                prop.k = [
                    {
                        t: 0,
                        s: JSON.parse(JSON.stringify(valArray)),
                        e: JSON.parse(JSON.stringify(valArray)),
                        i: { x: Array(dims).fill(0.833), y: Array(dims).fill(0.833) },
                        o: { x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }
                    },
                    {
                        t: endTime,
                        s: JSON.parse(JSON.stringify(valArray)),
                        e: JSON.parse(JSON.stringify(valArray)),
                        i: { x: Array(dims).fill(0.833), y: Array(dims).fill(0.833) },
                        o: { x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }
                    }
                ];
            }

            return newLayer;
        });

        return { animation: { ...state.animation, layers: newLayers } };
    }),

    syncTextToShapes: async (layerInd) => {
        const state = useStore.getState();
        const layer = state.animation.layers.find(l => l.ind === layerInd);
        if (!layer || !layer.text || !layer.font) return;

        try {
            const font = await FontManager.loadFont(layer.font);
            const shapePaths = FontManager.textToShapes(layer.text, font, layer.fontSize || 48);

            const shapes: any[] = [{
                ty: 'gr',
                nm: 'Text Group',
                it: [
                    ...shapePaths.map((p, i) => ({
                        ty: 'sh',
                        nm: `Glyph ${i}`,
                        ks: { a: 0 as const, k: p }
                    })),
                    {
                        ty: 'fl',
                        nm: 'Fill',
                        c: { a: 0 as const, k: [0.2, 0.2, 0.2] },
                        o: { a: 0 as const, k: 100 }
                    },
                    {
                        ty: 'tr',
                        nm: 'Transform',
                        p: { a: 0 as const, k: [0, 0] },
                        a: { a: 0 as const, k: [0, 0] },
                        s: { a: 0 as const, k: [100, 100] },
                        r: { a: 0 as const, k: 0 },
                        o: { a: 0 as const, k: 100 }
                    }
                ]
            }];

            state.updateLayer(layerInd, { shapes });
        } catch (e) {
            console.error("Sync text failure", e);
        }
    },

    convertToPath: (layerInd, shapePath) => set((state) => {
        const layer = state.animation.layers.find(l => l.ind === layerInd);
        if (!layer || !layer.shapes) return state;

        const newLayers = JSON.parse(JSON.stringify(state.animation.layers));
        const targetLayer = newLayers.find((l: any) => l.ind === layerInd);

        const pathParts = shapePath.split('.');
        const lastIdx = parseInt(pathParts.pop()!);
        let current = targetLayer.shapes;
        for (let i = 1; i < pathParts.length; i++) {
            current = current[pathParts[i]];
        }

        const original = current[lastIdx];
        let newShape: any = null;

        if (original.ty === 'rc') {
            const size = [original.s.k[0], original.s.k[1]];
            const pos = [original.p.k[0], original.p.k[1]];
            const rot = (original.r?.k || 0) * (Math.PI / 180);
            const w = size[0] / 2;
            const h = size[1] / 2;

            const rotate = (pt: [number, number]): [number, number] => {
                if (rot === 0) return pt;
                const cos = Math.cos(rot);
                const sin = Math.sin(rot);
                return [
                    pt[0] * cos - pt[1] * sin,
                    pt[0] * sin + pt[1] * cos
                ];
            };

            const verts: [number, number][] = [
                [-w, -h], [w, -h], [w, h], [-w, h]
            ];

            newShape = {
                ty: 'sh',
                nm: original.nm + " (Converted)",
                ks: {
                    a: 0,
                    k: {
                        i: [[0, 0], [0, 0], [0, 0], [0, 0]],
                        o: [[0, 0], [0, 0], [0, 0], [0, 0]],
                        v: verts.map(v => {
                            const rotated = rotate(v);
                            return [rotated[0] + pos[0], rotated[1] + pos[1]];
                        }),
                        c: true
                    }
                }
            };
        } else if (original.ty === 'el') {
            const size = [original.s.k[0], original.s.k[1]];
            const pos = [original.p.k[0], original.p.k[1]];
            const rx = size[0] / 2;
            const ry = size[1] / 2;
            const k = 0.5522847498;

            newShape = {
                ty: 'sh',
                nm: original.nm + " (Converted)",
                ks: {
                    a: 0,
                    k: {
                        i: [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]],
                        o: [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]],
                        v: [
                            [pos[0] + rx, pos[1]],
                            [pos[0], pos[1] + ry],
                            [pos[0] - rx, pos[1]],
                            [pos[0], pos[1] - ry]
                        ],
                        c: true
                    }
                }
            };
        } else if (original.ty === 'sr') {
            const pos = original.p.k;
            const points = original.pt.k;
            const outerRadius = original.or.k;
            const innerRadius = original.ir?.k || 0;
            const rotation = (original.r.k - 90) * (Math.PI / 180);
            const isStar = original.sy === 1;

            const vertices: [number, number][] = [];
            const count = isStar ? points * 2 : points;

            for (let i = 0; i < count; i++) {
                const angle = rotation + (i * Math.PI * 2) / count;
                const r = (isStar && (i % 2 !== 0)) ? innerRadius : outerRadius;
                vertices.push([
                    pos[0] + Math.cos(angle) * r,
                    pos[1] + Math.sin(angle) * r
                ]);
            }

            newShape = {
                ty: 'sh',
                nm: original.nm + " (Converted)",
                ks: {
                    a: 0,
                    k: {
                        i: vertices.map(() => [0, 0]),
                        o: vertices.map(() => [0, 0]),
                        v: vertices,
                        c: true
                    }
                }
            };
        }

        if (newShape) {
            current[lastIdx] = newShape;
            return { animation: { ...state.animation, layers: newLayers } };
        }

        return state;
    }),


    deleteVertex: (layerInd, shapePath, vertexIndex) => set((state) => {
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;

            const newLayer = JSON.parse(JSON.stringify(layer));
            const pathParts = shapePath.split('.');

            // Navigate to the shape's ks property
            let current: any = newLayer;
            for (const part of pathParts) {
                current = current[part];
            }

            // current should now be the ks property containing v, i, o, c
            if (current && current.a === 0 && current.k && current.k.v) {
                // Static path - remove vertex at index
                if (current.k.v.length > 2) { // Keep at least 2 vertices
                    current.k.v.splice(vertexIndex, 1);
                    current.k.i.splice(vertexIndex, 1);
                    current.k.o.splice(vertexIndex, 1);
                }
            } else if (current && current.a === 1 && Array.isArray(current.k)) {
                // Animated path - remove vertex from all keyframes
                current.k.forEach((kf: any) => {
                    if (kf.s && kf.s[0] && kf.s[0].v && kf.s[0].v.length > 2) {
                        kf.s[0].v.splice(vertexIndex, 1);
                        kf.s[0].i.splice(vertexIndex, 1);
                        kf.s[0].o.splice(vertexIndex, 1);
                    }
                    if (kf.e && kf.e[0] && kf.e[0].v && kf.e[0].v.length > 2) {
                        kf.e[0].v.splice(vertexIndex, 1);
                        kf.e[0].i.splice(vertexIndex, 1);
                        kf.e[0].o.splice(vertexIndex, 1);
                    }
                });
            }

            return newLayer;
        });

        return { animation: { ...state.animation, layers: newLayers } };
    }),

    addVertex: (layerInd, shapePath, afterIndex) => set((state) => {
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;

            const newLayer = JSON.parse(JSON.stringify(layer));
            const pathParts = shapePath.split('.');

            // Navigate to the shape's ks property
            let current: any = newLayer;
            for (const part of pathParts) {
                current = current[part];
            }

            const insertVertex = (pathData: any) => {
                if (!pathData || !pathData.v) return;

                const v = pathData.v;
                const nextIndex = (afterIndex + 1) % v.length;

                // Calculate midpoint between current and next vertex
                const midX = (v[afterIndex][0] + v[nextIndex][0]) / 2;
                const midY = (v[afterIndex][1] + v[nextIndex][1]) / 2;

                // Insert new vertex after the specified index
                pathData.v.splice(afterIndex + 1, 0, [midX, midY]);
                pathData.i.splice(afterIndex + 1, 0, [0, 0]); // No in-tangent
                pathData.o.splice(afterIndex + 1, 0, [0, 0]); // No out-tangent
            };

            if (current && current.a === 0 && current.k) {
                // Static path
                insertVertex(current.k);
            } else if (current && current.a === 1 && Array.isArray(current.k)) {
                // Animated path - add vertex to all keyframes
                current.k.forEach((kf: any) => {
                    if (kf.s && kf.s[0]) insertVertex(kf.s[0]);
                    if (kf.e && kf.e[0]) insertVertex(kf.e[0]);
                });
            }

            return newLayer;
        });

        return { animation: { ...state.animation, layers: newLayers } };
    }),

    setCanvasSize: (width, height) => set((state) => {
        useHistory.getState().pushState(state.animation);
        return {
            animation: {
                ...state.animation,
                w: width,
                h: height
            }
        };
    }),

    addAsset: (asset) => set((state) => {
        useHistory.getState().pushState(state.animation);
        const assets = [...(state.animation.assets || [])];
        assets.push(asset);
        return {
            animation: {
                ...state.animation,
                assets
            }
        };
    }),

    addLayerFromAsset: (assetId, position) => set((state) => {
        useHistory.getState().pushState(state.animation);
        const asset = state.animation.assets?.find(a => a.id === assetId);
        if (!asset) return state;

        const ind = Date.now();
        const layerPos = position ? [position[0], position[1], 0] : [state.animation.w / 2, state.animation.h / 2, 0];

        const newLayer: Layer = {
            ind,
            ty: asset.layers ? 0 : 2, // 0 for precomp, 2 for image
            nm: asset.id,
            refId: assetId,
            w: asset.w || state.animation.w,
            h: asset.h || state.animation.h,
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: layerPos as Vector3 },
                s: { a: 0, k: [100, 100, 100] as Vector3 },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [(asset.w || state.animation.w) / 2, (asset.h || state.animation.h) / 2, 0] as Vector3 },
            },
            ip: 0,
            op: state.animation.op,
            st: 0,
        };

        return {
            animation: {
                ...state.animation,
                layers: [newLayer, ...state.animation.layers]
            },
            selectedLayerId: ind,
            selectedShapePath: null
        };
    }),

    undo: () => set((state) => {
        const previousAnimation = useHistory.getState().undo(state.animation);
        if (previousAnimation) {
            return { animation: previousAnimation };
        }
        return state;
    }),

    redo: () => set((state) => {
        const nextAnimation = useHistory.getState().redo(state.animation);
        if (nextAnimation) {
            return { animation: nextAnimation };
        }
        return state;
    })
}));

if (typeof window !== 'undefined') {
    (window as any).useStore = useStore;
}

