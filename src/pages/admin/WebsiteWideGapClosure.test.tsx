import { describe, expect, it, vi } from "vitest";
import {
  parseHtmlToTreatmentBlocks,
  compileTreatmentBlocksToHtml,
  validateMediaFile,
  ALLOWED_IMAGE_MIMES,
} from "@/lib/cms/types";
import { DEFAULT_NAV_ITEMS, type BrandingConfig } from "@/contexts/SiteConfigContext";
import {
  EMPTY_CHANGESET,
  applyChangeset,
  normalizeChangeset,
  removeChangesetItem,
  upsertChangesetItem,
  validateChangeset,
} from "@/lib/cms/collections";

describe("Website-Wide Gap Closure & Verification Unit Tests", () => {
  describe("1. Multi-Image Preservation in Treatment Blocks (Section 4)", () => {
    it("preserves multiple <img> tags within a single HTML section chunk without dropping assets", () => {
      // Simulating a real seeded migration section like shoulder-dislocation or hip replacement
      const htmlWithMultipleImages = `
        <h3>Bankart Repair & Arthroscopic Stabilization</h3>
        <p>Minimally invasive arthroscopic repair re-attaches the torn labrum to the glenoid rim using biocompatible suture anchors.</p>
        <figure>
          <img src="/images/treatments/shoulder-dislocation/shoulder-instability-types.jpg" alt="Types of Shoulder Instability" />
        </figure>
        <p>Following anchor placement, the capsule is tensioned to restore joint congruency.</p>
        <figure>
          <img src="/images/treatments/shoulder-dislocation/shoulder-dislocation-reduction.jpg" alt="Closed Reduction Technique" />
        </figure>
        <p>Comprehensive rehabilitation protocols ensure early passive mobility.</p>
        <figure>
          <img src="/images/treatments/shoulder-dislocation/shoulder-rehabilitation-timeline.jpg" alt="Rehabilitation Timeline" />
        </figure>
      `;

      const blocks = parseHtmlToTreatmentBlocks(htmlWithMultipleImages, "Shoulder Instability");

      // Verify that all 3 images were extracted and preserved as distinct image blocks
      const imageBlocks = blocks.filter((b) => b.type === "image");
      expect(imageBlocks).toHaveLength(3);
      expect(imageBlocks[0].imageUrl).toBe("/images/treatments/shoulder-dislocation/shoulder-instability-types.jpg");
      expect(imageBlocks[0].imageAlt).toBe("Types of Shoulder Instability");
      expect(imageBlocks[1].imageUrl).toBe("/images/treatments/shoulder-dislocation/shoulder-dislocation-reduction.jpg");
      expect(imageBlocks[1].imageAlt).toBe("Closed Reduction Technique");
      expect(imageBlocks[2].imageUrl).toBe("/images/treatments/shoulder-dislocation/shoulder-rehabilitation-timeline.jpg");
      expect(imageBlocks[2].imageAlt).toBe("Rehabilitation Timeline");

      // Verify round-trip compilation contains all three images
      const compiledHtml = compileTreatmentBlocksToHtml(blocks);
      expect(compiledHtml).toContain("shoulder-instability-types.jpg");
      expect(compiledHtml).toContain("shoulder-dislocation-reduction.jpg");
      expect(compiledHtml).toContain("shoulder-rehabilitation-timeline.jpg");
    });
  });

  describe("2. Media Security & Safe Storage Validation (Reconciling F4)", () => {
    it("strictly rejects SVG files in validateMediaFile to prevent stored XSS attacks", () => {
      const svgFile = {
        name: "malicious-vector.svg",
        size: 1024,
        type: "image/svg+xml",
      };

      const result = validateMediaFile(svgFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Unsupported file type/i);
      expect(result.error).toContain("image/svg+xml");
    });

    it("accepts valid raster image formats (JPEG, PNG, WebP) within size limit", () => {
      expect(ALLOWED_IMAGE_MIMES).toContain("image/jpeg");
      expect(ALLOWED_IMAGE_MIMES).toContain("image/png");
      expect(ALLOWED_IMAGE_MIMES).toContain("image/webp");
      expect(ALLOWED_IMAGE_MIMES).not.toContain("image/svg+xml");

      const validJpg = {
        name: "patient-xray.jpg",
        size: 500 * 1024, // 500 KB
        type: "image/jpeg",
      };

      const result = validateMediaFile(validJpg);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects oversized images exceeding the 5MB upload threshold", () => {
      const oversizedJpg = {
        name: "huge-scan.jpg",
        size: 15 * 1024 * 1024, // 15 MB
        type: "image/jpeg",
      };

      const result = validateMediaFile(oversizedJpg);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds the 5 MB limit/i);
    });
  });

  describe("3. Navigation Items & Announcement Banner Configuration (Section 3)", () => {
    it("provides complete default navigation items matching the website structure", () => {
      expect(DEFAULT_NAV_ITEMS).toHaveLength(6);
      expect(DEFAULT_NAV_ITEMS.map((item) => item.id)).toEqual([
        "home",
        "about",
        "orthopaedics",
        "physiotherapy",
        "rehabilitation",
        "contact",
      ]);

      const orthoItem = DEFAULT_NAV_ITEMS.find((i) => i.id === "orthopaedics");
      expect(orthoItem?.hasDropdown).toBe(true);
      expect(orthoItem?.dropdownKey).toBe("orthopaedics");
    });

    it("supports custom branding configuration with announcement banner, custom navigation, and footer details", () => {
      const customBranding: BrandingConfig = {
        logoUrl: "/images/custom-logo.png",
        themePreset: "royal-navy",
        announcementEnabled: true,
        announcementText: "Sunday Free Joint Camp in Secunderabad",
        announcementLinkLabel: "Register Now",
        announcementLinkUrl: "/contact",
        headerCtaLink: "/contact#book",
        copyrightText: "© 2026 Dr. Srivanth Dasari. All rights reserved.",
        youtubeUrl: "https://youtube.com/@orthocarehub",
        navItems: [
          ...DEFAULT_NAV_ITEMS,
          {
            id: "second-opinion",
            label: "Second Opinion",
            to: "/second-opinion",
            visible: true,
            sortOrder: 7,
          },
        ],
      };

      expect(customBranding.announcementEnabled).toBe(true);
      expect(customBranding.announcementText).toContain("Sunday Free Joint Camp");
      expect(customBranding.navItems).toHaveLength(7);
      expect(customBranding.copyrightText).toContain("Dr. Srivanth Dasari");
    });
  });

  describe("4. Collection Approval Workflow (Services, Blogs, Case Studies, Testimonials)", () => {
    const live = [
      { id: "11111111-1111-4111-8111-111111111111", name: "Knee Replacement", slug: "knee-replacement", sort_order: 1 },
      { id: "22222222-2222-4222-8222-222222222222", name: "Hip Replacement", slug: "hip-replacement", sort_order: 2 },
    ];

    it("records only changed fields, new rows and explicit removals in the changeset", () => {
      let cs = upsertChangesetItem("services", EMPTY_CHANGESET, live, { ...live[0], name: "Robotic Knee Replacement" });
      expect(cs.items).toEqual([{ id: live[0].id, name: "Robotic Knee Replacement" }]);

      cs = upsertChangesetItem("services", cs, live, { id: "new-1", name: "ACL Reconstruction", slug: "acl-reconstruction" });
      cs = removeChangesetItem(cs, live[1].id);
      expect(cs.deletedIds).toEqual([live[1].id]);

      const preview = applyChangeset("services", live, cs);
      expect(preview.map((r) => r.name)).toEqual(["Robotic Knee Replacement", "ACL Reconstruction"]);

      // Saving an untouched row back removes it from the changeset
      const reverted = upsertChangesetItem("services", cs, live, { ...live[0] });
      expect(reverted.items.find((i) => i.id === live[0].id)).toBeUndefined();
    });

    it("drops unknown columns and invalid ids before anything reaches the database", () => {
      const cs = normalizeChangeset("services", {
        items: [{ id: live[0].id, name: "X", views_count: 999, created_at: "2020-01-01" }],
        deletedIds: ["not-a-uuid", live[1].id],
      });
      expect(cs.items[0]).toEqual({ id: live[0].id, name: "X" });
      expect(cs.deletedIds).toEqual([live[1].id]);
    });

    it("blocks submission of new rows missing required fields or with duplicate slugs", () => {
      const problems = validateChangeset("services", {
        items: [
          { id: "new-1", name: "A", slug: "same" },
          { id: "new-2", name: "B", slug: "same" },
          { id: "new-3", name: "No slug" },
        ],
        deletedIds: [],
      });
      expect(problems.some((p) => /same slug/i.test(p) || /same/i.test(p))).toBe(true);
      expect(problems.some((p) => /slug is required/i.test(p))).toBe(true);
    });
  });

  describe("5. Collection Workflow Logic & Validation (Migration 005d)", () => {
    it("rejects submitting empty changesets for review", async () => {
      const { saveCollectionDraft } = await import("@/lib/cms/repository");

      const res = await saveCollectionDraft({
        key: "services",
        changeset: EMPTY_CHANGESET,
        targetStatus: "pending_approval",
        previousStatus: "published",
      });

      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/no changes to submit/i);
    });

    it("rejects submitting changesets with invalid/missing required fields", async () => {
      const { saveCollectionDraft } = await import("@/lib/cms/repository");

      const res = await saveCollectionDraft({
        key: "services",
        changeset: {
          items: [{ name: "Incomplete Service" }], // missing required slug
          deletedIds: [],
        },
        targetStatus: "pending_approval",
        previousStatus: "draft",
      });

      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/slug is required/i);
    });

    it("requires feedback when rejecting a collection draft", async () => {
      const { reviewCollectionDraft } = await import("@/lib/cms/repository");

      const res = await reviewCollectionDraft({
        key: "services",
        decision: "rejected",
        feedback: "   ", // empty feedback
        previousStatus: "pending_approval",
      });

      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/rejection feedback is required/i);
    });
  });

  describe("6. Seeded Treatment Content & Multi-Image Round-Trip Preservation", () => {
    it("preserves multiple images and all clinical sections through full parse -> edit -> compile -> re-parse roundtrip", () => {
      const originalSeededHtml = `
        <h2>Clinical Overview</h2>
        <p>Comprehensive orthopedic evaluation of anterior cruciate ligament (ACL) rupture.</p>
        <figure>
          <img src="/images/treatments/acl/acl-tear-anatomy.jpg" alt="ACL Tear Anatomy" />
        </figure>
        <h2>Surgical Technique</h2>
        <p>Quad tendon autograft fixation with bioabsorbable interference screws.</p>
        <figure>
          <img src="/images/treatments/acl/acl-reconstruction-guide.jpg" alt="ACL Reconstruction Guide" />
        </figure>
      `;

      // 1. Initial parse
      const blocks = parseHtmlToTreatmentBlocks(originalSeededHtml, "ACL Reconstruction");
      const imageBlocks = blocks.filter((b) => b.type === "image");
      expect(imageBlocks).toHaveLength(2);

      // 2. Editor edits text in one section and adds a bullet item
      const overviewBlock = blocks.find((b) => b.heading.includes("Overview"));
      expect(overviewBlock).toBeDefined();
      if (overviewBlock) {
        overviewBlock.body += " Updated with robotic navigation protocol.";
        overviewBlock.bulletItems = ["Lachman Test Grade III", "Pivot Shift Positive"];
      }

      // 3. Compile back to HTML
      const compiledHtml = compileTreatmentBlocksToHtml(blocks);
      expect(compiledHtml).toContain("acl-tear-anatomy.jpg");
      expect(compiledHtml).toContain("acl-reconstruction-guide.jpg");
      expect(compiledHtml).toContain("Updated with robotic navigation protocol.");
      expect(compiledHtml).toContain("Lachman Test Grade III");

      // 4. Re-parse compiled HTML
      const reParsedBlocks = parseHtmlToTreatmentBlocks(compiledHtml, "ACL Reconstruction");
      const reParsedImages = reParsedBlocks.filter((b) => b.type === "image");
      expect(reParsedImages).toHaveLength(2);
      expect(reParsedImages[0].imageUrl).toBe("/images/treatments/acl/acl-tear-anatomy.jpg");
      expect(reParsedImages[1].imageUrl).toBe("/images/treatments/acl/acl-reconstruction-guide.jpg");
    });
  });
});
