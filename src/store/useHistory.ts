import { create } from 'zustand';
import { type LottieAnimation } from '../types/lottie';

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
    past: LottieAnimation[];
    future: LottieAnimation[];

    // Actions
    pushState: (animation: LottieAnimation) => void;
    undo: (currentAnimation: LottieAnimation) => LottieAnimation | null;
    redo: (currentAnimation: LottieAnimation) => LottieAnimation | null;
    clear: () => void;

    // Computed
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export const useHistory = create<HistoryState>((set, get) => ({
    past: [],
    future: [],

    pushState: (animation) => set((state) => {
        // Deep clone to avoid reference issues
        const clonedAnimation = JSON.parse(JSON.stringify(animation));

        const newPast = [...state.past, clonedAnimation];

        // Limit history size
        if (newPast.length > MAX_HISTORY_SIZE) {
            newPast.shift();
        }

        return {
            past: newPast,
            future: [] // Clear redo stack on new action
        };
    }),

    undo: (currentAnimation) => {
        const state = get();
        if (state.past.length === 0) return null;

        const newPast = [...state.past];
        const previousState = newPast.pop()!;

        // Push current state to future for redo
        const clonedCurrent = JSON.parse(JSON.stringify(currentAnimation));

        set({
            past: newPast,
            future: [...state.future, clonedCurrent]
        });

        return previousState;
    },

    redo: (currentAnimation) => {
        const state = get();
        if (state.future.length === 0) return null;

        const newFuture = [...state.future];
        const nextState = newFuture.pop()!;

        // Push current state to past
        const clonedCurrent = JSON.parse(JSON.stringify(currentAnimation));

        set({
            past: [...state.past, clonedCurrent],
            future: newFuture
        });

        return nextState;
    },

    clear: () => set({ past: [], future: [] }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0
}));
