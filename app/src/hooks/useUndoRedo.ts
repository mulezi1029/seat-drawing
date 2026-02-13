import { useState, useCallback } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  // Save current state to history
  const saveState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const resolvedState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev.present)
        : newState;

      // Don't save if state hasn't changed
      if (JSON.stringify(prev.present) === JSON.stringify(resolvedState)) {
        return prev;
      }

      const newPast = [...prev.past, prev.present];
      // Limit history size
      if (newPast.length > maxHistory) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: resolvedState,
        future: [], // Clear future when new action is performed
      };
    });
  }, [maxHistory]);

  // Undo to previous state
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // Redo to next state
  const redo = useCallback(() => {
    setState(prev => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Reset to initial state
  const reset = useCallback((newInitialState: T) => {
    setState({
      past: [],
      present: newInitialState,
      future: [],
    });
  }, []);

  return {
    state: state.present,
    setState: saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
