const BASE = "/api";

export async function fetchDocuments() {
  const res = await fetch(BASE + "/documents");
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(doc_id: string) {
  const res = await fetch(BASE + "/documents/" + doc_id, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

export function ingestDocument(
  file: File,
  onEvent: (event: IngestionEvent) => void,
  onError: (msg: string) => void
): AbortController {
  const controller = new AbortController();
  const formData = new FormData();
  formData.append("file", file);

  fetch(BASE + "/ingest", { method: "POST", body: formData, signal: controller.signal })
    .then(async (res) => {
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try { onEvent(JSON.parse(line.slice(6))); } catch {}
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err.message);
    });

  return controller;
}

export async function streamQuery(
  question: string,
  docIds: string[] | null,
  chatHistory: { role: string; content: string }[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
) {
  try {
    const res = await fetch(BASE + "/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        doc_ids: docIds?.length ? docIds : null,
        chat_history: chatHistory,
      }),
    });
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
    onDone();
  } catch (err: any) {
    onError(err.message);
  }
}

export interface IngestionEvent {
  status: "parsing" | "chunking" | "embedding" | "complete" | "error";
  progress: number;
  message: string;
  doc_id?: string;
  filename?: string;
  stats?: { pages: number; chunks: number };
}
