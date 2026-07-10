import type {
  DiagNode,
  DiagEdge,
  StrokeStyle,
  EdgeRouting,
  EdgeArrow,
  EdgeStyle,
} from "@/components/diagram/model";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value || "#ffffff"}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 w-10 cursor-pointer rounded border bg-background"
    />
  );
}

const selectCls =
  "rounded border border-input bg-background px-1.5 py-1 text-xs outline-none focus:border-primary";

/** Style controls for the currently selected node or edge. */
export function Inspector({
  node,
  edge,
  onNodeChange,
  onEdgeChange,
}: {
  node: DiagNode | null;
  edge: DiagEdge | null;
  onNodeChange: (patch: Partial<DiagNode>) => void;
  onEdgeChange: (patch: Partial<DiagEdge>) => void;
}) {
  if (!node && !edge) {
    return (
      <div className="p-3 text-center text-[11px] text-muted-foreground">
        Select a shape or arrow to style it.
      </div>
    );
  }

  if (node) {
    return (
      <div className="flex flex-col gap-2.5 p-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Shape
        </div>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Label (LaTeX)</span>
          <input
            value={node.label}
            onChange={(e) => onNodeChange({ label: e.target.value })}
            className="rounded border border-input bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
          />
        </label>
        {node.shape !== "text" && (
          <>
            <Row label="Fill">
              <ColorInput value={node.fill} onChange={(v) => onNodeChange({ fill: v })} />
            </Row>
            <Row label="Border">
              <ColorInput value={node.stroke} onChange={(v) => onNodeChange({ stroke: v })} />
            </Row>
            <Row label="Border style">
              <select
                value={node.strokeStyle || "solid"}
                onChange={(e) => onNodeChange({ strokeStyle: e.target.value as StrokeStyle })}
                className={selectCls}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </Row>
          </>
        )}
        <Row label="Text color">
          <ColorInput value={node.textColor} onChange={(v) => onNodeChange({ textColor: v })} />
        </Row>
      </div>
    );
  }

  // edge
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Arrow
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Label</span>
        <input
          value={edge!.label || ""}
          onChange={(e) => onEdgeChange({ label: e.target.value })}
          className="rounded border border-input bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
        />
      </label>
      <Row label="Arrowhead">
        <select
          value={edge!.arrow}
          onChange={(e) => onEdgeChange({ arrow: e.target.value as EdgeArrow })}
          className={selectCls}
        >
          <option value="forward">End</option>
          <option value="both">Both</option>
          <option value="none">None</option>
        </select>
      </Row>
      <Row label="Routing">
        <select
          value={edge!.routing}
          onChange={(e) => onEdgeChange({ routing: e.target.value as EdgeRouting })}
          className={selectCls}
        >
          <option value="straight">Straight</option>
          <option value="orthogonal">Orthogonal</option>
          <option value="curved">Curved</option>
        </select>
      </Row>
      <Row label="Line">
        <select
          value={edge!.style}
          onChange={(e) => onEdgeChange({ style: e.target.value as EdgeStyle })}
          className={selectCls}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
        </select>
      </Row>
    </div>
  );
}
