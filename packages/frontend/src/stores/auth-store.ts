import { create } from "zustand";
import {
  formatApiError,
  getMe,
  isLoggedIn,
  logout as apiLogout,
  refreshAccessToken,
  type PublicUser,
} from "../api/index.ts";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

type AuthState = {
  user: PublicUser | null;
  status: AuthStatus;
  error: string | null;
  bootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  bootstrap: async () => {
    set({ status: "loading", error: null });
    try {
      if (isLoggedIn()) {
        const user = await getMe();
        set({ user, status: "authenticated" });
        return;
      }
      try {
        await refreshAccessToken();
        const user = await getMe();
        set({ user, status: "authenticated" });
      } catch {
        set({ user: null, status: "unauthenticated" });
      }
    } catch (err) {
      await apiLogout();
      set({
        user: null,
        status: "unauthenticated",
        error: formatApiError(err),
      });
    }
  },

  refreshUser: async () => {
    set({ status: "loading", error: null });
    try {
      const user = await getMe();
      set({ user, status: "authenticated" });
    } catch (err) {
      await apiLogout();
      set({
        user: null,
        status: "unauthenticated",
        error: formatApiError(err),
      });
    }
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, status: "unauthenticated", error: null });
  },

  clearError: () => set({ error: null }),
}));
