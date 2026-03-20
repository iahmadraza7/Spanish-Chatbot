export type FileRecord = {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  ext: string;
  size_bytes: number;
  uploaded_at: string;
  status: "uploaded" | "processing" | "ready" | "error";
  error_message: string | null;
  preview_text: string | null;
  parsed_path: string | null;
};

export type ChunkRecord = {
  id: string;
  file_id: string;
  idx: number;
  content: string;
};

// NOTE: Database implementation lives in lib/sqlite.ts (sql.js, no native builds).

