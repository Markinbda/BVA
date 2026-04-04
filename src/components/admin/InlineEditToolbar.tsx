import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminEditMode } from "@/contexts/AdminEditModeContext";
import { LayoutDashboard, Save, Send, Trash2, TreeDeciduous } from "lucide-react";

const InlineEditToolbar = () => {
  const { editMode, changes, saveDraft, publishChanges, discardChanges, hasUnsavedChanges } = useAdminEditMode();
  const [mapOpen, setMapOpen] = useState(false);

  if (!editMode) {
    return null;
  }

  return (
    <>
      <div className="inline-edit-toolbar fixed bottom-4 right-4 z-50 flex flex-col gap-3 rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutDashboard className="h-4 w-4" />
          <span>Edit Mode</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button size="sm" onClick={saveDraft} disabled={!hasUnsavedChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button size="sm" onClick={publishChanges} disabled={!hasUnsavedChanges}>
            <Send className="mr-2 h-4 w-4" />
            Publish
          </Button>
          <Button size="sm" variant="outline" onClick={discardChanges}>
            <Trash2 className="mr-2 h-4 w-4" />
            Discard
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMapOpen(true)}>
            <TreeDeciduous className="mr-2 h-4 w-4" />
            Page Map
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {hasUnsavedChanges ? `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}` : "No unsaved changes"}
        </div>
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="inline-edit-overlay absolute max-w-2xl !p-4">
          <DialogHeader>
            <DialogTitle>Page Structure Map</DialogTitle>
            <DialogDescription>Editable elements tracked on this page.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No editable changes have been tracked yet.</p>
            ) : (
              <div className="space-y-2">
                {changes.map((change) => (
                  <div key={change.id} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{change.label}</p>
                    <p className="text-xs text-muted-foreground">{change.selector}</p>
                    <p className="text-xs text-muted-foreground">Type: {change.type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setMapOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InlineEditToolbar;
