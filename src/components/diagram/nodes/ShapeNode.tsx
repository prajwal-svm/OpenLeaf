import { type CSSProperties } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import type { NodeShape, StrokeStyle } from "@/components/diagram/model";

export interface ShapeData {
  shape: NodeShape;
  label: string;
  fill?: string;
  stroke?: string;
  strokeStyle?: StrokeStyle;
  strokeWidth?: number;
  textColor?: string;
  [key: string]: unknown;
}

const HANDLES = [
  { id: "t", pos: Position.Top },
  { id: "r", pos: Position.Right },
  { id: "b", pos: Position.Bottom },
  { id: "l", pos: Position.Left },
];

/** The editing surface representation of a diagram node. CSS approximates the
 *  shape; the real figure is generated from TikZ, so exactness here is not
 *  required. */
export function ShapeNode({ data, selected }: NodeProps) {
  const d = data as ShapeData;
  const isText = d.shape === "text";
  const radius =
    d.shape === "circle" || d.shape === "ellipse" ? "50%" : d.shape === "roundrect" ? "8px" : "0";
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 4,
    fontSize: 12,
    boxSizing: "border-box",
    color: d.textColor || "inherit",
    background: isText ? "transparent" : d.fill || "transparent",
    border: isText ? "none" : `${d.strokeWidth ?? 1}px ${d.strokeStyle || "solid"} ${d.stroke || "#334155"}`,
    borderRadius: radius,
    transform: d.shape === "diamond" ? "rotate(45deg)" : undefined,
  };
  const labelStyle: CSSProperties = d.shape === "diamond" ? { transform: "rotate(-45deg)" } : {};
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={30} minHeight={24} />
      <div style={style}>
        <span style={labelStyle}>{d.label}</span>
      </div>
      {HANDLES.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type="source"
          position={h.pos}
          style={{ width: 7, height: 7, background: "var(--primary)" }}
        />
      ))}
    </>
  );
}

export const nodeTypes = { shape: ShapeNode };
