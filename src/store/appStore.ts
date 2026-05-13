import { create } from 'zustand';
import type {
  PlatformId, RoomId, PostTypeId, GeneratedPost, DeepDivePost, QAReport,
  ImportedBrief, BriefItem, IntelligenceItem,
} from '../types';
import type { BannerDoc } from '../components/editor/bannerTypes';
import type { ImportPayload } from '../services/importHandler';

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
  qaReport: QAReport | null;
  /** Currently imported Deep Research brief (if any) */
  brief: ImportedBrief | null;
  /** Currently selected brief item (for generation) */
  selectedBriefItem: BriefItem | null;
  /** Intelligence item the user clicked "Paste Response" on. Used by AIBriefPaste. */
  pendingIntelligenceItem: IntelligenceItem | null;
  /** BannerDoc the user clicked "Open in editor" on (from a kit card). Used by BannerEditor. */
  pendingBannerDoc: BannerDoc | null;
  /** Service-picker preset to apply when ServicePicker mounts (e.g. 'compliance'). */
  pendingServicePreset: 'compliance' | 'corporate_finance' | 'wealth_management' | null;
  /** Payload received via the Claude.ai bookmarklet — auto-fills AIBriefPaste. */
  pendingImportPayload: ImportPayload | null;

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
  setQAReport: (report: QAReport | null) => void;
  setBrief: (brief: ImportedBrief | null) => void;
  setSelectedBriefItem: (item: BriefItem | null) => void;
  setPendingIntelligenceItem: (item: IntelligenceItem | null) => void;
  setPendingBannerDoc: (doc: BannerDoc | null) => void;
  setPendingServicePreset: (p: AppState['pendingServicePreset']) => void;
  setPendingImportPayload: (p: ImportPayload | null) => void;
  clearBrief: () => void;
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
  qaReport: null as QAReport | null,
  brief: null as ImportedBrief | null,
  selectedBriefItem: null as BriefItem | null,
  pendingIntelligenceItem: null as IntelligenceItem | null,
  pendingBannerDoc: null as BannerDoc | null,
  pendingServicePreset: null as AppState['pendingServicePreset'],
  pendingImportPayload: null as ImportPayload | null,
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
  setQAReport: (qaReport) => set({ qaReport }),
  setBrief: (brief) => set({ brief }),
  setSelectedBriefItem: (selectedBriefItem) => set({ selectedBriefItem }),
  setPendingIntelligenceItem: (pendingIntelligenceItem) => set({ pendingIntelligenceItem }),
  setPendingBannerDoc: (pendingBannerDoc) => set({ pendingBannerDoc }),
  setPendingServicePreset: (pendingServicePreset) => set({ pendingServicePreset }),
  setPendingImportPayload: (pendingImportPayload) => set({ pendingImportPayload }),
  clearBrief: () => set({ brief: null, selectedBriefItem: null }),
  reset: () => set(initialState),
}));
