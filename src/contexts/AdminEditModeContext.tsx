import { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type EditChangeType = "text" | "image" | "block";

export interface EditChange {
  id: string;
  type: EditChangeType;
  selector: string;
  label: string;
  original: string;
  updated: string;
  meta?: Record<string, unknown>;
}

interface AdminEditModeContextValue {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  canEditContent: boolean;
  permissions: string[];
  changes: EditChange[];
  addChange: (change: EditChange) => void;
  saveDraft: () => Promise<void>;
  publishChanges: () => Promise<void>;
  discardChanges: () => void;
  hasUnsavedChanges: boolean;
  registerRevertHandler: (handler: (changes: EditChange[]) => void) => void;
}

const AdminEditModeContext = createContext<AdminEditModeContextValue | undefined>(undefined);

export const useAdminEditMode = () => {
  const context = useContext(AdminEditModeContext);
  if (!context) {
    throw new Error("useAdminEditMode must be used within AdminEditModeProvider");
  }
  return context;
};

export const AdminEditModeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, canEditContent, permissions } = useAuth();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [changes, setChanges] = useState<EditChange[]>([]);
  const [revertHandler, setRevertHandler] = useState<((changes: EditChange[]) => void) | null>(null);
  const [saving, setSaving] = useState(false);

  const addChange = (change: EditChange) => {
    setChanges((previous) => {
      const existing = previous.find((item) => item.selector === change.selector && item.type === change.type);
      if (existing) {
        return previous.map((item) =>
          item.selector === change.selector && item.type === change.type ? { ...item, updated: change.updated, meta: change.meta } : item
        );
      }
      return [...previous, change];
    });
  };

  const saveSnapshot = async (status: "draft" | "published") => {
    if (!user || changes.length === 0) {
      toast({ title: "No changes to save", variant: "default" });
      return;
    }

    setSaving(true);
    const pagePath = typeof window !== "undefined" ? window.location.pathname : "/";

    const { error } = await supabase.from<any>("content_edit_versions").insert([
      {
        page_path: pagePath,
        editor_id: user.id,
        status,
        changes,
      },
    ]);

    setSaving(false);

    if (error) {
      toast({ title: "Failed to save changes", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: status === "draft" ? "Draft saved" : "Changes published", variant: "default" });
    if (status === "published") {
      setChanges([]);
    }
  };

  const saveDraft = async () => saveSnapshot("draft");
  const publishChanges = async () => saveSnapshot("published");

  const discardChanges = () => {
    if (revertHandler) {
      revertHandler(changes);
    }
    setChanges([]);
  };

  const registerRevertHandler = (handler: (changes: EditChange[]) => void) => {
    setRevertHandler(() => handler);
  };

  useEffect(() => {
    const handleUnload = (event: BeforeUnloadEvent) => {
      if (changes.length > 0) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [changes.length]);

  return (
    <AdminEditModeContext.Provider
      value={{
        editMode,
        setEditMode,
        canEditContent,
        permissions,
        changes,
        addChange,
        saveDraft,
        publishChanges,
        discardChanges,
        hasUnsavedChanges: changes.length > 0,
        registerRevertHandler,
      }}
    >
      {children}
    </AdminEditModeContext.Provider>
  );
};
