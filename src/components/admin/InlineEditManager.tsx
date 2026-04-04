import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminEditMode, type EditChange } from "@/contexts/AdminEditModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ImagePlus } from "lucide-react";

const TEXT_TAGS = ["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "LABEL", "BUTTON", "A", "SMALL"];
const BLOCK_TAGS = ["SECTION", "ARTICLE", "HEADER", "FOOTER", "ASIDE", "DIV"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const getDomSelector = (element: Element) => {
  if (!element) return "";
  if (element.id) return `#${element.id}`;

  const parts: string[] = [];
  let el: Element | null = element;

  while (el && el.nodeType === 1 && el.tagName !== "HTML") {
    let part = el.tagName.toLowerCase();
    if (el.classList.length > 0) {
      const className = Array.from(el.classList)[0];
      if (className) part += `.${className}`;
    }
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((s) => s.tagName === el!.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(el) + 1})`;
      }
    }
    parts.unshift(part);
    el = el.parentElement;
  }

  return parts.join(" > ");
};

const parseStoragePath = (src: string) => {
  try {
    const url = new URL(src);
    const marker = "/public/bva-images/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return url.pathname.substring(index + marker.length);
  } catch {
    return null;
  }
};

const InlineEditManager = () => {
  const { editMode, addChange, registerRevertHandler } = useAdminEditMode();
  const location = useLocation();

  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [activeTextTarget, setActiveTextTarget] = useState<HTMLElement | null>(null);
  const [textEditorHtml, setTextEditorHtml] = useState("");
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [activeImageTarget, setActiveImageTarget] = useState<HTMLImageElement | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSaving, setImageSaving] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Element | null>(null);
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [blockItems, setBlockItems] = useState<Array<{ selector: string; label: string; type: "text" | "image"; value: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Tracks image overrides by selector -> url (covers both session edits and persisted loads)
  const selectorOverridesRef = useRef<Map<string, string>>(new Map());

  // Apply a list of changes to the DOM
  const applyChangesToDom = useCallback((changes: EditChange[]) => {
    changes.forEach((change) => {
      const el = document.querySelector(change.selector);
      if (!el) return;
      if (change.type === "text") {
        (el as HTMLElement).innerHTML = change.updated;
      } else if (change.type === "image" && el instanceof HTMLImageElement) {
        el.src = change.updated;
        selectorOverridesRef.current.set(change.selector, change.updated);
      }
    });
  }, []);

  // Load and apply the latest published changes for the current page
  useEffect(() => {
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
      const changes = data.changes as EditChange[];

      // Pre-register image selectors so MutationObserver can re-apply them immediately
      changes.forEach((c) => {
        if (c.type === "image") selectorOverridesRef.current.set(c.selector, c.updated);
      });

      // Wait for page content to render before applying
      requestAnimationFrame(() => requestAnimationFrame(() => applyChangesToDom(changes)));
    };

    // Clear old overrides from previous page
    selectorOverridesRef.current.clear();
    load();
  }, [location.pathname, applyChangesToDom]);

  // MutationObserver: re-apply image overrides whenever React resets src attributes
  useEffect(() => {
    const reapply = () => {
      selectorOverridesRef.current.forEach((url, selector) => {
        const el = document.querySelector(selector);
        if (el instanceof HTMLImageElement && el.src !== url) {
          el.src = url;
        }
      });
    };
    const observer = new MutationObserver(reapply);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => observer.disconnect();
  }, []);

  const handleTextClick = useCallback(
    (target: HTMLElement) => {
      setActiveTextTarget(target);
      setTextEditorHtml(target.innerHTML);
      setTextEditorOpen(true);
    },
    [setTextEditorOpen]
  );

  const handleImageClick = useCallback(
    (target: HTMLImageElement) => {
      setActiveImageTarget(target);
      setImagePreview(target.src);
      setImageFile(null);
      setImageEditorOpen(true);
    },
    [setImageEditorOpen]
  );

  const handleBlockClick = useCallback((target: Element) => {
    const block = target.closest(BLOCK_TAGS.join(","));
    if (!block) return;
    setSelectedBlock(block);
    const texts = Array.from(block.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,li,label,button,a,small"));
    const images = Array.from(block.querySelectorAll("img"));
    setBlockItems([
      ...texts.map((item) => ({
        selector: getDomSelector(item),
        label: item.textContent?.trim().slice(0, 40) || item.tagName.toLowerCase(),
        type: "text" as const,
        value: item.innerHTML,
      })),
      ...images.map((img) => ({
        selector: getDomSelector(img),
        label: `Image: ${img.alt || img.src.split("/").pop()}`,
        type: "image" as const,
        value: img.src,
      })),
    ]);
    setBlockEditorOpen(true);
  }, []);

  const applyTextChange = () => {
    if (!activeTextTarget) return;
    const selector = getDomSelector(activeTextTarget);
    const original = activeTextTarget.innerHTML;
    activeTextTarget.innerHTML = textEditorHtml;
    addChange({
      id: `${selector}-${Date.now()}`,
      type: "text",
      selector,
      label: `${activeTextTarget.tagName.toLowerCase()} text`,
      original,
      updated: textEditorHtml,
    });
    setTextEditorOpen(false);
  };

  const handleImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      window.alert("Only JPG, PNG, WEBP, and SVG image types are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      window.alert("Image file must be smaller than 5 MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const publishImageChange = async () => {
    if (!activeImageTarget || !imageFile) return;
    setImageSaving(true);
    const oldSrc = activeImageTarget.src;
    const path = parseStoragePath(oldSrc) || `inline-edits/${Date.now()}.${imageFile.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("bva-images").upload(path, imageFile, { upsert: true });
    if (uploadError) {
      window.alert(`Upload failed: ${uploadError.message}`);
      setImageSaving(false);
      return;
    }
    const { data } = supabase.storage.from("bva-images").getPublicUrl(path);
    const newUrl = data.publicUrl;
    const selector = getDomSelector(activeImageTarget);
    activeImageTarget.src = newUrl;
    selectorOverridesRef.current.set(selector, newUrl);
    setImagePreview(newUrl);
    addChange({
      id: `${selector}-${Date.now()}`,
      type: "image",
      selector,
      label: `image ${activeImageTarget.alt || ""}`,
      original: oldSrc,
      updated: newUrl,
    });
    setImageSaving(false);
    setImageEditorOpen(false);
  };

  const closeBlockEditor = () => {
    setSelectedBlock(null);
    setBlockEditorOpen(false);
    setBlockItems([]);
  };

  const handleTextToolbar = (command: string) => {
    if (!editorRef.current) return;
    document.execCommand(command);
    editorRef.current.focus();
  };

  const handleDocumentClick = useCallback(
    (event: MouseEvent) => {
      if (!editMode) return;
      const target = event.target as HTMLElement;
      if (!target || target.closest(".inline-edit-overlay") || target.closest(".inline-edit-toolbar")) return;

      const image = target.closest("img");
      if (image && image instanceof HTMLImageElement) {
        event.preventDefault();
        handleImageClick(image);
        return;
      }

      const text = target.closest(TEXT_TAGS.join(","));
      if (text && text instanceof HTMLElement && text.textContent?.trim().length) {
        event.preventDefault();
        handleTextClick(text);
        return;
      }

      const block = target.closest(BLOCK_TAGS.join(","));
      if (block instanceof HTMLElement && block.querySelector("p, h1, h2, h3, img")) {
        event.preventDefault();
        handleBlockClick(block);
      }
    },
    [editMode, handleImageClick, handleTextClick, handleBlockClick]
  );

  const revertChanges = (changesToRevert: EditChange[]) => {
    changesToRevert.forEach((change) => {
      const element = document.querySelector(change.selector);
      if (!element) return;
      if (change.type === "text") {
        (element as HTMLElement).innerHTML = change.original;
      }
      if (change.type === "image" && element instanceof HTMLImageElement) {
        element.src = change.original;
        selectorOverridesRef.current.delete(change.selector);
      }
    });
  };

  useEffect(() => {
    registerRevertHandler(revertChanges);
  }, [registerRevertHandler]);

  useEffect(() => {
    const textSelectors = TEXT_TAGS.map((tag) => `body.inline-edit-mode ${tag.toLowerCase()}`).join(",\n      ");
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      ${textSelectors} {
        outline: 2px dashed rgba(59, 130, 246, 0.7);
        cursor: pointer;
      }
      body.inline-edit-mode img {
        outline: 2px dashed rgba(16, 185, 129, 0.8);
        cursor: pointer;
      }
      body.inline-edit-mode section,
      body.inline-edit-mode article,
      body.inline-edit-mode header,
      body.inline-edit-mode footer,
      body.inline-edit-mode aside,
      body.inline-edit-mode div {
        outline: 1px dashed rgba(229, 231, 235, 0.9);
      }
    `;
    document.head.appendChild(styleElement);
    return () => { document.head.removeChild(styleElement); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("inline-edit-mode", editMode);
    if (!editMode) {
      setTextEditorOpen(false);
      setImageEditorOpen(false);
      setBlockEditorOpen(false);
    }
  }, [editMode]);

  useEffect(() => {
    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [handleDocumentClick]);

  return (
    <>
      <Dialog open={textEditorOpen} onOpenChange={setTextEditorOpen}>
        <DialogContent className="inline-edit-overlay absolute max-w-3xl !p-4">
          <DialogHeader>
            <DialogTitle>Edit Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleTextToolbar("bold")}><strong>B</strong></Button>
              <Button size="sm" onClick={() => handleTextToolbar("italic")}><em>I</em></Button>
              <Button size="sm" onClick={() => handleTextToolbar("underline")}><u>U</u></Button>
              <Button size="sm" onClick={() => handleTextToolbar("insertUnorderedList")}>&bull; List</Button>
              <Button size="sm" onClick={() => handleTextToolbar("insertOrderedList")}>&#35; List</Button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[180px] rounded-lg border border-border p-3 bg-background text-sm text-foreground"
              onInput={(event) => setTextEditorHtml((event.target as HTMLElement).innerHTML)}
              dangerouslySetInnerHTML={{ __html: textEditorHtml }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTextEditorOpen(false)}>Cancel</Button>
              <Button onClick={applyTextChange}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={imageEditorOpen} onOpenChange={setImageEditorOpen}>
        <DialogContent className="inline-edit-overlay absolute max-w-2xl !p-4">
          <DialogHeader>
            <DialogTitle>Replace Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg border border-border object-contain max-h-64" />
            )}
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.svg" onChange={handleImageFile} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImageEditorOpen(false)}>Cancel</Button>
              <Button onClick={publishImageChange} disabled={!imageFile || imageSaving}>
                {imageSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                Confirm Replace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={blockEditorOpen} onOpenChange={setBlockEditorOpen}>
        <DialogContent className="inline-edit-overlay absolute max-w-3xl !p-4">
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBlock ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Edit text and image elements within the selected section.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {blockItems.map((item) => (
                    <div key={item.selector} className="rounded-lg border border-border p-3">
                      <p className="font-medium text-foreground">{item.label}</p>
                      {item.type === "text" ? (
                        <textarea
                          className="mt-2 w-full rounded-md border border-border p-2 text-sm"
                          rows={3}
                          value={item.value}
                          onChange={(event) => {
                            setBlockItems((current) =>
                              current.map((existing) =>
                                existing.selector === item.selector ? { ...existing, value: event.target.value } : existing
                              )
                            );
                          }}
                        />
                      ) : (
                        <div className="mt-2 space-y-2">
                          <img src={item.value} alt={item.label} className="h-36 w-full object-contain rounded-md border border-border" />
                          <Button size="sm" onClick={() => fileInputRef.current?.click()}>Replace image</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={closeBlockEditor}>Cancel</Button>
                  <Button onClick={() => {
                    blockItems.forEach((item) => {
                      const element = document.querySelector(item.selector);
                      if (!element || item.type !== "text") return;
                      const original = (element as HTMLElement).innerHTML;
                      (element as HTMLElement).innerHTML = item.value;
                      addChange({
                        id: `${item.selector}-${Date.now()}`,
                        type: "text",
                        selector: item.selector,
                        label: item.label,
                        original,
                        updated: item.value,
                      });
                    });
                    closeBlockEditor();
                  }}>Save Block</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to find the block to edit.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InlineEditManager;
