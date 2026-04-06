import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  History,
  ImagePlus,
  Loader2,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const IMAGE_BUCKET = "bva-images";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const LARGE_IMAGE_BYTES = 2 * 1024 * 1024;
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

interface StorageFile {
  name: string;
  id?: string;
  updated_at: string;
  created_at?: string;
  metadata?: { size?: number };
  path: string;
}

interface ImageItem {
  path: string;
  name: string;
  folder: string;
  page: string;
  section: string;
  url: string;
  type: string;
  size: number;
  updatedAt: string;
  used: boolean;
}

interface VersionItem {
  path: string;
  name: string;
  url: string;
  size: number;
  updatedAt: string;
}

interface PendingReplacement {
  image: ImageItem;
  file: File;
  previewUrl: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const normalizeHumanText = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const inferPageLabel = (folder: string, fileName: string) => {
  const lowerName = fileName.toLowerCase();
  switch (folder) {
    case "gallery":
      return "Gallery Page";
    case "events":
      return "Events Page";
    case "news":
      return "News Page";
    case "pages":
      return "Page Content";
    case "sponsors":
      return "Sponsors";
    case "general":
      return "Site Assets";
    default:
      if (/hero|banner/.test(lowerName)) return "Home Page";
      if (/registration|register|signup|header/.test(lowerName)) return "Registration Page";
      if (/profile|avatar|default-profile/.test(lowerName)) return "Profile Page";
      if (/medal|gold|silver|bronze|team|history/.test(lowerName)) return "Season History Page";
      if (/gallery|event|photo/.test(lowerName)) return "Gallery Page";
      if (/contact|footer|logo/.test(lowerName)) return "Home Page";
      return "Uncategorized";
  }
};

const inferSectionLabel = (folder: string, fileName: string) => {
  const lowerName = fileName.toLowerCase();
  if (/hero|banner/.test(lowerName)) return "Hero Banner";
  if (/team|photo/.test(lowerName)) return "Team Photos";
  if (/icon(s)?/.test(lowerName)) return "Icons";
  if (/background|bg/.test(lowerName)) return "Backgrounds";
  if (/thumb|thumbnail/.test(lowerName)) return "Thumbnails";
  if (/logo/.test(lowerName)) return "Logo";
  if (/profile|avatar/.test(lowerName)) return "Profile Picture";
  if (/medal|gold|silver|bronze/.test(lowerName)) return "Medal Icon";
  if (/banner/.test(lowerName)) return "Banner";
  if (/header/.test(lowerName)) return "Header Image";
  return normalizeHumanText(fileName.replace(/\.[^/.]+$/, ""));
};

const getVersionFolder = (path: string) => {
  const withoutExt = path.replace(/\.[^/.]+$/, "");
  return `versions/${withoutExt}`;
};

const isLikelyDirectory = (name: string) => !/\.[^./]+$/.test(name);

const AdminImageManager = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [dimensions, setDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [pageFilter, setPageFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [largeOnly, setLargeOnly] = useState(false);
  const [iconsOnly, setIconsOnly] = useState(false);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [expandedPages, setExpandedPages] = useState<string[]>([]);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [versionMap, setVersionMap] = useState<Record<string, VersionItem[]>>({});
  const [activeReplacementImage, setActiveReplacementImage] = useState<ImageItem | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<{ file: File; previewUrl: string } | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadReferencedUrls = async () => {
    const referenced = new Set<string>();
    const references = [
      { table: "news_articles", field: "image_url" },
      { table: "events", field: "image_url" },
      { table: "gallery_photos", field: "image_url" },
      { table: "sponsors", field: "logo_url" },
      { table: "profiles", field: "avatar_url" },
    ];

    await Promise.all(
      references.map(async ({ table, field }) => {
        const result = await supabase.from<any, any>(table as any).select(field as any);
        const rows = (result.data as unknown) as Array<Record<string, unknown>> | null;
        rows?.forEach((row) => {
          const value = row[field as string];
          if (typeof value === "string" && value.length > 0) {
            referenced.add(value);
          }
        });
      })
    );

    return referenced;
  };

  const listBucketFiles = async (path = ""): Promise<StorageFile[]> => {
    const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(path, { limit: 1000 });
    if (error) {
      throw new Error(error.message);
    }

    const files: StorageFile[] = [];
    for (const item of data) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if (isLikelyDirectory(item.name)) {
        files.push(...(await listBucketFiles(itemPath)));
      } else {
        files.push({ ...item, path: itemPath });
      }
    }
    return files;
  };

  const loadImages = async () => {
    setLoading(true);
    try {
      const referenced = await loadReferencedUrls();
      const files = await listBucketFiles();
      const prepared = files
        .filter((file) => !file.path.startsWith("versions/"))
        .map((file) => {
          const folder = file.path.includes("/") ? file.path.split("/")[0] : "root";
          const name = file.path.substring(file.path.lastIndexOf("/") + 1);
          const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(file.path);
          const url = data.publicUrl;
          const type = name.split(".").pop()?.toUpperCase() ?? "UNKNOWN";
          const rawSize = file.metadata?.size ?? 0;
          const used = Array.from(referenced).some((value) =>
            value.includes(file.path) || value.includes(url) || value.includes(name)
          );

          return {
            path: file.path,
            name,
            folder,
            page: inferPageLabel(folder, name),
            section: inferSectionLabel(folder, name),
            url,
            type,
            size: rawSize,
            updatedAt: file.updated_at,
            used,
          } as ImageItem;
        })
        .sort((a, b) => a.page.localeCompare(b.page) || a.name.localeCompare(b.name));
      setImages(prepared);
    } catch (error) {
      toast({
        title: "Failed to load images",
        description: error instanceof Error ? error.message : "Unable to fetch storage images.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const filteredImages = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return images.filter((image) => {
      if (pageFilter !== "All" && image.page !== pageFilter) return false;
      if (sectionFilter !== "All" && image.section !== sectionFilter) return false;
      if (typeFilter !== "All" && image.type !== typeFilter) return false;
      if (largeOnly && image.size < LARGE_IMAGE_BYTES) return false;
      if (iconsOnly && !/icon|logo|svg/i.test(image.name) && !/Icons/.test(image.section)) return false;
      if (unusedOnly && image.used) return false;
      if (recentOnly && Date.now() - new Date(image.updatedAt).getTime() > RECENT_MS) return false;
      if (!term) return true;
      const content = [image.name, image.page, image.section, image.type, image.updatedAt]
        .join(" ")
        .toLowerCase();
      return content.includes(term);
    });
  }, [images, pageFilter, sectionFilter, typeFilter, largeOnly, iconsOnly, unusedOnly, recentOnly, searchTerm]);

  const pageOptions = useMemo(
    () => ["All", ...Array.from(new Set(images.map((image) => image.page))).sort()],
    [images]
  );

  const sectionOptions = useMemo(
    () => ["All", ...Array.from(new Set(images.map((image) => image.section))).sort()],
    [images]
  );

  const typeOptions = useMemo(
    () => ["All", ...Array.from(new Set(images.map((image) => image.type))).sort()],
    [images]
  );

  const groupedImages = useMemo(() => {
    return filteredImages.reduce<Record<string, ImageItem[]>>((groups, image) => {
      groups[image.page] = groups[image.page] || [];
      groups[image.page].push(image);
      return groups;
    }, {});
  }, [filteredImages]);

  const openReplaceDialog = (image: ImageItem) => {
    setActiveReplacementImage(image);
    setPendingReplacement(null);
    setReplaceDialogOpen(false);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const image = activeReplacementImage;
    if (!file || !image) {
      event.target.value = "";
      setActiveReplacementImage(null);
      setPendingReplacement(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Only JPG, PNG, WEBP, and SVG files are allowed.",
        variant: "destructive",
      });
      event.target.value = "";
      setActiveReplacementImage(null);
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      toast({
        title: "File too large",
        description: "Image must be under 5 MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingReplacement({ file, previewUrl });
    setReplaceDialogOpen(true);
  };

  const logAudit = async (action: string, targetPath: string, details: string) => {
    try {
      await supabase.from<any, any>("admin_audit_logs" as any).insert([
        {
          user_id: user?.id,
          action,
          target_path: targetPath,
          details,
        },
      ] as any);
    } catch {
      // Don't block the user flow if audit logging is not available.
    }
  };

  const createBackupVersion = async (image: ImageItem) => {
    try {
      const { data: currentFile, error: downloadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .download(image.path);
      if (downloadError || !currentFile) {
        return;
      }

      const extension = image.name.split(".").pop() || "";
      const backupPath = `${getVersionFolder(image.path)}/${Date.now()}.${extension}`;
      await supabase.storage.from(IMAGE_BUCKET).upload(backupPath, currentFile, { upsert: true });

      const versionDir = getVersionFolder(image.path);
      const { data: versions } = await supabase.storage.from(IMAGE_BUCKET).list(versionDir, { limit: 1000 });
      if (versions && versions.length > 5) {
        const sorted = versions
          .filter((item) => !isLikelyDirectory(item.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        const removePaths = sorted.slice(0, sorted.length - 5).map((item) => `${versionDir}/${item.name}`);
        if (removePaths.length > 0) {
          await supabase.storage.from(IMAGE_BUCKET).remove(removePaths);
        }
      }
    } catch {
      // ignore backup errors
    }
  };

  const replaceImage = async () => {
    if (!pendingReplacement) return;
    setReplacing(true);
    try {
      if (!activeReplacementImage) return;
      await createBackupVersion(activeReplacementImage);
      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(activeReplacementImage.path, pendingReplacement.file, { upsert: true });
      if (error) {
        toast({ title: "Replace failed", description: error.message, variant: "destructive" });
        return;
      }
      await logAudit(
        "replace_image",
        activeReplacementImage.path,
        `Replaced ${activeReplacementImage.name} with ${pendingReplacement.file.name}`
      );
      toast({ title: "Image replaced", description: "The new image is now live." });
      await loadImages();
    } finally {
      setReplacing(false);
      setReplaceDialogOpen(false);
      setPendingReplacement(null);
      setActiveReplacementImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const loadVersions = async (image: ImageItem) => {
    const versionDir = getVersionFolder(image.path);
    const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(versionDir, { limit: 1000 });
    if (error || !data) {
      return [];
    }

    const versions = await Promise.all(
      data
        .filter((item) => !isLikelyDirectory(item.name))
        .sort((a, b) => b.name.localeCompare(a.name))
        .map(async (item) => {
          const versionPath = `${versionDir}/${item.name}`;
          const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(versionPath);
          return {
            path: versionPath,
            name: item.name,
            url: urlData.publicUrl,
            size: item.metadata?.size ?? 0,
            updatedAt: item.updated_at,
          };
        })
    );
    return versions;
  };

  const toggleVersions = async (image: ImageItem) => {
    const currentlyExpanded = expandedVersions[image.path];
    const nextState = { ...expandedVersions, [image.path]: !currentlyExpanded };
    setExpandedVersions(nextState);
    if (!currentlyExpanded && !versionMap[image.path]) {
      const versions = await loadVersions(image);
      setVersionMap((prev) => ({ ...prev, [image.path]: versions }));
    }
  };

  const restoreVersion = async (image: ImageItem, version: VersionItem) => {
    const ok = window.confirm(`Restore version ${version.name} for ${image.name}?`);
    if (!ok) return;
    setReplacing(true);
    try {
      await createBackupVersion(image);
      const { data: versionFile, error: downloadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .download(version.path);
      if (downloadError || !versionFile) {
        toast({ title: "Restore failed", variant: "destructive" });
        return;
      }
      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(image.path, versionFile, { upsert: true });
      if (error) {
        toast({ title: "Restore failed", description: error.message, variant: "destructive" });
        return;
      }
      await logAudit(
        "restore_image",
        image.path,
        `Restored ${image.name} from version ${version.name}`
      );
      toast({ title: "Version restored", description: "The previous image version is now active." });
      await loadImages();
    } finally {
      setReplacing(false);
    }
  };

  const handleImageLoad = (path: string, width: number, height: number) => {
    setDimensions((prev) => ({ ...prev, [path]: { width, height } }));
  };

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card>
            <CardContent className="max-w-md text-center">
              <History className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="mt-4 text-2xl font-semibold">Access Denied</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Only admin users may access the image manager.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <ImagePlus className="h-4 w-4" /> Image Manager
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground">Centralized Image Gallery</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Review all storage images, replace assets in place, and restore previous versions with one click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => { setRefreshing(true); loadImages().finally(() => setRefreshing(false)); }}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}>
              Upload New Image
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <Label htmlFor="image-search">Search</Label>
                    <div className="relative mt-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="image-search"
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="File name, page, section, date, type"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="page-filter">Page</Label>
                    <Select value={pageFilter} onValueChange={setPageFilter}>
                      <SelectTrigger id="page-filter" className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        {pageOptions.map((page) => (
                          <SelectItem key={page} value={page}>
                            {page}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="section-filter">Section</Label>
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                      <SelectTrigger id="section-filter" className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionOptions.map((section) => (
                          <SelectItem key={section} value={section}>
                            {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <Label htmlFor="type-filter">File type</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger id="type-filter" className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="large-only"
                      type="checkbox"
                      checked={largeOnly}
                      onChange={(e) => setLargeOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor="large-only" className="cursor-pointer">
                      Large images only
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="icons-only"
                      type="checkbox"
                      checked={iconsOnly}
                      onChange={(e) => setIconsOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor="icons-only" className="cursor-pointer">
                      Icons only
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="unused-only"
                      type="checkbox"
                      checked={unusedOnly}
                      onChange={(e) => setUnusedOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor="unused-only" className="cursor-pointer">
                      Unused only
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="recent-only"
                      type="checkbox"
                      checked={recentOnly}
                      onChange={(e) => setRecentOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor="recent-only" className="cursor-pointer">
                      Recently replaced
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <History className="h-4 w-4" />
                  <span className="font-medium">Quick Filters</span>
                </div>
                <p>
                  Use search, page, section, and file-type filters to narrow the gallery. Replace images directly from the list and restore any previous saved version.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
                    <span>Images</span>
                    <strong>{filteredImages.length}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
                    <span>Pages</span>
                    <strong>{Object.keys(groupedImages).length}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
                    <span>Large images</span>
                    <strong>{filteredImages.filter((img) => img.size >= LARGE_IMAGE_BYTES).length}</strong>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredImages.length === 0 ? (
          <Card>
            <CardContent className="text-center text-muted-foreground">
              No images match the current search and filters.
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedImages).map(([page, items]) => {
            const expanded = expandedPages.includes(page);
            return (
              <Card key={page} className="overflow-hidden">
                <div className="border-b border-border px-6 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPages((prev) =>
                        prev.includes(page)
                          ? prev.filter((value) => value !== page)
                          : [...prev, page]
                      )
                    }
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{page}</p>
                      <p className="text-sm text-muted-foreground">{items.length} image{items.length === 1 ? "" : "s"}</p>
                    </div>
                    {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                {expanded && (
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                      {items.map((image) => {
                        const dimension = dimensions[image.path];
                        const versionCount = versionMap[image.path]?.length ?? 0;
                        return (
                          <div key={image.path} className="rounded-xl border border-border bg-background p-4">
                            <div className="flex flex-col gap-4 sm:flex-row">
                              <div className="relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted sm:h-40 sm:w-40">
                                <img
                                  src={`${image.url}?cacheBust=${Date.now()}`}
                                  alt={image.name}
                                  className="h-full w-full object-cover"
                                  onLoad={(e) => handleImageLoad(image.path, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                                />
                              </div>

                              <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge>{image.page}</Badge>
                                  <Badge variant={image.used ? "secondary" : "outline"}>
                                    {image.used ? "Used" : "Unused"}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div>
                                    <span className="font-medium text-foreground">File name:</span> {image.name}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Section:</span> {image.section}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Type:</span> {image.type}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Size:</span> {formatBytes(image.size)}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Dimensions:</span>{" "}
                                    {dimension ? `${dimension.width}×${dimension.height}` : "Loading..."}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Updated:</span>{" "}
                                    {new Date(image.updatedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button variant="secondary" onClick={() => openReplaceDialog(image)}>
                                Replace Image
                              </Button>
                              <Button variant="outline" onClick={() => toggleVersions(image)}>
                                Versions{versionCount ? ` (${versionCount})` : ""}
                              </Button>
                            </div>

                            {expandedVersions[image.path] && (
                              <div className="mt-4 space-y-3 border-t border-border pt-4">
                                <p className="text-sm font-medium text-foreground">Version history</p>
                                {versionMap[image.path]?.length ? (
                                  <div className="space-y-3">
                                    {versionMap[image.path]!.map((version) => (
                                      <div key={version.path} className="rounded-lg border border-border bg-muted p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <p className="font-medium text-foreground">{version.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {formatBytes(version.size)} · {new Date(version.updatedAt).toLocaleDateString()}
                                            </p>
                                          </div>
                                          <Button size="sm" variant="outline" onClick={() => restoreVersion(image, version)}>
                                            Restore
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No previous versions found.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.svg"
        className="hidden"
        onChange={handleFilePicked}
      />

      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm image replacement</DialogTitle>
          </DialogHeader>

          {activeReplacementImage && pendingReplacement ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Current image</p>
                  <img src={activeReplacementImage.url} alt="Current" className="mt-2 h-40 w-full rounded-md object-cover border border-border" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">New preview</p>
                  <img src={pendingReplacement.previewUrl} alt="Preview" className="mt-2 h-40 w-full rounded-md object-cover border border-border" />
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>
                  You are replacing <strong>{activeReplacementImage.name}</strong> in <strong>{activeReplacementImage.page}</strong> / <strong>{activeReplacementImage.section}</strong>.
                </p>
                <p className="mt-2">
                  If you confirm, the new file will overwrite the existing image in storage and refresh the public version.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setReplaceDialogOpen(false)} disabled={replacing}>
              Cancel
            </Button>
            <Button onClick={replaceImage} disabled={replacing || !pendingReplacement}>
              {replacing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminImageManager;
