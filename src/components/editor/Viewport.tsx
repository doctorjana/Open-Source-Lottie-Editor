import { useEffect, useRef, useState, useCallback } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';
import { useStore } from '../../store/useStore';
import { type Layer } from '../../types/lottie';
import { getLottieVal } from '../../lib/lottieUtils';

export function Viewport() {
    const containerRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<AnimationItem | null>(null);
    const animationData = useStore((state) => state.animation);
    const isPlaying = useStore((state) => state.isPlaying);
    const currentTime = useStore((state) => state.currentTime);
    const setTime = useStore((state) => state.setTime);
    const activeTool = useStore((state) => state.activeTool);
    const addLayer = useStore((state) => state.addLayer);
    const selectedLayerId = useStore((state) => state.selectedLayerId);
    const updateLayer = useStore((state) => state.updateLayer);
    const addKeyframe = useStore((state) => state.addKeyframe);

    // Manipulation State
    const [dragState, setDragState] = useState<{
        type: 'move' | 'scale' | 'rotate' | 'pen_bezier' | 'vertex_move',
        handle?: 'tl' | 'tr' | 'bl' | 'br',
        startMouse: [number, number],
        startVal: any, // [x, y, z] or number
        initialAngle?: number,
        layerId?: number,
        pathData?: { path: string, vertexIdx: number, handleType: 'v' | 'i' | 'o' }
    } | null>(null);

    const [hoverIntent, setHoverIntent] = useState<'move' | 'scale' | 'rotate' | 'vertex_move' | 'none'>('none');
    const [activeHandle, setActiveHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);

    // Pen Tool State
    const [penPoints, setPenPoints] = useState<Array<{ v: [number, number], i: [number, number], o: [number, number] }>>([]);

    // Find selected layer
    const selectedLayer = animationData.layers.find(l => l.ind === selectedLayerId);

    // Prevent feedback loop when setting time from lottie event
    const isLottieUpdatingTime = useRef(false);

    useEffect(() => {
        if (!lottieRef.current) return;

        if (animRef.current) {
            animRef.current.destroy();
        }

        try {
            animRef.current = lottie.loadAnimation({
                container: lottieRef.current,
                renderer: 'svg',
                loop: true,
                autoplay: false,
                animationData: JSON.parse(JSON.stringify(animationData)),
            });

            animRef.current.addEventListener('enterFrame', (e: any) => {
                if (isPlaying) {
                    isLottieUpdatingTime.current = true;
                    setTime(e.currentTime);
                    isLottieUpdatingTime.current = false;
                }
            });

            // More robust sync: wait for DOMLoaded and also call immediately
            const sync = () => {
                if (animRef.current) {
                    animRef.current.goToAndStop(currentTime, true);
                }
            };

            animRef.current.addEventListener('DOMLoaded', sync);
            sync(); // Try immediate as well

        } catch (e) {
            console.error("Lottie load failed", e);
        }

        return () => {
            animRef.current?.destroy();
        };
    }, [animationData]);

    useEffect(() => {
        if (animRef.current) {
            if (isPlaying) {
                animRef.current.play();
            } else {
                animRef.current.pause();
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        if (animRef.current && !isPlaying && !isLottieUpdatingTime.current) {
            animRef.current.goToAndStop(currentTime, true);
        }
    }, [currentTime, isPlaying]);

    // Unified helper for property values
    const getVal = useCallback(<T,>(prop: any): T => {
        return getLottieVal<T>(prop, currentTime, [0, 0, 0]);
    }, [currentTime]);

    const getCanvasCoords = (e: MouseEvent | React.MouseEvent): [number, number] => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return [0, 0];
        const scaleX = 1920 / rect.width;
        const scaleY = 1080 / rect.height;
        return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
    };

    const getLayerBounds = useCallback((layer: Layer) => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const processItems = (items: any[], parentTransform = { p: [0, 0], s: [100, 100], r: 0 }) => {
            items.forEach(item => {
                let currentTransform = { ...parentTransform };
                if (item.ty === 'tr') {
                    const p = getVal<[number, number, number]>(item.p);
                    const s = getVal<[number, number, number]>(item.s);
                    const r = getVal<number>(item.r);
                    currentTransform = {
                        p: [parentTransform.p[0] + p[0], parentTransform.p[1] + p[1]],
                        s: [parentTransform.s[0] * (s[0] / 100), parentTransform.s[1] * (s[1] / 100)],
                        r: parentTransform.r + r
                    };
                }

                if (item.ty === 'gr') {
                    // Group's own transform is usually at the end of 'it', but AE sometimes has it differently
                    // For simplicity, we assume 'tr' handles the transform for all items in the group
                    const groupTr = item.it.find((it: any) => it.ty === 'tr');
                    let groupBaseTransform = currentTransform;
                    if (groupTr) {
                        const p = getVal<[number, number, number]>(groupTr.p);
                        const s = getVal<[number, number, number]>(groupTr.s);
                        const r = getVal<number>(groupTr.r);
                        groupBaseTransform = {
                            p: [currentTransform.p[0] + p[0], currentTransform.p[1] + p[1]],
                            s: [currentTransform.s[0] * (s[0] / 100), currentTransform.s[1] * (s[1] / 100)],
                            r: currentTransform.r + r
                        };
                    }
                    processItems(item.it, groupBaseTransform);
                } else if (item.ty === 'rc' || item.ty === 'el') {
                    const size = getVal<[number, number, number]>(item.s);
                    const pos = getVal<[number, number, number]>(item.p || { a: 0, k: [0, 0, 0] });

                    const localW = size[0] * (currentTransform.s[0] / 100);
                    const localH = size[1] * (currentTransform.s[1] / 100);
                    const localX = pos[0] + currentTransform.p[0];
                    const localY = pos[1] + currentTransform.p[1];

                    minX = Math.min(minX, localX - localW / 2);
                    maxX = Math.max(maxX, localX + localW / 2);
                    minY = Math.min(minY, localY - localH / 2);
                    maxY = Math.max(maxY, localY + localH / 2);
                } else if (item.ty === 'sr') {
                    const pos = getVal<[number, number, number]>(item.p || { a: 0, k: [0, 0, 0] });
                    const or = getVal<number>(item.or);
                    const localR = or * Math.max(currentTransform.s[0] / 100, currentTransform.s[1] / 100);
                    const localX = pos[0] + currentTransform.p[0];
                    const localY = pos[1] + currentTransform.p[1];

                    minX = Math.min(minX, localX - localR);
                    maxX = Math.max(maxX, localX + localR);
                    minY = Math.min(minY, localY - localR);
                    maxY = Math.max(maxY, localY + localR);
                } else if (item.ty === 'sh') {
                    const shapeData = getVal<any>(item.ks);
                    if (shapeData && shapeData.v) {
                        shapeData.v.forEach((v: [number, number], idx: number) => {
                            const pts = [v];
                            if (shapeData.i && shapeData.i[idx]) pts.push([v[0] + shapeData.i[idx][0], v[1] + shapeData.i[idx][1]]);
                            if (shapeData.o && shapeData.o[idx]) pts.push([v[0] + shapeData.o[idx][0], v[1] + shapeData.o[idx][1]]);

                            pts.forEach(p => {
                                const tx = p[0] * (currentTransform.s[0] / 100) + currentTransform.p[0];
                                const ty = p[1] * (currentTransform.s[1] / 100) + currentTransform.p[1];
                                minX = Math.min(minX, tx);
                                maxX = Math.max(maxX, tx);
                                minY = Math.min(minY, ty);
                                maxY = Math.max(maxY, ty);
                            });
                        });
                    }
                }
            });
        };

        if (layer.shapes) {
            processItems(layer.shapes);
        }

        // Default if no shapes found
        if (minX === Infinity) {
            return { width: 200, height: 200, offsetX: 0, offsetY: 0 };
        }

        return {
            width: maxX - minX,
            height: maxY - minY,
            offsetX: (minX + maxX) / 2,
            offsetY: (minY + maxY) / 2
        };
    }, [getVal]);

    const finishPath = useCallback((closed: boolean) => {
        if (penPoints.length < 2) {
            setPenPoints([]);
            return;
        }

        const newLayer: Layer = {
            ind: Date.now(),
            ty: 4,
            nm: "Pen Path Layer",
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: [960, 540, 0] as [number, number, number] },
                s: { a: 0, k: [100, 100, 100] as [number, number, number] },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [0, 0, 0] as [number, number, number] },
            },
            ip: 0,
            op: 300,
            st: 0,
            shapes: [{
                ty: "gr",
                nm: "Path Group",
                it: [
                    {
                        ty: "sh",
                        nm: "Path",
                        ks: {
                            a: 0,
                            k: {
                                i: penPoints.map(p => p.i),
                                o: penPoints.map(p => p.o),
                                v: penPoints.map(p => [p.v[0] - 960, p.v[1] - 540]),
                                c: closed
                            }
                        }
                    },
                    {
                        ty: "st",
                        nm: "Stroke",
                        c: { a: 0, k: [0, 0, 0] }, // Black stroke
                        o: { a: 0, k: 100 },
                        w: { a: 0, k: 4 },
                        lc: 2,
                        lj: 2
                    },
                    {
                        ty: "fl",
                        nm: "Fill",
                        c: { a: 0, k: [0.5, 0.5, 0.5] },
                        o: { a: 0, k: 30 }
                    },
                    {
                        ty: "tr",
                        nm: "Transform",
                        p: { a: 0, k: [0, 0, 0] as [number, number, number] },
                        a: { a: 0, k: [0, 0, 0] as [number, number, number] },
                        s: { a: 0, k: [100, 100, 100] as [number, number, number] },
                        r: { a: 0, k: 0 },
                        o: { a: 0, k: 100 }
                    }
                ]
            }]
        };

        addLayer(newLayer);
        setPenPoints([]);
    }, [penPoints, addLayer]);

    const getAllPaths = useCallback((layer: Layer) => {
        const paths: Array<{
            path: string,
            ks: any,
            transform: { p: [number, number], s: [number, number], r: number }
        }> = [];

        const processItems = (items: any[], currentPath: string, parentTransform = { p: [0, 0], s: [100, 100], r: 0 }) => {
            items.forEach((item, idx) => {
                const itemPath = `${currentPath}.${idx}`;
                let currentTransform = { ...parentTransform };

                if (item.ty === 'gr') {
                    const groupTr = item.it.find((it: any) => it.ty === 'tr');
                    if (groupTr) {
                        const p = getVal<[number, number, number]>(groupTr.p);
                        const s = getVal<[number, number, number]>(groupTr.s);
                        const r = getVal<number>(groupTr.r);
                        currentTransform = {
                            p: [parentTransform.p[0] + p[0], parentTransform.p[1] + p[1]],
                            s: [parentTransform.s[0] * (s[0] / 100), parentTransform.s[1] * (s[1] / 100)],
                            r: parentTransform.r + r
                        };
                    }
                    processItems(item.it, `${itemPath}.it`, currentTransform);
                } else if (item.ty === 'sh') {
                    paths.push({
                        path: `${itemPath}.ks`,
                        ks: item.ks,
                        transform: currentTransform as { p: [number, number], s: [number, number], r: number }
                    });
                }
            });
        };

        if (layer.shapes) {
            processItems(layer.shapes, 'shapes');
        }
        return paths;
    }, [getVal]);

    const getManipulationIntent = useCallback((x: number, y: number) => {
        if (!selectedLayer || activeTool !== 'select') return { type: 'none' as const };

        const pos = getVal<[number, number, number]>(selectedLayer.ks.p);
        const scale = getVal<[number, number, number]>(selectedLayer.ks.s);

        // 0. Check vertices first (highest priority)
        const paths = getAllPaths(selectedLayer);
        for (const p of paths) {
            const ks = getVal<any>(p.ks);
            if (!ks || !ks.v) continue;

            const lscale = [p.transform.s[0] * (scale[0] / 100), p.transform.s[1] * (scale[1] / 100)];
            const lpos = [p.transform.p[0] + pos[0], p.transform.p[1] + pos[1]];

            for (let i = 0; i < ks.v.length; i++) {
                const vx = ks.v[i][0] * (lscale[0] / 100) + lpos[0];
                const vy = ks.v[i][1] * (lscale[1] / 100) + lpos[1];

                // Check vertex
                const distV = Math.sqrt(Math.pow(x - vx, 2) + Math.pow(y - vy, 2));
                if (distV < 15) return { type: 'vertex_move' as const, pathData: { path: p.path, vertexIdx: i, handleType: 'v' as const } };

                // Check in-handle
                if (ks.i && ks.i[i]) {
                    const ix = (ks.v[i][0] + ks.i[i][0]) * (lscale[0] / 100) + lpos[0];
                    const iy = (ks.v[i][1] + ks.i[i][1]) * (lscale[1] / 100) + lpos[1];
                    if (Math.sqrt(Math.pow(x - ix, 2) + Math.pow(y - iy, 2)) < 12) {
                        return { type: 'vertex_move' as const, pathData: { path: p.path, vertexIdx: i, handleType: 'i' as const } };
                    }
                }

                // Check out-handle
                if (ks.o && ks.o[i]) {
                    const ox = (ks.v[i][0] + ks.o[i][0]) * (lscale[0] / 100) + lpos[0];
                    const oy = (ks.v[i][1] + ks.o[i][1]) * (lscale[1] / 100) + lpos[1];
                    if (Math.sqrt(Math.pow(x - ox, 2) + Math.pow(y - oy, 2)) < 12) {
                        return { type: 'vertex_move' as const, pathData: { path: p.path, vertexIdx: i, handleType: 'o' as const } };
                    }
                }
            }
        }

        const bounds = getLayerBounds(selectedLayer);

        const w = bounds.width * (scale[0] / 100);
        const h = bounds.height * (scale[1] / 100);
        const ox = bounds.offsetX * (scale[0] / 100);
        const oy = bounds.offsetY * (scale[1] / 100);

        const cx = pos[0] + ox;
        const cy = pos[1] + oy;

        const handles = {
            tl: [cx - w / 2, cy - h / 2],
            tr: [cx + w / 2, cy - h / 2],
            bl: [cx - w / 2, cy + h / 2],
            br: [cx + w / 2, cy + h / 2]
        };

        // 1. Check handles for scaling
        for (const [key, h] of Object.entries(handles)) {
            const dist = Math.sqrt(Math.pow(x - h[0], 2) + Math.pow(y - h[1], 2));
            if (dist < 20) return { type: 'scale' as const, handle: key as any };
        }

        // 2. Check interior for move
        if (x > cx - w / 2 && x < cx + w / 2 &&
            y > cy - h / 2 && y < cy + h / 2) {
            return { type: 'move' as const };
        }

        // 3. Check near exterior for rotation
        const distFromCenter = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        const maxRadius = Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2));
        if (distFromCenter < maxRadius + 40) {
            return { type: 'rotate' as const };
        }

        return { type: 'none' as const };
    }, [selectedLayer, activeTool, getVal]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const [x, y] = getCanvasCoords(e);

        if (activeTool === 'pen') {
            if (penPoints.length > 2) {
                const first = penPoints[0].v;
                const dist = Math.sqrt(Math.pow(x - first[0], 2) + Math.pow(y - first[1], 2));
                if (dist < 20) {
                    finishPath(true);
                    return;
                }
            }

            const newPoint = { v: [x, y] as [number, number], i: [0, 0] as [number, number], o: [0, 0] as [number, number] };
            setPenPoints(prev => [...prev, newPoint]);
            setDragState({ type: 'pen_bezier', startMouse: [x, y], startVal: [...penPoints] });
            return;
        }

        if (!selectedLayer) return;

        const intent = getManipulationIntent(x, y);

        if (intent.type === 'move') {
            const pos = getVal<[number, number, number]>(selectedLayer.ks.p);
            setDragState({ type: 'move', startMouse: [x, y], startVal: [...pos], layerId: selectedLayer.ind });
        } else if (intent.type === 'scale') {
            const scale = getVal<[number, number, number]>(selectedLayer.ks.s);
            setDragState({ type: 'scale', handle: intent.handle, startMouse: [x, y], startVal: [...scale], layerId: selectedLayer.ind });
        } else if (intent.type === 'rotate') {
            const pos = getVal<[number, number, number]>(selectedLayer.ks.p);
            const scale = getVal<[number, number, number]>(selectedLayer.ks.s);
            const rotation = getVal<number>(selectedLayer.ks.r);
            const bounds = getLayerBounds(selectedLayer);
            const ox = bounds.offsetX * (scale[0] / 100);
            const oy = bounds.offsetY * (scale[1] / 100);
            const cx = pos[0] + ox;
            const cy = pos[1] + oy;

            const angle = Math.atan2(y - cy, x - cx);
            setDragState({ type: 'rotate', startMouse: [x, y], startVal: rotation || 0, initialAngle: angle, layerId: selectedLayer.ind });
        } else if (intent.type === 'vertex_move') {
            const paths = getAllPaths(selectedLayer);
            const p = paths.find(path => path.path === intent.pathData?.path);
            if (p && intent.pathData) {
                const ks = getVal<any>(p.ks);
                let startVal;
                if (intent.pathData.handleType === 'v') startVal = [...ks.v[intent.pathData.vertexIdx]];
                else if (intent.pathData.handleType === 'i') startVal = [...ks.i[intent.pathData.vertexIdx]];
                else startVal = [...ks.o[intent.pathData.vertexIdx]];

                setDragState({
                    type: 'vertex_move',
                    startMouse: [x, y],
                    startVal,
                    layerId: selectedLayer.ind,
                    pathData: intent.pathData
                });
            }
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState) {
            // Passive hover check for cursor feedback
            if (selectedLayer && activeTool === 'select') {
                const [x, y] = getCanvasCoords(e);
                const intent = getManipulationIntent(x, y);
                setHoverIntent(intent.type);
                setActiveHandle(intent.type === 'scale' ? intent.handle || null : null);
            }
            return;
        }

        // Only move/scale/rotate need a selected layer
        if (!selectedLayer && dragState.type !== 'pen_bezier') return;

        const [x, y] = getCanvasCoords(e);
        const dx = x - dragState.startMouse[0];
        const dy = y - dragState.startMouse[1];

        if (dragState.type === 'move' && selectedLayer) {
            const newVal: [number, number, number] = [dragState.startVal[0] + dx, dragState.startVal[1] + dy, 0];
            if (selectedLayer.ks.p.a === 1) {
                addKeyframe(selectedLayer.ind, 'ks.p', currentTime, newVal);
            } else {
                updateLayer(selectedLayer.ind, { ks: { ...selectedLayer.ks, p: { ...selectedLayer.ks.p, k: newVal } } });
            }
        } else if (dragState.type === 'scale' && dragState.handle && selectedLayer) {
            const pos = getVal<[number, number, number]>(selectedLayer.ks.p);
            const scale = getVal<[number, number, number]>(selectedLayer.ks.s);
            const bounds = getLayerBounds(selectedLayer);
            const ox = bounds.offsetX * (scale[0] / 100);
            const oy = bounds.offsetY * (scale[1] / 100);
            const cx = pos[0] + ox;
            const cy = pos[1] + oy;

            const startDist = Math.sqrt(Math.pow(dragState.startMouse[0] - cx, 2) + Math.pow(dragState.startMouse[1] - cy, 2));
            const currentDist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
            if (startDist < 1) return;
            const scaleRatio = currentDist / startDist;
            const newVal: [number, number, number] = [dragState.startVal[0] * scaleRatio, dragState.startVal[1] * scaleRatio, 100];
            if (selectedLayer.ks.s.a === 1) {
                addKeyframe(selectedLayer.ind, 'ks.s', currentTime, newVal);
            } else {
                updateLayer(selectedLayer.ind, { ks: { ...selectedLayer.ks, s: { ...selectedLayer.ks.s, k: newVal } } });
            }
        } else if (dragState.type === 'rotate' && selectedLayer) {
            const pos = getVal<[number, number, number]>(selectedLayer.ks.p);
            const scale = getVal<[number, number, number]>(selectedLayer.ks.s);
            const bounds = getLayerBounds(selectedLayer);
            const ox = bounds.offsetX * (scale[0] / 100);
            const oy = bounds.offsetY * (scale[1] / 100);
            const cx = pos[0] + ox;
            const cy = pos[1] + oy;

            const currentAngle = Math.atan2(y - cy, x - cx);
            const deltaRad = currentAngle - (dragState.initialAngle || 0);
            const deltaDeg = deltaRad * (180 / Math.PI);
            const newVal = dragState.startVal + deltaDeg;

            if (selectedLayer.ks.r?.a === 1) {
                addKeyframe(selectedLayer.ind, 'ks.r', currentTime, newVal);
            } else {
                updateLayer(selectedLayer.ind, { ks: { ...selectedLayer.ks, r: { a: 0, ...selectedLayer.ks.r, k: newVal } } });
            }
        } else if (dragState.type === 'pen_bezier') {
            setPenPoints(prev => {
                const next = [...prev];
                const index = next.length - 1;
                const last = { ...next[index] }; // Clone the point object
                const ox = x - last.v[0];
                const oy = y - last.v[1];
                last.o = [ox, oy];
                last.i = [-ox, -oy];
                next[index] = last;
                return next;
            });
        } else if (dragState.type === 'vertex_move' && selectedLayer && dragState.pathData) {
            const scale = getVal<[number, number, number]>(selectedLayer.ks.s);
            const paths = getAllPaths(selectedLayer);
            const p = paths.find(path => path.path === dragState.pathData?.path);

            if (p) {
                const lscale = [p.transform.s[0] * (scale[0] / 100), p.transform.s[1] * (scale[1] / 100)];
                const dx_canvas = dx / (lscale[0] / 100);
                const dy_canvas = dy / (lscale[1] / 100);

                const newPos = [dragState.startVal[0] + dx_canvas, dragState.startVal[1] + dy_canvas];
                const ks = JSON.parse(JSON.stringify(getVal<any>(p.ks)));

                if (dragState.pathData.handleType === 'v') {
                    ks.v[dragState.pathData.vertexIdx] = newPos;
                } else if (dragState.pathData.handleType === 'i') {
                    ks.i[dragState.pathData.vertexIdx] = newPos;
                } else {
                    ks.o[dragState.pathData.vertexIdx] = newPos;
                }

                if (p.ks.a === 1) {
                    addKeyframe(selectedLayer.ind, p.path, currentTime, ks);
                } else {
                    // deep update
                    const newLayer = JSON.parse(JSON.stringify(selectedLayer));
                    const pathParts = p.path.split('.');
                    let current = newLayer;
                    for (let i = 0; i < pathParts.length - 1; i++) current = current[pathParts[i]];
                    current[pathParts[pathParts.length - 1]].k = ks;
                    updateLayer(selectedLayer.ind, newLayer);
                }
            }
        }
    }, [dragState, selectedLayer, currentTime, addKeyframe, updateLayer, getVal, getManipulationIntent, activeTool, getAllPaths]);

    const handleMouseUp = useCallback(() => setDragState(null), []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Handle Enter key to finish path
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeTool === 'pen' && e.key === 'Enter') {
                finishPath(false);
            }
            if (activeTool === 'pen' && e.key === 'Escape') {
                setPenPoints([]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTool, finishPath]);

    const renderGizmo = () => {
        if (!selectedLayer || activeTool !== 'select') return null;

        const pos = getVal<[number, number, number]>(selectedLayer.ks.p);
        const scale = getVal<[number, number, number]>(selectedLayer.ks.s);
        const rotation = getVal<number>(selectedLayer.ks.r);
        const bounds = getLayerBounds(selectedLayer);

        const w = bounds.width * (scale[0] / 100);
        const h = bounds.height * (scale[1] / 100);
        const ox = bounds.offsetX * (scale[0] / 100);
        const oy = bounds.offsetY * (scale[1] / 100);

        const paths = getAllPaths(selectedLayer);

        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-40" viewBox="0 0 1920 1080">
                <g transform={`translate(${pos[0] + ox}, ${pos[1] + oy}) rotate(${rotation || 0})`}>
                    <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
                    {/* Handles */}
                    {[[-w / 2, -h / 2, 'tl'], [w / 2, -h / 2, 'tr'], [-w / 2, h / 2, 'bl'], [w / 2, h / 2, 'br']].map(([hx, hy, id]) => (
                        <rect
                            key={id as string}
                            x={(hx as number) - 8}
                            y={(hy as number) - 8}
                            width="16"
                            height="16"
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            className="pointer-events-auto"
                        />
                    ))}
                </g>

                {/* Path Vertices (Rendered globally for easier coordinate handling) */}
                {paths.map((p, pIdx) => {
                    const ks = getVal<any>(p.ks);
                    if (!ks || !ks.v) return null;

                    const lscale = [p.transform.s[0] * (scale[0] / 100), p.transform.s[1] * (scale[1] / 100)];
                    const lpos = [p.transform.p[0] + pos[0], p.transform.p[1] + pos[1]];

                    return (
                        <g key={pIdx}>
                            {ks.v.map((v: [number, number], vIdx: number) => {
                                const vx = v[0] * (lscale[0] / 100) + lpos[0];
                                const vy = v[1] * (lscale[1] / 100) + lpos[1];

                                const ix = (v[0] + (ks.i[vIdx] ? ks.i[vIdx][0] : 0)) * (lscale[0] / 100) + lpos[0];
                                const iy = (v[1] + (ks.i[vIdx] ? ks.i[vIdx][1] : 0)) * (lscale[1] / 100) + lpos[1];

                                const ox = (v[0] + (ks.o[vIdx] ? ks.o[vIdx][0] : 0)) * (lscale[0] / 100) + lpos[0];
                                const oy = (v[1] + (ks.o[vIdx] ? ks.o[vIdx][1] : 0)) * (lscale[1] / 100) + lpos[1];

                                return (
                                    <g key={vIdx}>
                                        {/* Handle Lines */}
                                        <line x1={ix} y1={iy} x2={vx} y2={vy} stroke="purple" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
                                        <line x1={ox} y1={oy} x2={vx} y2={vy} stroke="purple" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />

                                        {/* In-handle */}
                                        <circle cx={ix} cy={iy} r="4" fill="white" stroke="purple" strokeWidth="1" className="pointer-events-auto cursor-pointer" />

                                        {/* Out-handle */}
                                        <circle cx={ox} cy={oy} r="4" fill="white" stroke="purple" strokeWidth="1" className="pointer-events-auto cursor-pointer" />

                                        {/* Vertex */}
                                        <circle
                                            cx={vx}
                                            cy={vy}
                                            r="6"
                                            fill="white"
                                            stroke="purple"
                                            strokeWidth="2"
                                            className="pointer-events-auto cursor-pointer"
                                        />
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        );
    };

    const getCursor = () => {
        if (activeTool === 'pen') return 'crosshair';
        if (dragState) {
            if (dragState.type === 'move') return 'move';
            if (dragState.type === 'rotate') return 'alias';
            if (dragState.type === 'scale') {
                return (dragState.handle === 'tl' || dragState.handle === 'br') ? 'nwse-resize' : 'nesw-resize';
            }
        }
        if (hoverIntent === 'move') return 'move';
        if (hoverIntent === 'scale') {
            return (activeHandle === 'tl' || activeHandle === 'br') ? 'nwse-resize' : 'nesw-resize';
        }
        if (hoverIntent === 'rotate') return 'alias';
        return 'default';
    };

    return (
        <div className="h-full w-full bg-slate-900/50 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
            />

            <div
                ref={containerRef}
                className="w-[80%] h-[80%] max-w-[1920px] max-h-[1080px] shadow-2xl bg-white relative overflow-hidden"
                onMouseDown={handleMouseDown}
                onDoubleClick={() => activeTool === 'pen' && finishPath(false)}
                style={{ cursor: getCursor() }}
            >
                {/* Dedicated Lottie Container */}
                <div ref={lottieRef} className="absolute inset-0 pointer-events-none" />

                {/* React-Managed Interaction Layer */}
                <div className="absolute inset-0 z-40 pointer-events-none">
                    {renderGizmo()}

                    {activeTool === 'pen' && penPoints.length > 0 && (
                        <svg
                            className="absolute inset-0 w-full h-full z-50 overflow-visible pointer-events-none"
                            viewBox="0 0 1920 1080"
                        >
                            <path
                                d={penPoints.reduce((acc, p, i) => {
                                    if (i === 0) return `M ${p.v[0]} ${p.v[1]}`;
                                    const prev = penPoints[i - 1];
                                    const c1 = [prev.v[0] + prev.o[0], prev.v[1] + prev.o[1]];
                                    const c2 = [p.v[0] + p.i[0], p.v[1] + p.i[1]];
                                    return `${acc} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p.v[0]} ${p.v[1]}`;
                                }, '')}
                                fill="rgba(59, 130, 246, 0.2)"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeLinejoin="round"
                                className="pointer-events-none"
                            />
                            {penPoints.map((point, i) => (
                                <g key={i}>
                                    {/* Handles */}
                                    {(point.i[0] !== 0 || point.i[1] !== 0 || point.o[0] !== 0 || point.o[1] !== 0) && (
                                        <>
                                            <line x1={point.v[0] + point.i[0]} y1={point.v[1] + point.i[1]} x2={point.v[0]} y2={point.v[1]} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" />
                                            <line x1={point.v[0] + point.o[0]} y1={point.v[1] + point.o[1]} x2={point.v[0]} y2={point.v[1]} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" />
                                            <circle cx={point.v[0] + point.i[0]} cy={point.v[1] + point.i[1]} r="4" fill="white" stroke="#3b82f6" strokeWidth="1" />
                                            <circle cx={point.v[0] + point.o[0]} cy={point.v[1] + point.o[1]} r="4" fill="white" stroke="#3b82f6" strokeWidth="1" />
                                        </>
                                    )}
                                    <circle
                                        cx={point.v[0]}
                                        cy={point.v[1]}
                                        r="6"
                                        fill={i === 0 ? "#ef4444" : "white"}
                                        stroke="#3b82f6"
                                        strokeWidth="2"
                                        className="shadow-sm"
                                    />
                                </g>
                            ))}
                        </svg>
                    )}
                </div>
            </div>

            <div className="absolute top-4 left-4 flex flex-col gap-1 text-muted-foreground text-[10px] select-none pointer-events-none uppercase tracking-widest font-bold">
                <span className="text-white text-xs bg-black/40 px-2 py-0.5 rounded">{animationData.nm}</span>
                <span className="bg-black/20 px-2 py-0.5 rounded w-fit">{animationData.w} x {animationData.h} | FRAME: {Math.round(currentTime)}</span>
                <span className="bg-blue-500/80 text-white px-2 py-0.5 rounded w-fit mt-2">
                    TOOL: {activeTool.toUpperCase()}
                </span>
            </div>
        </div>
    );
}
