import * as React from 'react';

import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

/**
 *
 */
enum ActionType {
  ADD_TOAST = 'ADD_TOAST',
  DISMISS_TOAST = 'DISMISS_TOAST',
  REMOVE_TOAST = 'REMOVE_TOAST',
  UPDATE_TOAST = 'UPDATE_TOAST',
}

/**
 *
 */
type ToasterToast = ToastProps & {
  action?: ToastActionElement;
  description?: React.ReactNode;
  id: string;
  title?: React.ReactNode;
};

let count = 0;

/**
 *
 */
type Action =
  | {
      toast: Partial<ToasterToast>;
      type: ActionType.UPDATE_TOAST;
    }
  | {
      toast: ToasterToast;
      type: ActionType.ADD_TOAST;
    }
  | {
      toastId?: ToasterToast['id'];
      type: ActionType.DISMISS_TOAST;
    }
  | {
      toastId?: ToasterToast['id'];
      type: ActionType.REMOVE_TOAST;
    };

/**
 *
 */
interface State {
  toasts: ToasterToast[];
}

/**
 *
 */
function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string): void => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      toastId: toastId,
      type: ActionType.REMOVE_TOAST,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case ActionType.DISMISS_TOAST: {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }

    case ActionType.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    case ActionType.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
  }
};

const listeners: ((state: State) => void)[] = [];

let memoryState: State = { toasts: [] };

/**
 *
 */
type Toast = Omit<ToasterToast, 'id'>;

/**
 *
 * @param action
 */
function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/**
 *
 * @param root0
 */
function toast({ ...props }: Toast): {
  dismiss: () => void;
  id: string;
  update: (props: ToasterToast) => void;
} {
  const id = genId();

  const update = (props: ToasterToast): void => {
    dispatch({
      toast: { ...props, id },
      type: ActionType.UPDATE_TOAST,
    });
  };
  const dismiss = (): void => {
    dispatch({ toastId: id, type: ActionType.DISMISS_TOAST });
  };

  dispatch({
    toast: {
      ...props,
      id,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
      open: true,
    },
    type: ActionType.ADD_TOAST,
  });

  return {
    dismiss,
    id: id,
    update,
  };
}

/**
 *
 */
function useToast(): {
  dismiss: (toastId?: string) => void;
  toast: (params: Toast) => {
    dismiss: () => void;
    update: (props: ToasterToast) => void;
  };
  toasts: ToasterToast[];
} {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return (): void => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    dismiss: (toastId?: string): void => {
      dispatch({ toastId, type: ActionType.DISMISS_TOAST });
    },
    toast,
  };
}

export { toast, useToast };
