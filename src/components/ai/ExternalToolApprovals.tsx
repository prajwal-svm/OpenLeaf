import { useMcpApprovalStore } from "@/store/mcp-approvals";
import { ToolConfirm, isAutoApprovable } from "@/components/ai/ToolConfirm";

/**
 * Floating approval surface for tool calls arriving over MCP (external
 * agents). Reuses the exact ToolConfirm card from the in-app chat so the
 * approval semantics and the diff preview are identical.
 */
export function ExternalToolApprovals() {
  const queue = useMcpApprovalStore((s) => s.queue);
  const sessionAutoApprove = useMcpApprovalStore((s) => s.sessionAutoApprove);
  const decide = useMcpApprovalStore((s) => s.decide);
  const approveSession = useMcpApprovalStore((s) => s.approveSession);
  const head = queue[0];
  if (!head) return null;
  return (
    <div
      data-testid="mcp-approval-panel"
      className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-2xl"
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-medium text-foreground">External agent request (MCP)</p>
        {queue.length > 1 && (
          <span className="text-[11px] text-muted-foreground">{queue.length - 1} more waiting</span>
        )}
      </div>
      <div className="pt-2">
        <ToolConfirm
          req={head.req}
          onApprove={() => decide(head.id, true)}
          onReject={() => decide(head.id, false)}
          onApproveSession={
            isAutoApprovable(head.req.tool) ? () => approveSession(head.id) : undefined
          }
          sessionAutoApprove={sessionAutoApprove}
        />
      </div>
    </div>
  );
}
