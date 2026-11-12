/**
 * Media rules must match the database (bucket allowed_mime_types + chk_media_assets_* in 004/005b),
 * and the media repository must surface real storage/database failures instead of pretending.
 * Clinic helpers must keep drafts to the allow-listed keys (= clinic_config_keys() in 005c).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- Supabase stand-in for the repository tests ----------------------------
type StorageResult = { error: { message: string } | null };
const storageUpload = vi.fn(async (_path: string, _body: unknown, _opts: unknown): Promise<StorageResult> => ({ error: null }));
const storageRemove = vi.fn(async (_paths: string[]): Promise<StorageResult> => ({ error: null }));
let insertResult: { data: Record<string, unknown> | null; error: { message: string } | null } = {
  data: { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-11-12T10:00:00Z" },
  error: null,
};
let updateResult: { data: unknown; error: { message: string } | null } = { data: [{ id: "x" }], error: null };
const insertedRows: Record<string, unknown>[] = [];
const updatedRows: Record<string, unknown>[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    let mode: "insert" | "update" | "select" = "select";
    const c = {
      select: () => c,
      eq: () => c,
      order: () => c,
      limit: () => c,
      insert: (row: Record<string, unknown>) => {
        mode = "insert";
        insertedRows.push({ table, ...row });
        return c;
      },
      update: (row: Record<string, unknown>) => {
        mode = "update";
        updatedRows.push({ table, ...row });
        return c;
      },
      delete: () => c,
      single: async () => (mode === "insert" ? insertResult : { data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve(mode === "update" ? updateResult : { data: [], error: null }).then(res),
    };
    return c;
  };
  return {
    supabase: {
      from: (t: string) => chain(t),
      rpc: async () => ({ data: null, error: null }),
      storage: {
        from: () => ({
          upload: (path: string, body: unknown, opts: unknown) => storageUpload(path, body, opts),
          remove: (paths: string[]) => storageRemove(paths),
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example.test/cms-media/${path}` } }),
        }),
      },
    },
  };
});

import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_ACCEPT_ATTR,
  validateMediaFile,
  type MediaAsset,
} from "@/lib/cms/types";
import { replaceMediaAssetFile, updateMediaAssetMetadata, uploadMediaAsset } from "@/lib/cms/repository";
import {
  CLINIC_CONFIG_KEYS,
  applyClinicDraft,
  diffClinicConfig,
  pickClinicConfig,
  validateClinicDraft,
} from "@/lib/cms/clinic";
import type { SiteConfig } from "@/contexts/SiteConfigContext";

const migrationsDir = resolve(__dirname, "../../../docs/proposed-migrations");
const sql005b = readFileSync(resolve(migrationsDir, "005b_security_hardening.sql"), "utf8");
const sql005c = readFileSync(resolve(migrationsDir, "005c_clinic_draft_workflow.sql"), "utf8");

function file(name: string, type: string, size = 2048): File {
  const f = new File([new Uint8Array(Math.min(size, 16))], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("Media validation matches database storage rules", () => {
  it("rejects SVG (not allowed by the cms-media bucket after 005b)", () => {
    const res = validateMediaFile({ name: "logo.svg", type: "image/svg+xml", size: 1024 });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/unsupported file type/i);
    expect(MEDIA_ACCEPT_ATTR).not.toContain("svg");
  });

  it("uses exactly the MIME types the bucket and chk_media_assets_mime_type allow", () => {
    const bucketLine = sql005b.match(/SET allowed_mime_types = ARRAY\[([^\]]+)\]/);
    expect(bucketLine).not.toBeNull();
    const bucketMimes = bucketLine![1].split(",").map((s) => s.trim().replace(/'/g, "")).sort();
    expect([...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES].sort()).toEqual(bucketMimes);
    expect(MAX_IMAGE_BYTES).toBe(5242880);
    expect(MAX_VIDEO_BYTES).toBe(52428800);
  });

  it("rejects a file whose extension does not match its type (renamed SVG / executable)", () => {
    expect(validateMediaFile({ name: "photo.svg", type: "image/png", size: 1024 }).valid).toBe(false);
    expect(validateMediaFile({ name: "clip.exe", type: "video/mp4", size: 1024 }).valid).toBe(false);
    expect(validateMediaFile({ name: "Reception.JPEG", type: "image/jpeg", size: 1024 }).valid).toBe(true);
  });
});

describe("Media repository reports real outcomes", () => {
  beforeEach(() => {
    storageUpload.mockReset();
    storageRemove.mockClear();
    insertedRows.length = 0;
    updatedRows.length = 0;
    insertResult = {
      data: { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-11-12T10:00:00Z" },
      error: null,
    };
    updateResult = { data: [{ id: "x" }], error: null };
    window.sessionStorage.clear();
  });

  it("uploads, records the real database id, and sends only granted columns", async () => {
    storageUpload.mockResolvedValue({ error: null });
    const res = await uploadMediaAsset({
      file: file("reception.png", "image/png"),
      altText: "Clinic reception",
      caption: "Front desk",
      category: "clinic",
    });
    expect(res.ok).toBe(true);
    expect(res.persistedToDatabase).toBe(true);
    expect(res.asset?.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(res.asset?.publicUrl).toMatch(/^https:\/\/cdn\.example\.test\/cms-media\/clinic\//);
    const row = insertedRows[0];
    expect(Object.keys(row).filter((k) => k !== "table").sort()).toEqual(
      ["alt_text", "caption", "category", "file_name", "media_type", "mime_type", "public_url", "size_bytes", "storage_path"].sort(),
    );
    expect(row).not.toHaveProperty("uploaded_by");
  });

  it("shows storage rejections instead of silently staging them", async () => {
    storageUpload.mockResolvedValue({ error: { message: "mime type image/svg+xml is not supported" } });
    const res = await uploadMediaAsset({ file: file("ok.png", "image/png"), altText: "", caption: "", category: "general" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not accepted by the media library/i);

    storageUpload.mockResolvedValue({ error: { message: "new row violates row-level security policy" } });
    const denied = await uploadMediaAsset({ file: file("ok.png", "image/png"), altText: "", caption: "", category: "general" });
    expect(denied.ok).toBe(false);
    expect(denied.error).toMatch(/not allowed to upload/i);
    expect(insertedRows).toHaveLength(0);
  });

  it("falls back to a session-only preview only when the bucket does not exist yet", async () => {
    storageUpload.mockResolvedValue({ error: { message: "Bucket not found" } });
    const res = await uploadMediaAsset({ file: file("ok.webp", "image/webp"), altText: "", caption: "", category: "general" });
    expect(res.ok).toBe(true);
    expect(res.persistedToDatabase).toBe(false);
    expect(res.asset?.id).toMatch(/^staged-/);
  });

  it("reports a library insert failure after upload", async () => {
    storageUpload.mockResolvedValue({ error: null });
    insertResult = { data: null, error: { message: "permission denied for table media_assets" } };
    const res = await uploadMediaAsset({ file: file("ok.jpg", "image/jpeg"), altText: "", caption: "", category: "general" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/could not be added to the media library/i);
  });

  it("replacement is a new asset; the original is left untouched", async () => {
    storageUpload.mockResolvedValue({ error: null });
    const original: MediaAsset = {
      id: "22222222-2222-4222-8222-222222222222",
      fileName: "old-hero.jpg",
      storagePath: "hero/1-old-hero.jpg",
      publicUrl: "https://cdn.example.test/cms-media/hero/1-old-hero.jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
      sizeBytes: 1000,
      altText: "Doctor at clinic",
      caption: "Hero",
      category: "hero",
      createdAt: "2026-01-01T00:00:00Z",
    };
    const res = await replaceMediaAssetFile({ asset: original, file: file("new-hero.jpg", "image/jpeg") });
    expect(res.ok).toBe(true);
    expect(res.replacedAssetId).toBe(original.id);
    expect(res.asset?.id).not.toBe(original.id);
    expect(res.asset?.altText).toBe("Doctor at clinic");
    expect(res.asset?.category).toBe("hero");
    expect(updatedRows).toHaveLength(0); // never repoints the existing row
  });

  it("metadata edits send only alt text, caption and category and detect blocked updates", async () => {
    const ok = await updateMediaAssetMetadata({
      assetId: "22222222-2222-4222-8222-222222222222",
      altText: " New alt ",
      caption: "New caption",
      category: "doctor",
    });
    expect(ok).toEqual({ ok: true, persistedToDatabase: true });
    expect(Object.keys(updatedRows[0]).filter((k) => k !== "table").sort()).toEqual(["alt_text", "caption", "category"]);
    expect(updatedRows[0].alt_text).toBe("New alt");

    updateResult = { data: [], error: null };
    const blocked = await updateMediaAssetMetadata({
      assetId: "22222222-2222-4222-8222-222222222222",
      altText: "x",
      caption: "",
      category: "general",
    });
    expect(blocked.ok).toBe(false);
  });
});

describe("Clinic draft helpers", () => {
  const live = {
    clinicName: "OrthoCare Hub",
    phone: "+91-1",
    email: "a@b.in",
    doctorName: "Dr. A",
    insuranceProviders: ["Star"],
    timeSlots: [{ time: "10:00 AM", available: true }],
  } as unknown as SiteConfig;

  it("allow-list matches clinic_config_keys() in migration 005c", () => {
    const sqlKeys = sql005c
      .match(/SELECT ARRAY\[([\s\S]*?)\]::text\[\]/)![1]
      .split(",")
      .map((s) => s.trim().replace(/'/g, ""))
      .filter(Boolean)
      .sort();
    expect([...CLINIC_CONFIG_KEYS].sort()).toEqual(sqlKeys);
  });

  it("drafts can never carry non-clinic keys into the live config", () => {
    const draft = { phone: "+91-2", doctorName: "Hacked", branding: { logoUrl: "x" } } as unknown as Partial<SiteConfig>;
    expect(pickClinicConfig(draft)).toEqual({ phone: "+91-2" });
    const merged = applyClinicDraft(live, draft);
    expect(merged.doctorName).toBe("Dr. A");
    expect(merged.phone).toBe("+91-2");
  });

  it("diff lists only changed clinic fields with readable values", () => {
    const changes = diffClinicConfig(live, { phone: "+91-2", email: "a@b.in", insuranceProviders: [] });
    expect(changes.map((c) => c.key)).toEqual(["phone", "insuranceProviders"]);
    expect(changes[1].draft).toBe("(none)");
  });

  it("validation mirrors the publish function's URL and number rules", () => {
    expect(validateClinicDraft({ googleMapsEmbedUrl: "https://evil.example/maps/embed" })).toHaveLength(1);
    expect(validateClinicDraft({ googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=1" })).toHaveLength(0);
    expect(validateClinicDraft({ facebook: "javascript:alert(1)" })).toHaveLength(1);
    expect(validateClinicDraft({ consultationFee: -5 })).toHaveLength(1);
    expect(validateClinicDraft({ clinicName: " " })).toHaveLength(1);
  });
});
