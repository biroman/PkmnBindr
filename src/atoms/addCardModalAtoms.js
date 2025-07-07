import { atomWithStorage } from "jotai/utils";

// Stores the preferred display mode for the Add Card modal.
// "standard"  – the current full-screen implementation with backdrop
// "compact"   – draggable, window-like modal without backdrop
// LocalStorage persistence means the user keeps their preference across sessions.
export const modalModeAtom = atomWithStorage("addCardModalMode", "standard");
