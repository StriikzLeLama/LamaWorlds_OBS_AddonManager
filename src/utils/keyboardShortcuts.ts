import { useEffect } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            shortcuts.forEach(({ key, ctrl, shift, alt, action }) => {
                const keyMatch = event.key.toLowerCase() === key.toLowerCase();
                const ctrlMatch = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
                const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
                const altMatch = alt ? event.altKey : !event.altKey;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                    event.preventDefault();
                    action();
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};

