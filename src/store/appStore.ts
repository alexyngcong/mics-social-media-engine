import { create } from 'zustand';
import type { PlatformId, RoomId, PostTypeId, GeneratedPost, DeepDivePost } from '../types';

interface AppState {
  step: number;
  platform: PlatformId;
  room: RoomId | null;
  postType: PostTypeId | null;
  customTopic: string;
  result: GeneratedPost | null;
  deepResult: DeepDivePost | null;
  bannerVariant: number;
  bannerReady: boolean;
  loading: boolean;
  loadingMessage: string;
  error: string;
  copiedLabel: string;
  imageDimensionIndex: number;

  setStep: (step: number) => void;
  setPlatform: (p: PlatformId) => void;
  setRoom: (r: RoomId) => void;
  setPostType: (t: PostTypeId) => void;
  setCustomTopic: (topic: string) => void;
  setResult: (r: GeneratedPost | null) => void;
  setDeepResult: (r: DeepDivePost | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setLoadingMessage: (msg: string) => void;
  setError: (error: string) => void;
  setCopied: (label: string) => void;
  setBannerReady: (ready: boolean) => void;
  shuffleVariant: (templateCount: number) => void;
  setImageDimensionIndex: (i: number) => void;
  reset: () => void;
}

const initialState = {
  step: 0,
  platform: 'whatsapp' as PlatformId,
  room: null as RoomId | null,
  postType: null as PostTypeId | null,
  customTopic: '',
  result: null as GeneratedPost | null,
  deepResult: null as DeepDivePost | null,
  bannerVariant: 0,
  bannerReady: false,
  loading: false,
  loadingMessage: '',
  error: '',
  copiedLabel: '',
  imageDimensionIndex: 0,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setPlatform: (platform) => set({ platform }),
  setRoom: (room) => set({ room }),
  setPostType: (postType) => set({ postType }),
  setCustomTopic: (customTopic) => set({ customTopic }),
  setResult: (result) => set({ result }),
  setDeepResult: (deepResult) => set({ deepResult }),
  setLoading: (loading, message) => set({ loading, ...(message ? { loadingMessage: message } : {}) }),
  setLoadingMessage: (loadingMessage) => set({ loadingMessage }),
  setError: (error) => set({ error }),
  setCopied: (copiedLabel) => set({ copiedLabel }),
  setBannerReady: (bannerReady) => set({ bannerReady }),
  shuffleVariant: (templateCount) =>
    set({ bannerVariant: Math.floor(Math.random() * templateCount), bannerReady: false }),
  setImageDimensionIndex: (imageDimensionIndex) => set({ imageDimensionIndex }),
  reset: () => set(initialState),
}));
