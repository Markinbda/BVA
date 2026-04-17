import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type DrawingEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;
type WhiteboardTool = "freehand" | "line" | "arrow";
type LineStyle = "solid" | "dashed";

interface DrillWhiteboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDrawing: string;
  showTemplate: boolean;
  onShowTemplateChange: (show: boolean) => void;
  onSave: (drawing: string) => void;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const TEMPLATE_IMAGE_SRC = "/whiteboard/volleyball-court-template.svg";
const TOKEN_RADIUS = 18;

interface BoardToken {
  id: string;
  x: number;
  y: number;
  type: "circle" | "ball" | "coach" | "number";
  color: string;
  label?: string;
}

interface PaletteToken {
  type: "circle" | "ball" | "coach" | "number";
  color: string;
  label?: string;
  title: string;
}

const CIRCLE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#111827", "#ec4899"];

const PALETTE_TOKENS: PaletteToken[] = [
  ...CIRCLE_COLORS.map((color) => ({ type: "circle", color, title: `Circle ${color}` })),
  { type: "ball", color: "#f59e0b", label: "BALL", title: "Ball" },
  { type: "coach", color: "#111827", label: "C", title: "Coach" },
  { type: "number", color: "#334155", label: "1", title: "Number 1" },
  { type: "number", color: "#334155", label: "2", title: "Number 2" },
  { type: "number", color: "#334155", label: "3", title: "Number 3" },
  { type: "number", color: "#334155", label: "4", title: "Number 4" },
  { type: "number", color: "#334155", label: "5", title: "Number 5" },
];

