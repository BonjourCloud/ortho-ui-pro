import { describe, expect, it } from "vitest";
import {
  compileTreatmentBlocksToHtml,
  DEFAULT_HOME_CONTENT,
  evaluateWorkflowTransition,
  isDraftPreviewParam,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  mergeHomeContent,
  moveSectionOrder,
  resolvePreviewData,
  toggleSectionVisibility,
  validateMediaFile,
  type TreatmentSectionBlock,
} from "@/lib/cms/types";

describe("Iteration 3 CMS helpers (PAGE-001..003, MEDIA-001..003, PUB-001)", () => {
  describe("Homepage section order & visibility (PAGE-001, PAGE-002)", () => {
    it("merges partial homepage content safely with production defaults", () => {
      const merged = mergeHomeContent({
        hero: { ...DEFAULT_HOME_CONTENT.hero, badge: "Updated Badge" },
      });
      expect(merged.hero.badge).toBe("Updated Badge");
      expect(merged.hero.headingHighlight).toBe("Pain-Free Living");
      expect(merged.specialties.items.length).toBe(8);
      expect(merged.procedures.items.length).toBe(6);
      expect(merged.whyChoose.items.length).toBe(6);
    });

    it("reorders sections up and down and normalizes sortOrder", () => {
      const initial = DEFAULT_HOME_CONTENT.sectionsOrder;
      const movedDown = moveSectionOrder(initial, "hero", "down");
      expect(movedDown[0].id).toBe("stats");
      expect(movedDown[1].id).toBe("hero");
      expect(movedDown.map((s) => s.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);

      const movedBackUp = moveSectionOrder(movedDown, "hero", "up");
      expect(movedBackUp[0].id).toBe("hero");
    });

    it("does not move first section up or last section down", () => {
      const initial = DEFAULT_HOME_CONTENT.sectionsOrder;
      expect(moveSectionOrder(initial, "hero", "up")[0].id).toBe("hero");
      expect(moveSectionOrder(initial, "cta", "down")[6].id).toBe("cta");
    });

    it("toggles section visibility cleanly", () => {
      const initial = DEFAULT_HOME_CONTENT.sectionsOrder;
      const hidden = toggleSectionVisibility(initial, "procedures");
      expect(hidden.find((s) => s.id === "procedures")?.visible).toBe(false);
      const shown = toggleSectionVisibility(hidden, "procedures");
      expect(shown.find((s) => s.id === "procedures")?.visible).toBe(true);
    });
  });

  describe("Structured treatment block compiler (PAGE-003)", () => {
    it("compiles structured treatment blocks into semantic HTML and escapes unsafe characters", () => {
      const blocks: TreatmentSectionBlock[] = [
        {
          id: "b1",
          type: "overview",
          heading: "What is Frozen Shoulder?",
          body: "Frozen shoulder causes stiffness.\n\nEarly physiotherapy helps.",
          bulletItems: ["Pain at night", "Reduced range of motion <90°"],
        },
        {
          id: "b2",
          type: "image",
          heading: "Anatomy",
          body: "",
          bulletItems: [],
          imageUrl: "https://example.com/shoulder.webp",
          imageAlt: "Shoulder joint capsule",
        },
      ];

      const html = compileTreatmentBlocksToHtml(blocks);
      expect(html).toContain('<h2>What is Frozen Shoulder?</h2>');
      expect(html).toContain("<p>Frozen shoulder causes stiffness.</p>");
      expect(html).toContain("<li>Reduced range of motion &lt;90°</li>");
      expect(html).toContain('src="https://example.com/shoulder.webp"');
      expect(html).toContain('alt="Shoulder joint capsule"');
    });
  });

  describe("Media file validation (MEDIA-001, MEDIA-002)", () => {
    it("accepts valid image files up to 5 MB", () => {
      expect(validateMediaFile({ name: "doctor.jpg", type: "image/jpeg", size: 1024 * 500 })).toEqual({
        valid: true,
        mediaType: "image",
      });
      expect(validateMediaFile({ name: "banner.webp", type: "image/webp", size: MAX_IMAGE_BYTES }).valid).toBe(true);
    });

    it("rejects images larger than 5 MB", () => {
      const res = validateMediaFile({ name: "huge.png", type: "image/png", size: MAX_IMAGE_BYTES + 1 });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/exceeds the 5 MB limit/i);
    });

    it("accepts valid MP4/WebM videos up to 50 MB and rejects oversized videos", () => {
      expect(validateMediaFile({ name: "testimonial.mp4", type: "video/mp4", size: 10 * 1024 * 1024 })).toEqual({
        valid: true,
        mediaType: "video",
      });
      const over = validateMediaFile({ name: "raw.mp4", type: "video/mp4", size: MAX_VIDEO_BYTES + 100 });
      expect(over.valid).toBe(false);
      expect(over.error).toMatch(/exceeds the 50 MB limit/i);
    });

    it("rejects unsupported MIME types and empty files", () => {
      expect(validateMediaFile({ name: "script.exe", type: "application/x-msdownload", size: 1024 }).valid).toBe(false);
      expect(validateMediaFile({ name: "empty.jpg", type: "image/jpeg", size: 0 }).valid).toBe(false);
    });
  });

  describe("Draft vs Published preview resolution (PAGE-002, PUB-001)", () => {
    it("recognizes canonical ?preview=1 and alias ?preview=draft parameters", () => {
      expect(isDraftPreviewParam("1")).toBe(true);
      expect(isDraftPreviewParam("draft")).toBe(true);
      expect(isDraftPreviewParam("true")).toBe(true);
      expect(isDraftPreviewParam("0")).toBe(false);
      expect(isDraftPreviewParam(null)).toBe(false);
      expect(isDraftPreviewParam(undefined)).toBe(false);
    });

    it("returns published content for public visitors even if ?preview=1 is passed", () => {
      const res = resolvePreviewData({
        published: { title: "Live Title" },
        draft: { title: "Draft Title" },
        isPreviewMode: true,
        isAuthenticatedCmsUser: false,
      });
      expect(res).toEqual({ data: { title: "Live Title" }, usingDraft: false });
    });

    it("returns draft content only when preview mode is active AND user is an authenticated CMS user", () => {
      const res = resolvePreviewData({
        published: { title: "Live Title" },
        draft: { title: "Draft Title" },
        isPreviewMode: true,
        isAuthenticatedCmsUser: true,
      });
      expect(res).toEqual({ data: { title: "Draft Title" }, usingDraft: true });
    });

    it("falls back to published content when draft is null", () => {
      const res = resolvePreviewData({
        published: { title: "Live Title" },
        draft: null,
        isPreviewMode: true,
        isAuthenticatedCmsUser: true,
      });
      expect(res).toEqual({ data: { title: "Live Title" }, usingDraft: false });
    });
  });

  describe("Approval workflow state machine (draft -> pending_approval -> approved/rejected -> published)", () => {
    it("allows Editor to save draft and submit for review, but blocks approve, reject, and publish", () => {
      const editorFlags = { canSubmitReview: true, canApprove: false, canPublish: false };

      expect(evaluateWorkflowTransition({ ...editorFlags, currentStatus: "published", action: "save_draft" })).toEqual({
        allowed: true,
        nextStatus: "draft",
      });

      expect(evaluateWorkflowTransition({ ...editorFlags, currentStatus: "draft", action: "submit_for_review" })).toEqual({
        allowed: true,
        nextStatus: "pending_approval",
      });

      expect(evaluateWorkflowTransition({ ...editorFlags, currentStatus: "rejected", action: "submit_for_review" })).toEqual({
        allowed: true,
        nextStatus: "pending_approval",
      });

      expect(evaluateWorkflowTransition({ ...editorFlags, currentStatus: "pending_approval", action: "approve" }).allowed).toBe(false);
      expect(evaluateWorkflowTransition({ ...editorFlags, currentStatus: "pending_approval", action: "reject", feedback: "Fix typo" }).allowed).toBe(false);
      expect(evaluateWorkflowTransition({ ...editorFlags, currentStatus: "approved", action: "publish" }).allowed).toBe(false);
    });

    it("allows Super Admin to approve, reject with feedback, publish approved changes, or direct-publish", () => {
      const superAdminFlags = { canSubmitReview: true, canApprove: true, canPublish: true };

      expect(evaluateWorkflowTransition({ ...superAdminFlags, currentStatus: "pending_approval", action: "approve" })).toEqual({
        allowed: true,
        nextStatus: "approved",
      });

      // Reject requires non-empty feedback
      const noFeedback = evaluateWorkflowTransition({ ...superAdminFlags, currentStatus: "pending_approval", action: "reject", feedback: "   " });
      expect(noFeedback.allowed).toBe(false);
      expect(noFeedback.reason).toMatch(/provide feedback/i);

      const withFeedback = evaluateWorkflowTransition({
        ...superAdminFlags,
        currentStatus: "pending_approval",
        action: "reject",
        feedback: "Please verify the Ashok Nagar branch timings.",
      });
      expect(withFeedback).toEqual({ allowed: true, nextStatus: "rejected" });

      // Publish from approved or direct publish from draft
      expect(evaluateWorkflowTransition({ ...superAdminFlags, currentStatus: "approved", action: "publish" })).toEqual({
        allowed: true,
        nextStatus: "published",
      });
      expect(evaluateWorkflowTransition({ ...superAdminFlags, currentStatus: "draft", action: "publish" })).toEqual({
        allowed: true,
        nextStatus: "published",
      });
    });
  });
});
