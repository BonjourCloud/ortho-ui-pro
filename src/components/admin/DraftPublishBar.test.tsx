import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DraftPublishBar } from "@/components/admin/DraftPublishBar";

describe("DraftPublishBar (ROLE-001, PUB-001, Approval Workflow)", () => {
  it("allows Editor (canPublish=false, canApprove=false) to Save draft, Submit for review, and Preview, while blocking Publish and Approve", () => {
    const onSaveDraft = vi.fn();
    const onSubmitForReview = vi.fn();
    const onPublish = vi.fn();

    render(
      <DraftPublishBar
        workflowStatus="draft"
        canSubmitReview={true}
        canApprove={false}
        canPublish={false}
        previewUrl="/?preview=1"
        onSaveDraft={onSaveDraft}
        onSubmitForReview={onSubmitForReview}
        onPublish={onPublish}
      />,
    );

    expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Draft");
    expect(screen.getByRole("link", { name: /preview draft/i })).toHaveAttribute("href", "/?preview=1");

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(onSaveDraft).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));
    expect(onSubmitForReview).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByText(/super admin approves & publishes/i)).toBeInTheDocument();
  });

  it("displays rejection feedback banner to Editor when status is 'rejected'", () => {
    render(
      <DraftPublishBar
        workflowStatus="rejected"
        canSubmitReview={true}
        canApprove={false}
        canPublish={false}
        reviewFeedback="Please update the Saturday clinic hours to 6 PM."
        reviewedByEmail="superadmin@orthocarehub.in"
        onSaveDraft={vi.fn()}
        onSubmitForReview={vi.fn()}
        onPublish={vi.fn()}
      />,
    );

    expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Changes Requested");
    expect(screen.getByRole("alert")).toHaveTextContent(/please update the saturday clinic hours to 6 pm/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/superadmin@orthocarehub.in/i);
  });

  it("allows Super Admin (canApprove=true, canPublish=true) to Approve, Reject with required feedback, and Publish", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onPublish = vi.fn();

    render(
      <DraftPublishBar
        workflowStatus="pending_approval"
        canSubmitReview={true}
        canApprove={true}
        canPublish={true}
        onSaveDraft={vi.fn()}
        onApprove={onApprove}
        onReject={onReject}
        onPublish={onPublish}
      />,
    );

    expect(screen.getByTestId("workflow-status-badge")).toHaveTextContent("Pending Super Admin Review");

    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);

    // Open reject box and verify empty feedback is blocked
    fireEvent.click(screen.getByRole("button", { name: /reject with feedback/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }));
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByText(/please enter feedback/i)).toBeInTheDocument();

    // Enter feedback and confirm rejection
    fireEvent.change(screen.getByLabelText(/feedback for content editor/i), {
      target: { value: "Check image alt text" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }));
    expect(onReject).toHaveBeenCalledWith("Check image alt text");

    // Direct or final publish
    fireEvent.click(screen.getByRole("button", { name: /publish to live website/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });
});
