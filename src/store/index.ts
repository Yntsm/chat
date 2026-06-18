import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Socket } from "socket.io-client";

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);

interface ChatState {
  socket: Socket | null;
  activeConversationUser: any | null;
  activeTab: "chat" | "discover" | "friends" | "profile";
  setSocket: (socket: Socket | null) => void;
  setActiveConversationUser: (user: any | null) => void;
  setActiveTab: (tab: "chat" | "discover" | "friends" | "profile") => void;
}

export const useChatStore = create<ChatState>((set) => ({
   socket: null,
   activeConversationUser: null,
   activeTab: "chat",
   setSocket: (socket) => set({ socket }),
   setActiveConversationUser: (user) => set({ activeConversationUser: user }),
   setActiveTab: (tab) => set({ activeTab: tab })
}));

interface CallState {
  isCalling: boolean;
  isReceivingCall: boolean;
  callerInfo: any | null;
  callSignal: any | null;
  callAccepted: boolean;
  isVideoCall: boolean;
  setCallState: (data: Partial<CallState>) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  isCalling: false,
  isReceivingCall: false,
  callerInfo: null,
  callSignal: null,
  callAccepted: false,
  isVideoCall: false,
  setCallState: (data) => set((state) => ({ ...state, ...data })),
  resetCall: () => set({
     isCalling: false,
     isReceivingCall: false,
     callerInfo: null,
     callSignal: null,
     callAccepted: false,
     isVideoCall: false
  })
}));
