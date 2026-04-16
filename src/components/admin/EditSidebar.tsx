import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminEditMode, type EditChange } from "@/contexts/AdminEditModeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GalleryPicker from "@/components/admin/GalleryPicker";
import {
  ChevronRight,
  FileImage,
  ImagePlus,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Type,
  X,
} from "lucide-react";

// ── Config: which tags are editable ─────────────────────────────────────────
const TEXT_TAGS = ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BUTTON", "A", "SPAN"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const SKIP_SELECTORS = [
  ".inline-edit-sidebar",
  ".inline-edit-toolbar",
  "nav",
  "footer",
  ".admin-layout",
];

interface EditableItem {
  uid: string;
  type: "text" | "image";
  label: string;
  selector: string;
  currentValue: string;
}

// ── Stable CSS selector from element ────────────────────────────────────────
const safeEscape = (value: string) => {
  try { return CSS.escape(value); } catch { return value.replace(/[^a-zA-Z0-9_-]/g, "_"); }
};

const getSelector = (element: Element): string => {
  if (element.id) return `#${safeEscape(element.id)}`;
  const parts: string[] = [];
  let el: Element | null = element;
  while (el && el.tagName !== "HTML") {
    let part = el.tagName.toLowerCase();
    if (el.id) { parts.unshift(`#${safeEscape(el.id)}`); break; }
    // Only use first class if it contains only safe characters
    const firstClass = Array.from(el.classList)[0];
    if (firstClass && /^[a-zA-Z0-9_-]+$/.test(firstClass)) {
      part += `.${firstClass}`;
    }
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((s) => s.tagName === el!.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(el) + 1})`;
    }
    parts.unshift(part);
    el = el.parentElement;
  }
  return parts.join(" > ");
};

const safeQuerySelector = <T extends Element>(selector: string): T | null => {
  try { return document.querySelector<T>(selector); } catch { return null; }
};

const parseStoragePath = (src: string) => {
  try {
    const url = new URL(src);
    const marker = "/public/bva-images/";
    const idx = url.pathname.indexOf(marker);
    return idx === -1 ? null : url.pathname.substring(idx + marker.length);
  } catch { return null; }
};

const shouldSkip = (el: Element) =>
  SKIP_SELECTORS.some((sel) => el.closest(sel));

// ─────────────────────────────────────────────────────────────────────────────
const EditSidebar = () => {
  const { canEditContent, isAdmin } = useAuth();
  const canUseSidebar = canEditContent || isAdmin;
  const {
    editMode, setEditMode, changes, addChange,
    saveDraft, publishChanges, discardChanges, hasUnsavedChanges, registerRevertHandler,
  } = useAdminEditMode();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [selected, setSelected] = useState<EditableItem | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSaving, setImageSaving] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const selectorOverridesRef = useRef<Map<string, string>>(new Map());

  // ── Apply DOM changes ──────────────────────────────────────────────────────
  const applyChangesToDom = useCallback((changesToApply: EditChange[]) => {
    changesToApply.forEach((change) => {
      const el = safeQuerySelector(change.selector);
      if (!el) return;
      if (change.type === "text") (el as HTMLElement).innerHTML = change.updated;
      if (change.type === "image" && el instanceof HTMLImageElement) {
        el.src = change.updated;
        selectorOverridesRef.current.set(change.selector, change.updated);
      }
    });
  }, []);

  // ── Load published changes on route change ─────────────────────────────────
  useEffect(() => {
    if (!canUseSidebar) return;
    selectorOverridesRef.current.clear();
    const pagePath = location.pathname;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("content_edit_versions")
        .select("changes")
        .eq("page_path", pagePath)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data?.changes) return;
      const saved = data.changes as EditChange[];
      saved.forEach((c) => { if (c.type === "image") selectorOverridesRef.current.set(c.selector, c.updated); });
      requestAnimationFrame(() => requestAnimationFrame(() => applyChangesToDom(saved)));
    };
    load();
  }, [canUseSidebar, location.pathname, applyChangesToDom]);

  // ── Revert handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canUseSidebar) return;
    registerRevertHandler((changesToRevert) => {
      changesToRevert.forEach((c) => {
        const el = safeQuerySelector(c.selector);
        if (!el) return;
        if (c.type === "text") (el as HTMLElement).innerHTML = c.original;
        if (c.type === "image" && el instanceof HTMLImageElement) {
          el.src = c.original;
          selectorOverridesRef.current.delete(c.selector);
        }
      });
    });
  }, [canUseSidebar, registerRevertHandler]);

  // ── Scan page for editable elements ───────────────────────────────────────
  const scanPage = useCallback(() => {
    const found: EditableItem[] = [];
    const seen = new Set<Element>();

    // Text elements
    const textEls = document.querySelectorAll<HTMLElement>(TEXT_TAGS.map((t) => `body ${t.toLowerCase()}`).join(","));
    textEls.forEach((el) => {
      if (seen.has(el) || shouldSkip(el)) return;
      const text = el.textContent?.trim() ?? "";
      if (!text || text.length < 2) return;
      seen.add(el);
      const uid = `text-${found.length}`;
      found.push({
        uid,
        type: "text",
        label: text.slice(0, 60) + (text.length > 60 ? "…" : ""),
        selector: getSelector(el),
        currentValue: el.innerHTML,
      });
    });

    // Images
    const imgEls = document.querySelectorAll<HTMLImageElement>("body img");
    imgEls.forEach((el) => {
      if (seen.has(el) || shouldSkip(el)) return;
      if (el.width < 50 || el.height < 50) return; // skip tiny icons
      seen.add(el);
      const uid = `img-${found.length}`;
      found.push({
        uid,
        type: "image",
        label: el.alt || el.src.split("/").pop() || "Image",
        selector: getSelector(el),
        currentValue: el.src,
      });
    });

    setItems(found);
  }, []);

  // Scan when edit mode turns on or route changes
  useEffect(() => {
    if (!canUseSidebar) return;
    if (editMode && open) {
      const timer = setTimeout(scanPage, 200);
      return () => clearTimeout(timer);
    }
    if (!editMode) setSelected(null);
  }, [canUseSidebar, editMode, open, location.pathname, scanPage]);

  // ── Click-to-edit: clicking any element in edit mode opens sidebar ─────────
  useEffect(() => {
    if (!canUseSidebar) return;
    if (!editMode) return;

    const TEXT_SELECTOR = TEXT_TAGS.map((t) => `body ${t.toLowerCase()}`).join(",");

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target) return;

      // Don't intercept sidebar itself
      if (target.closest(".inline-edit-sidebar")) return;

      // Match text element
      const textEl = target.closest(TEXT_SELECTOR) as HTMLElement | null;
      const imgEl = target instanceof HTMLImageElement ? target : target.closest("img") as HTMLImageElement | null;

      let matched: EditableItem | null = null;

      if (imgEl && !shouldSkip(imgEl) && imgEl.width >= 50 && imgEl.height >= 50) {
        e.preventDefault();
        e.stopPropagation();
        const selector = getSelector(imgEl);
        matched = {
          uid: `click-img-${Date.now()}`,
          type: "image",
          label: imgEl.alt || imgEl.src.split("/").pop() || "Image",
          selector,
          currentValue: imgEl.src,
        };
      } else if (textEl && !shouldSkip(textEl)) {
        const text = textEl.textContent?.trim() ?? "";
        if (text.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          const selector = getSelector(textEl);
          matched = {
            uid: `click-text-${Date.now()}`,
            type: "text",
            label: text.slice(0, 60) + (text.length > 60 ? "…" : ""),
            selector,
            currentValue: textEl.innerHTML,
          };
        }
      }

      if (matched) {
        // Open sidebar and scan if not already open
        setOpen(true);
        if (items.length === 0) {
          setTimeout(() => {
            scanPage();
          }, 200);
        }
        // Select the clicked item
        setSelected(matched);
        setTextDraft(matched.currentValue);
        setImagePreview(matched.type === "image" ? matched.currentValue : null);
        setImageFile(null);
      }
    };

    // Add edit-mode cursor style
    const style = document.createElement("style");
    style.id = "edit-mode-cursor";
    style.textContent = `body *:not(.inline-edit-sidebar):not(.inline-edit-sidebar *) { cursor: crosshair !important; }`;
    document.head.appendChild(style);

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.getElementById("edit-mode-cursor")?.remove();
    };
  }, [canUseSidebar, editMode, items.length, scanPage]);

  // ── Highlight selected element on page ────────────────────────────────────
  useEffect(() => {
    if (!canUseSidebar) return;
    // Remove old highlight
    if (highlightRef.current) {
      highlightRef.current.remove();
      highlightRef.current = null;
    }
    if (!selected) return;
    const target = safeQuerySelector(selected.selector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const div = document.createElement("div");
    div.style.cssText = `
      position: fixed;
      top: ${rect.top - 4}px;
      left: ${rect.left - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 2px solid #3b82f6;
      border-radius: 6px;
      pointer-events: none;
      z-index: 9000;
      animation: editPulse 1.5s infinite;
      box-shadow: 0 0 0 4px rgba(59,130,246,0.15);
    `;
    document.body.appendChild(div);
    highlightRef.current = div;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => { div.remove(); highlightRef.current = null; };
  }, [selected]);

  // ── Inject pulse animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!canUseSidebar) return;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes editPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // ── Select an item ─────────────────────────────────────────────────────────
  const selectItem = (item: EditableItem) => {
    // Refresh current value from DOM
    const liveEl = safeQuerySelector(item.selector);
    const currentValue = item.type === "text"
      ? (liveEl as HTMLElement | null)?.innerHTML ?? item.currentValue
      : (liveEl instanceof HTMLImageElement ? liveEl.src : item.currentValue);

    const refreshed = { ...item, currentValue };
    setSelected(refreshed);
    setTextDraft(currentValue);
    setImagePreview(item.type === "image" ? currentValue : null);
    setImageFile(null);
  };

  // ── Save text change ───────────────────────────────────────────────────────
  const applyTextChange = () => {
    if (!selected) return;
    const el = safeQuerySelector<HTMLElement>(selected.selector);
    if (!el) return;
    const original = el.innerHTML;
    el.innerHTML = textDraft;
    addChange({
      id: `${selected.selector}-${Date.now()}`,
      type: "text",
      selector: selected.selector,
      label: selected.label,
      original,
      updated: textDraft,
    });
    setSelected(null);
  };

  // ── Image file pick ────────────────────────────────────────────────────────
  const handleImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { alert("Only JPG, PNG, WEBP, SVG allowed."); return; }
    if (file.size > MAX_IMAGE_SIZE) { alert("Max image size is 5 MB."); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ── Upload and save image change ───────────────────────────────────────────
  const applyImageChange = async () => {
    if (!selected || !imageFile) return;
    setImageSaving(true);
    const oldSrc = safeQuerySelector<HTMLImageElement>(selected.selector)?.src ?? selected.currentValue;
    const path = parseStoragePath(oldSrc) || `inline-edits/${Date.now()}.${imageFile.name.split(".").pop()}`;
    const { error: uploadErr } = await supabase.storage.from("bva-images").upload(path, imageFile, { upsert: true });
    if (uploadErr) { alert(`Upload failed: ${uploadErr.message}`); setImageSaving(false); return; }
    const { data } = supabase.storage.from("bva-images").getPublicUrl(path);
    const newUrl = data.publicUrl;
    const el = safeQuerySelector<HTMLImageElement>(selected.selector);
    if (el) { el.src = newUrl; selectorOverridesRef.current.set(selected.selector, newUrl); }
    addChange({
      id: `${selected.selector}-${Date.now()}`,
      type: "image",
      selector: selected.selector,
      label: selected.label,
      original: oldSrc,
      updated: newUrl,
    });
    setImageSaving(false);
    setImagePreview(newUrl);
    setImageFile(null);
    setSelected(null);
  };

  // ── Apply gallery-picked image directly ────────────────────────────────────
  const applyGalleryImage = (url: string) => {
    if (!selected) return;
    const oldSrc = safeQuerySelector<HTMLImageElement>(selected.selector)?.src ?? selected.currentValue;
    const el = safeQuerySelector<HTMLImageElement>(selected.selector);
    if (el) { el.src = url; selectorOverridesRef.current.set(selected.selector, url); }
    addChange({
      id: `${selected.selector}-${Date.now()}`,
      type: "image",
      selector: selected.selector,
      label: selected.label,
      original: oldSrc,
      updated: url,
    });
    setImagePreview(url);
    setImageFile(null);
    setSelected(null);
    setGalleryPickerOpen(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Gate: only show for admins / content editors
  if (!canUseSidebar) return null;

  return (
    <>
      <GalleryPicker
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onSelect={applyGalleryImage}
        folder="inline-edits"
      />
      {/* Tab trigger when sidebar is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="inline-edit-sidebar fixed right-0 top-1/2 -translate-y-1/2 z-[9999] flex items-center gap-1 rounded-l-lg bg-primary px-2 py-3 text-xs font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          style={{ writingMode: "vertical-rl" }}
          aria-label="Open edit sidebar"
        >
          <Pencil className="h-3 w-3 mb-1" style={{ transform: "rotate(90deg)" }} />
          Edit
        </button>
      )}

      {/* Sidebar panel */}
      {open && (
        <div className="inline-edit-sidebar fixed right-0 top-0 h-full w-80 z-[9999] flex flex-col border-l border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">Page Editor</span>
            </div>
            <button onClick={() => { setOpen(false); setSelected(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Edit mode toggle */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">Edit Mode</span>
            <button
              onClick={() => {
                setEditMode(!editMode);
                setSelected(null);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editMode ? "bg-primary" : "bg-muted"}`}
              aria-pressed={editMode}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editMode ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto">
            {!editMode ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                <Pencil className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Toggle Edit Mode on to start editing page content.</p>
              </div>
            ) : selected ? (
              /* ── Item editor ── */
              <div className="p-4 space-y-4">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-3 w-3 rotate-180" />
                  Back to list
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {selected.type === "text"
                      ? <Type className="h-4 w-4 text-blue-500" />
                      : <FileImage className="h-4 w-4 text-green-500" />
                    }
                    <span className="text-sm font-medium text-foreground truncate">{selected.label}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{selected.type === "text" ? "Text" : "Image"}</Badge>
                </div>

                {selected.type === "text" ? (
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">Edit content — plain text or HTML</Label>
                    <Textarea
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      rows={8}
                      className="text-sm font-mono"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={applyTextChange}>Apply Change</Button>
                      <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="w-full rounded-lg border border-border object-cover max-h-48" />
                    )}
                    <Label className="text-xs text-muted-foreground">Replace this image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.svg"
                      onChange={handleImageFile}
                      className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setGalleryPickerOpen(true)}>
                        Choose from Gallery
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={applyImageChange} disabled={!imageFile || imageSaving}>
                        {imageSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ImagePlus className="mr-2 h-3 w-3" />}
                        Upload & Apply
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Item list ── */
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {items.length} element{items.length !== 1 ? "s" : ""} found
                  </span>
                  <button onClick={scanPage} className="text-muted-foreground hover:text-foreground" title="Refresh list">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">No editable elements found. Try refreshing.</p>
                ) : (
                  items.map((item) => {
                    const hasChange = changes.some((c) => c.selector === item.selector);
                    return (
                      <button
                        key={item.uid}
                        onClick={() => selectItem(item)}
                        className="w-full text-left flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <span className="mt-0.5 shrink-0">
                          {item.type === "text"
                            ? <Type className="h-3.5 w-3.5 text-blue-500" />
                            : <FileImage className="h-3.5 w-3.5 text-green-500" />
                          }
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-foreground truncate">{item.label}</span>
                          <span className="block text-[10px] text-muted-foreground/60 truncate">{item.selector}</span>
                        </span>
                        {hasChange && <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-primary mt-1.5" title="Changed" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer: save/publish/discard */}
          {editMode && (
            <div className="border-t border-border p-3 space-y-2">
              {hasUnsavedChanges && (
                <p className="text-xs text-center text-muted-foreground">
                  {changes.length} unsaved change{changes.length !== 1 ? "s" : ""}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" onClick={saveDraft} disabled={!hasUnsavedChanges} title="Save Draft">
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" onClick={publishChanges} disabled={!hasUnsavedChanges} title="Publish" className="col-span-1">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Publish
                </Button>
                <Button size="sm" variant="ghost" onClick={discardChanges} disabled={!hasUnsavedChanges} title="Discard">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default EditSidebar;
