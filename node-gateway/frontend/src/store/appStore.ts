import { create } from "zustand";

export interface Document {
  doc_id: string;
  filename: string;
  pages?: number;
  chunks?: number;
  created_at?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AppState {
  documents: Document[];
  selectedDocIds: string[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (doc_id: string) => void;
  toggleDocSelection: (doc_id: string) => void;
  selectAllDocs: () => void;
  clearSelection: () => void;
  messages: Message[];
  isStreaming: boolean;
  addMessage: (msg: Message) => void;
  appendToLastMessage: (token: string) => void;
  setStreaming: (val: boolean) => void;
  clearChat: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  documents: [],
  selectedDocIds: [],
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
  removeDocument: (doc_id) =>
    set((s) => ({
      documents: s.documents.filter((d) => d.doc_id !== doc_id),
      selectedDocIds: s.selectedDocIds.filter((id) => id !== doc_id),
    })),
  toggleDocSelection: (doc_id) =>
    set((s) => ({
      selectedDocIds: s.selectedDocIds.includes(doc_id)
        ? s.selectedDocIds.filter((id) => id !== doc_id)
        : [...s.selectedDocIds, doc_id],
    })),
  selectAllDocs: () =>
    set((s) => ({ selectedDocIds: s.documents.map((d) => d.doc_id) })),
  clearSelection: () => set({ selectedDocIds: [] }),
  messages: [],
  isStreaming: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  appendToLastMessage: (token) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: msgs[msgs.length - 1].content + token,
        };
      }
      return { messages: msgs };
    }),
  setStreaming: (val) => set({ isStreaming: val }),
  clearChat: () => set({ messages: [] }),
}));