const getPoint = (event: DrawingEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX = 0;
  let clientY = 0;

  if ("touches" in event && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if ("changedTouches" in event && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    const mouseEvent = event as React.MouseEvent<HTMLCanvasElement>;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

const isCanvasEmpty = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
};

const DrillWhiteboardModal = ({
  open,
  onOpenChange,
  initialDrawing,
  showTemplate,
  onShowTemplateChange,
  onSave,
}: DrillWhiteboardModalProps) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<WhiteboardTool>("freehand");
  const [strokeColor, setStrokeColor] = useState("#ef4444");
  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
  const [tokens, setTokens] = useState<BoardToken[]>([]);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [isEraser, setIsEraser] = useState(false);
  const [shapeStartPoint, setShapeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const tokenColorById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const token of tokens) map[token.id] = token.color;
    return map;
  }, [tokens]);

  const tokenLabelById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const token of tokens) map[token.id] = token.label;
    return map;
  }, [tokens]);

  const tokenTypeById = useMemo(() => {
    const map: Record<string, BoardToken["type"]> = {};
    for (const token of tokens) map[token.id] = token.type;
    return map;
  }, [tokens]);

  useEffect(() => {
    if (!open) return;

    setTokens([]);
    setShapeStartPoint(null);

    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const drawCtx = drawCanvas.getContext("2d");
    if (!drawCtx) return;

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    if (!initialDrawing) return;

    const img = new Image();
    img.onload = () => {
      drawCtx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
    };
    img.src = initialDrawing;
  }, [open, initialDrawing]);

  useEffect(() => {
    if (!draggingTokenId) return;

    const onPointerMove = (event: PointerEvent) => {
      const point = toCanvasCoords(event.clientX, event.clientY);
      if (!point) return;

      setTokens((prev) => prev.map((token) => (token.id === draggingTokenId ? { ...token, ...point } : token)));
    };

    const onPointerUp = () => {
      setDraggingTokenId(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggingTokenId]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return null;

    const rect = board.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return {
      x: Math.max(TOKEN_RADIUS, Math.min(CANVAS_WIDTH - TOKEN_RADIUS, x)),
      y: Math.max(TOKEN_RADIUS, Math.min(CANVAS_HEIGHT - TOKEN_RADIUS, y)),
    };
  };

  const addToken = (tokenTemplate: PaletteToken, x = CANVAS_WIDTH / 2, y = CANVAS_HEIGHT / 2) => {
    setTokens((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x,
        y,
        type: tokenTemplate.type,
        color: tokenTemplate.color,
        label: tokenTemplate.label,
      },
    ]);
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = 16;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 7), to.y - headLength * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 7), to.y - headLength * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fillStyle = strokeColor;
    ctx.fill();
  };

  const drawShape = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setLineDash(lineStyle === "dashed" ? [12, 10] : []);
    ctx.lineWidth = 4;
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();

    if (tool === "arrow") {
      drawArrowHead(ctx, from, to);
    }
  };

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = isEraser ? 14 : 4;
    ctx.setLineDash(lineStyle === "dashed" ? [10, 8] : []);
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const startDrawing = (event: DrawingEvent) => {
    event.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const point = getPoint(event, canvas);

    if (tool === "line" || tool === "arrow") {
      setShapeStartPoint(point);
      return;
    }

    setIsDrawing(true);
    lastPointRef.current = point;
  };

  const moveDrawing = (event: DrawingEvent) => {
    event.preventDefault();
    if (tool === "line" || tool === "arrow") return;
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const point = getPoint(event, canvas);
    drawSegment(lastPointRef.current, point);
    lastPointRef.current = point;
  };

  const endDrawing = () => {
    if (tool === "line" || tool === "arrow") {
      if (shapeStartPoint) {
        const canvas = drawCanvasRef.current;
        if (canvas) {
          const point = lastPointRef.current ?? shapeStartPoint;
          drawShape(shapeStartPoint, point);
        }
      }
      setShapeStartPoint(null);
      lastPointRef.current = null;
      return;
    }

    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearDrawing = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    setTokens([]);
    setShapeStartPoint(null);
  };

  const handlePaletteDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("application/json");
    if (!payload) return;

    let tokenTemplate: PaletteToken | null = null;
    try {
      tokenTemplate = JSON.parse(payload) as PaletteToken;
    } catch {
      tokenTemplate = null;
    }

    if (!tokenTemplate) return;

    const point = toCanvasCoords(event.clientX, event.clientY);
    if (!point) return;
    addToken(tokenTemplate, point.x, point.y);
  };

  const startTokenDrag = (tokenId: string) => {
    setDraggingTokenId(tokenId);
  };

  const saveDrawing = async () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    if (isCanvasEmpty(drawCanvas) && tokens.length === 0) {
      onSave("");
      return;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = CANVAS_WIDTH;
    exportCanvas.height = CANVAS_HEIGHT;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (showTemplate) {
      try {
        const templateImage = await loadImage(TEMPLATE_IMAGE_SRC);
        exportCtx.drawImage(templateImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } catch {
        // If template image fails to load, proceed with drawing layer and markers.
      }
    }

    exportCtx.drawImage(drawCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const token of tokens) {
      exportCtx.beginPath();
      exportCtx.arc(token.x, token.y, TOKEN_RADIUS, 0, Math.PI * 2);
      exportCtx.fillStyle = token.color;
      exportCtx.fill();
      exportCtx.lineWidth = 2;
      exportCtx.strokeStyle = "#111827";
      exportCtx.stroke();

      if (token.label) {
        exportCtx.fillStyle = token.type === "ball" ? "#111827" : "#ffffff";
        exportCtx.font = token.type === "ball" ? "bold 10px sans-serif" : "bold 20px sans-serif";
        exportCtx.textAlign = "center";
        exportCtx.textBaseline = "middle";
        exportCtx.fillText(token.label, token.x, token.y);
      }
    }

    onSave(exportCanvas.toDataURL("image/png"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Drill Whiteboard</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <Button
            type="button"
            variant={tool === "freehand" && !isEraser ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTool("freehand");
              setIsEraser(false);
            }}
          >
            Freehand
          </Button>
          <Button
            type="button"
            variant={tool === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTool("line");
              setIsEraser(false);
            }}
          >
            Line
          </Button>
          <Button
            type="button"
            variant={tool === "arrow" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTool("arrow");
              setIsEraser(false);
            }}
          >
            Arrow
          </Button>
          <Button
            type="button"
            variant={isEraser ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTool("freehand");
              setIsEraser(true);
            }}
          >
            Eraser
          </Button>
          <Button
            type="button"
            variant={lineStyle === "solid" ? "default" : "outline"}
            size="sm"
            onClick={() => setLineStyle("solid")}
          >
            Solid
          </Button>
          <Button
            type="button"
            variant={lineStyle === "dashed" ? "default" : "outline"}
            size="sm"
            onClick={() => setLineStyle("dashed")}
          >
            Dashed
          </Button>
          <input
            type="color"
            value={strokeColor}
            onChange={(event) => setStrokeColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
            aria-label="Pen color"
          />
          <Button type="button" variant="outline" size="sm" onClick={clearDrawing}>
            Clear
          </Button>
          <div className="flex flex-wrap items-center gap-2 border-l pl-2">
            <span className="text-xs text-muted-foreground">Drag/drop tokens:</span>
            {PALETTE_TOKENS.map((token, idx) => (
              <button
                key={`${token.type}-${token.label ?? token.color}-${idx}`}
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("application/json", JSON.stringify(token))}
                onClick={() => addToken(token)}
                aria-label={`Add ${token.title}`}
                className="h-6 w-6 rounded-full border border-slate-400"
                style={{ backgroundColor: token.color }}
                title={token.title}
              >
                {token.label ? <span className={`text-[9px] font-bold ${token.type === "ball" ? "text-slate-900" : "text-white"}`}>{token.label}</span> : null}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="modal-template-switch" className="text-xs sm:text-sm">Show Template</Label>
            <Switch
              id="modal-template-switch"
              checked={showTemplate}
              onCheckedChange={onShowTemplateChange}
            />
          </div>
        </div>

        <div
          ref={boardRef}
          className="relative w-full overflow-hidden rounded-md border bg-white"
          style={{ aspectRatio: "16 / 9" }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handlePaletteDrop}
        >
          <img
            src={TEMPLATE_IMAGE_SRC}
            alt="Volleyball court template"
            className={`absolute inset-0 h-full w-full object-contain ${showTemplate ? "block" : "hidden"}`}
            draggable={false}
          />
          <canvas
            ref={drawCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute inset-0 h-full w-full touch-none"
            onMouseDown={startDrawing}
            onMouseMove={(event) => {
              moveDrawing(event);
              if (tool === "line" || tool === "arrow") {
                const canvas = drawCanvasRef.current;
                if (!canvas) return;
                lastPointRef.current = getPoint(event, canvas);
              }
            }}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={(event) => {
              moveDrawing(event);
              if (tool === "line" || tool === "arrow") {
                const canvas = drawCanvasRef.current;
                if (!canvas) return;
                lastPointRef.current = getPoint(event, canvas);
              }
            }}
            onTouchEnd={endDrawing}
          />
          <div className="pointer-events-none absolute inset-0">
            {tokens.map((token) => (
              <div
                key={token.id}
                onPointerDown={() => startTokenDrag(token.id)}
                className="pointer-events-auto absolute cursor-grab rounded-full border-2 border-slate-900"
                style={{
                  left: `${(token.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(token.y / CANVAS_HEIGHT) * 100}%`,
                  width: `${(TOKEN_RADIUS * 2 * 100) / CANVAS_WIDTH}%`,
                  height: `${(TOKEN_RADIUS * 2 * 100) / CANVAS_HEIGHT}%`,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: tokenColorById[token.id],
                }}
              >
                {tokenLabelById[token.id] ? (
                  <span className={`flex h-full w-full items-center justify-center text-xs font-bold ${tokenTypeById[token.id] === "ball" ? "text-slate-900" : "text-white"}`}>
                    {tokenLabelById[token.id]}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={saveDrawing}>Save Whiteboard</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DrillWhiteboardModal;
