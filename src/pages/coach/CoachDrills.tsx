import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import DrillWhiteboardModal from "@/components/coach/DrillWhiteboardModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Timer, ExternalLink, Eye, Copy, Mic, Square, Video } from "lucide-react";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Lookup {
  id: string;
  name: string;
}

interface Drill {
  id: string;
  coach_id: string;
  name: string;
  link: string | null;
  duration_minutes: number | null;
  description: string | null;
  equipment: string | null;
  player_groupings: string | null;
  time_intervals_reps: string | null;
  assistant_role: string | null;
  coach_role: string | null;
  age_group: string | null;
  coach_note: string | null;
  diagram_path: string | null;
  show_whiteboard_template: boolean;
  drill_video_path: string | null;
  is_shared: boolean;
  created_at: string;
}

interface DrillForm {
  name: string;
  link: string;
  duration_minutes: string;
  description: string;
  equipment: string;
  player_groupings: string;
  time_intervals_reps: string;
  assistant_role: string;
  coach_role: string;
  age_group: string;
  coach_note: string;
  diagram_path: string;
  show_whiteboard_template: boolean;
  drill_video_path: string;
  is_shared: boolean;
  categoryIds: string[];
  skillIds: string[];
  courtIds: string[];
}

const emptyForm: DrillForm = {
  name: "",
  link: "",
  duration_minutes: "",
  description: "",
  equipment: "",
  player_groupings: "",
  time_intervals_reps: "",
  assistant_role: "",
  coach_role: "",
  age_group: "",
  coach_note: "",
  diagram_path: "",
  show_whiteboard_template: true,
  drill_video_path: "",
  is_shared: false,
  categoryIds: [],
  skillIds: [],
  courtIds: [],
};

const CoachDrills = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [skills, setSkills] = useState<Lookup[]>([]);
  const [courts, setCourts] = useState<Lookup[]>([]);

  const [drillCategoryMap, setDrillCategoryMap] = useState<Record<string, string[]>>({});
  const [drillSkillMap, setDrillSkillMap] = useState<Record<string, string[]>>({});
  const [drillCourtMap, setDrillCourtMap] = useState<Record<string, string[]>>({});
  const [favoriteDrillIds, setFavoriteDrillIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [courtFilter, setCourtFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDrill, setViewingDrill] = useState<Drill | null>(null);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [isListeningField, setIsListeningField] = useState<"description" | "coach_note" | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [viewVideoUrl, setViewVideoUrl] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStopTimerRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const [form, setForm] = useState<DrillForm>(emptyForm);
  const canImportLegacy = hasPermission("manage_import");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [drillsRes, categoriesRes, skillsRes, courtsRes, d2cRes, d2sRes, d2ctRes, favoritesRes] = await Promise.all([
      (supabase as any).from("coach_drills").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("coach_drill_categories").select("id, name").order("sort_order").order("name"),
      (supabase as any).from("coach_drill_skills").select("id, name").order("sort_order").order("name"),
      (supabase as any).from("coach_drill_courts").select("id, name").order("sort_order").order("name"),
      (supabase as any).from("coach_drill_to_categories").select("drill_id, category_id"),
      (supabase as any).from("coach_drill_to_skills").select("drill_id, skill_id"),
      (supabase as any).from("coach_drill_to_courts").select("drill_id, court_id"),
      (supabase as any).from("coach_favorite_drills").select("drill_id").eq("coach_id", user.id),
    ]);

    if (drillsRes.error || categoriesRes.error || skillsRes.error || courtsRes.error || d2cRes.error || d2sRes.error || d2ctRes.error || favoritesRes.error) {
      toast({
        title: "Failed to load drills",
        description:
          drillsRes.error?.message ||
          categoriesRes.error?.message ||
          skillsRes.error?.message ||
          courtsRes.error?.message ||
          d2cRes.error?.message ||
          d2sRes.error?.message ||
          d2ctRes.error?.message ||
          favoritesRes.error?.message ||
          "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setDrills(drillsRes.data ?? []);
    setCategories(categoriesRes.data ?? []);
    setSkills(skillsRes.data ?? []);
    setCourts(courtsRes.data ?? []);

    const categoryMap: Record<string, string[]> = {};
    for (const row of d2cRes.data ?? []) {
      categoryMap[row.drill_id] = [...(categoryMap[row.drill_id] ?? []), row.category_id];
    }

    const skillMap: Record<string, string[]> = {};
    for (const row of d2sRes.data ?? []) {
      skillMap[row.drill_id] = [...(skillMap[row.drill_id] ?? []), row.skill_id];
    }

    const courtMap: Record<string, string[]> = {};
    for (const row of d2ctRes.data ?? []) {
      courtMap[row.drill_id] = [...(courtMap[row.drill_id] ?? []), row.court_id];
    }

    setDrillCategoryMap(categoryMap);
    setDrillSkillMap(skillMap);
    setDrillCourtMap(courtMap);
    setFavoriteDrillIds(new Set((favoritesRes.data ?? []).map((row: any) => row.drill_id as string)));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    const loadEditVideo = async () => {
      if (!dialogOpen || !form.drill_video_path || isRecordingVideo) return;
      const { data, error } = await supabase.storage
        .from("coach-drill-videos")
        .createSignedUrl(form.drill_video_path, 3600);
      if (!error && data?.signedUrl) {
        setRecordedVideoUrl(data.signedUrl);
      }
    };

    loadEditVideo();
  }, [dialogOpen, form.drill_video_path, isRecordingVideo]);

  useEffect(() => {
    const loadViewVideo = async () => {
      if (!viewDialogOpen || !viewingDrill?.drill_video_path) return;
      const { data, error } = await supabase.storage
        .from("coach-drill-videos")
        .createSignedUrl(viewingDrill.drill_video_path, 3600);
      if (!error && data?.signedUrl) {
        setViewVideoUrl(data.signedUrl);
      }
    };

    loadViewVideo();
  }, [viewDialogOpen, viewingDrill?.drill_video_path]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (recordingStopTimerRef.current) window.clearTimeout(recordingStopTimerRef.current);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
    };
  }, []);

  const categoryNameById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const skillNameById = useMemo(() => Object.fromEntries(skills.map((s) => [s.id, s.name])), [skills]);
  const courtNameById = useMemo(() => Object.fromEntries(courts.map((c) => [c.id, c.name])), [courts]);

  const filteredDrills = useMemo(() => {
    const term = search.trim().toLowerCase();
    return drills.filter((d) => {
      const matchesSearch =
        !term ||
        d.name.toLowerCase().includes(term) ||
        (d.description ?? "").toLowerCase().includes(term) ||
        (d.age_group ?? "").toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === "all" || (drillCategoryMap[d.id] ?? []).includes(categoryFilter);
      const matchesSkill = skillFilter === "all" || (drillSkillMap[d.id] ?? []).includes(skillFilter);
      const matchesCourt = courtFilter === "all" || (drillCourtMap[d.id] ?? []).includes(courtFilter);

      return matchesSearch && matchesCategory && matchesSkill && matchesCourt;
    });
  }, [drills, search, categoryFilter, skillFilter, courtFilter, drillCategoryMap, drillSkillMap, drillCourtMap]);

  const openCreate = () => {
    setEditingId(null);
    setRecordedVideoUrl(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (drill: Drill) => {
    setEditingId(drill.id);
    setForm({
      name: drill.name,
      link: drill.link ?? "",
      duration_minutes: drill.duration_minutes ? String(drill.duration_minutes) : "",
      description: drill.description ?? "",
      equipment: drill.equipment ?? "",
      player_groupings: drill.player_groupings ?? "",
      time_intervals_reps: drill.time_intervals_reps ?? "",
      assistant_role: drill.assistant_role ?? "",
      coach_role: drill.coach_role ?? "",
      age_group: drill.age_group ?? "",
      coach_note: drill.coach_note ?? "",
      diagram_path: drill.diagram_path ?? "",
      show_whiteboard_template: drill.show_whiteboard_template ?? true,
      drill_video_path: drill.drill_video_path ?? "",
      is_shared: drill.is_shared,
      categoryIds: drillCategoryMap[drill.id] ?? [],
      skillIds: drillSkillMap[drill.id] ?? [],
      courtIds: drillCourtMap[drill.id] ?? [],
    });
    setRecordedVideoUrl(null);
    setDialogOpen(true);
  };

  const openView = (drill: Drill) => {
    setViewingDrill(drill);
    setViewVideoUrl(null);
    setViewDialogOpen(true);
  };

  const toggleMulti = (key: "categoryIds" | "skillIds" | "courtIds", value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const saveMappings = async (drillId: string, payload: DrillForm) => {
    await Promise.all([
      (supabase as any).from("coach_drill_to_categories").delete().eq("drill_id", drillId),
      (supabase as any).from("coach_drill_to_skills").delete().eq("drill_id", drillId),
      (supabase as any).from("coach_drill_to_courts").delete().eq("drill_id", drillId),
    ]);

    const inserts: Promise<any>[] = [];

    if (payload.categoryIds.length > 0) {
      inserts.push(
        (supabase as any).from("coach_drill_to_categories").insert(
          payload.categoryIds.map((categoryId) => ({ drill_id: drillId, category_id: categoryId }))
        )
      );
    }

    if (payload.skillIds.length > 0) {
      inserts.push(
        (supabase as any).from("coach_drill_to_skills").insert(
          payload.skillIds.map((skillId) => ({ drill_id: drillId, skill_id: skillId }))
        )
      );
    }

    if (payload.courtIds.length > 0) {
      inserts.push(
        (supabase as any).from("coach_drill_to_courts").insert(
          payload.courtIds.map((courtId) => ({ drill_id: drillId, court_id: courtId }))
        )
      );
    }

    if (inserts.length > 0) {
      const results = await Promise.all(inserts);
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        throw new Error(failed.error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast({ title: "Drill name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      coach_id: user.id,
      name: form.name.trim(),
      link: form.link.trim() || null,
      duration_minutes: form.duration_minutes.trim() ? Number(form.duration_minutes) : null,
      description: form.description.trim() || null,
      equipment: form.equipment.trim() || null,
      player_groupings: form.player_groupings.trim() || null,
      time_intervals_reps: form.time_intervals_reps.trim() || null,
      assistant_role: form.assistant_role.trim() || null,
      coach_role: form.coach_role.trim() || null,
      age_group: form.age_group.trim() || null,
      coach_note: form.coach_note.trim() || null,
      diagram_path: form.diagram_path.trim() || null,
      show_whiteboard_template: form.show_whiteboard_template,
      drill_video_path: form.drill_video_path.trim() || null,
      is_shared: form.is_shared,
    };

    try {
      let drillId = editingId;

      if (editingId) {
        const { error } = await (supabase as any).from("coach_drills").update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await (supabase as any)
          .from("coach_drills")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        drillId = data.id;
      }

      if (!drillId) throw new Error("Failed to save drill ID");

      await saveMappings(drillId, form);

      toast({ title: editingId ? "Drill updated" : "Drill created" });
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to save drill", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (drill: Drill) => {
    if (!confirm(`Delete drill \"${drill.name}\"?`)) return;
    const { error } = await (supabase as any).from("coach_drills").delete().eq("id", drill.id);
    if (error) {
      toast({ title: "Failed to delete drill", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Drill deleted" });
    await loadData();
  };

  const handleCopy = async (drill: Drill) => {
    if (!user) return;

    setCopyingId(drill.id);
    try {
      const payload = {
        coach_id: user.id,
        name: `${drill.name} (Copy)`,
        link: drill.link,
        duration_minutes: drill.duration_minutes,
        description: drill.description,
        equipment: drill.equipment,
        player_groupings: drill.player_groupings,
        time_intervals_reps: drill.time_intervals_reps,
        assistant_role: drill.assistant_role,
        coach_role: drill.coach_role,
        age_group: drill.age_group,
        coach_note: drill.coach_note,
        diagram_path: drill.diagram_path,
        show_whiteboard_template: drill.show_whiteboard_template,
        drill_video_path: drill.drill_video_path,
        is_shared: false,
      };

      const { data: newDrill, error: newDrillError } = await (supabase as any)
        .from("coach_drills")
        .insert(payload)
        .select("id")
        .single();

      if (newDrillError) throw new Error(newDrillError.message);

      await saveMappings(newDrill.id, {
        ...emptyForm,
        categoryIds: drillCategoryMap[drill.id] ?? [],
        skillIds: drillSkillMap[drill.id] ?? [],
        courtIds: drillCourtMap[drill.id] ?? [],
      });

      toast({ title: "Drill copied" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to copy drill", description: err.message, variant: "destructive" });
    } finally {
      setCopyingId(null);
    }
  };

  const handleImportLegacy = async () => {
    if (!user) return;

    const confirmed = confirm(
      "Import legacy drills and practice plans now? This is idempotent and will skip records already imported."
    );
    if (!confirmed) return;

    setImportingLegacy(true);
    try {
      const { data, error } = await (supabase as any).rpc("import_legacy_drills_and_practice_plans", {
        p_fallback_coach_id: user.id,
        p_limit: null,
      });
      if (error) throw new Error(error.message);

      const summary = (data ?? {}) as Record<string, unknown>;
      const drillsImported = Number(summary.drills_imported ?? 0);
      const plansImported = Number(summary.practice_plans_imported ?? 0);
      const itemsImported = Number(summary.practice_plan_items_imported ?? 0);

      toast({
        title: "Legacy import complete",
        description: `${drillsImported} drills, ${plansImported} plans, ${itemsImported} plan items imported.`,
      });

      await loadData();
    } catch (err: any) {
      toast({
        title: "Legacy import failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImportingLegacy(false);
    }
  };

  const toggleFavorite = async (drillId: string, isFavorite: boolean) => {
    if (!user) return;

    if (isFavorite) {
      const { error } = await (supabase as any)
        .from("coach_favorite_drills")
        .insert({ coach_id: user.id, drill_id: drillId });
      if (error) {
        toast({ title: "Failed to update favorite", description: error.message, variant: "destructive" });
        return;
      }
      setFavoriteDrillIds((prev) => new Set([...prev, drillId]));
      return;
    }

    const { error } = await (supabase as any)
      .from("coach_favorite_drills")
      .delete()
      .eq("coach_id", user.id)
      .eq("drill_id", drillId);
    if (error) {
      toast({ title: "Failed to update favorite", description: error.message, variant: "destructive" });
      return;
    }

    setFavoriteDrillIds((prev) => {
      const next = new Set(prev);
      next.delete(drillId);
      return next;
    });
  };

  const getSpeechRecognition = () => {
    const speechApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!speechApi) return null;
    return new speechApi() as SpeechRecognitionLike;
  };

  const toggleDictation = (field: "description" | "coach_note") => {
    if (isListeningField === field) {
      recognitionRef.current?.stop();
      setIsListeningField(null);
      return;
    }

    recognitionRef.current?.stop();
    const recognition = getSpeechRecognition();
    if (!recognition) {
      toast({ title: "Voice-to-text unavailable", description: "This browser does not support speech recognition.", variant: "destructive" });
      return;
    }

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (!transcript.trim()) return;

      setForm((prev) => {
        const current = prev[field] ?? "";
        const spacer = current.trim().length > 0 ? " " : "";
        return { ...prev, [field]: `${current}${spacer}${transcript.trim()}` };
      });
    };
    recognition.onerror = () => {
      setIsListeningField(null);
      toast({ title: "Voice-to-text stopped", variant: "destructive" });
    };
    recognition.onend = () => {
      setIsListeningField(null);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListeningField(field);
  };

  const stopVideoRecording = async () => {
    const recorder = videoRecorderRef.current;
    if (!recorder) return;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    if (recordingStopTimerRef.current) window.clearTimeout(recordingStopTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    setIsRecordingVideo(false);

    const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
    if (blob.size < 100) {
      toast({ title: "Recording too short", variant: "destructive" });
      return;
    }

    if (!user) return;

    const path = `${user.id}/drills/${crypto.randomUUID()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("coach-drill-videos")
      .upload(path, blob, { contentType: "video/webm" });

    if (uploadError) {
      toast({ title: "Video upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const previewUrl = URL.createObjectURL(blob);
    setRecordedVideoUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return previewUrl;
    });
    setForm((prev) => ({ ...prev, drill_video_path: path }));
    toast({ title: "Drill video attached" });
  };

  const startVideoRecording = async () => {
    if (!user || isRecordingVideo) return;

    alert("2 minutes maximum recording length. Camera and microphone access will be requested.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      recordingStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      videoChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunksRef.current.push(event.data);
      };

      recorder.start(250);
      videoRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setIsRecordingVideo(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      recordingStopTimerRef.current = window.setTimeout(() => {
        stopVideoRecording();
        toast({ title: "Recording stopped", description: "2-minute maximum reached." });
      }, 120000);
    } catch (error: any) {
      toast({
        title: "Camera access denied",
        description: error?.message ?? "Please allow camera and microphone access in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Drill Library</h1>
            <p className="text-sm text-muted-foreground">Create drills and reuse them across practice plans.</p>
          </div>
          <div className="flex items-center gap-2">
            {canImportLegacy && (
              <Button variant="outline" onClick={handleImportLegacy} disabled={importingLegacy}>
                {importingLegacy ? "Importing..." : "Import Legacy Data"}
              </Button>
            )}
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              New Drill
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drills..." />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All skills</SelectItem>
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={courtFilter} onValueChange={setCourtFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Court" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courts</SelectItem>
                  {courts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Loading drills...</CardContent></Card>
        ) : filteredDrills.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No drills found.</CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Drills List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">Name</th>
                      <th className="py-3 pr-4 font-medium">Duration</th>
                      <th className="py-3 pr-4 font-medium">Categories</th>
                      <th className="py-3 pr-4 font-medium">Skills</th>
                      <th className="py-3 pr-4 font-medium">Courts</th>
                      <th className="py-3 pr-4 font-medium">Favorite</th>
                      <th className="py-3 pr-4 font-medium">Shared</th>
                      <th className="py-3 pr-0 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrills.map((drill) => {
                      const categoryBadges = (drillCategoryMap[drill.id] ?? []).map((id) => categoryNameById[id]).filter(Boolean);
                      const skillBadges = (drillSkillMap[drill.id] ?? []).map((id) => skillNameById[id]).filter(Boolean);
                      const courtBadges = (drillCourtMap[drill.id] ?? []).map((id) => courtNameById[id]).filter(Boolean);
                      const isOwner = drill.coach_id === user?.id;

                      return (
                        <tr key={drill.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-3 pr-4 font-medium text-foreground">
                            <button type="button" onClick={() => openView(drill)} className="hover:underline text-left">
                              {drill.name}
                            </button>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            {drill.duration_minutes != null ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Timer className="h-3.5 w-3.5" />
                                {drill.duration_minutes} min
                              </span>
                            ) : "-"}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {categoryBadges.length === 0 ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                categoryBadges.slice(0, 2).map((name) => <Badge key={`${drill.id}-${name}`} variant="outline">{name}</Badge>)
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {skillBadges.length === 0 ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                skillBadges.slice(0, 2).map((name) => <Badge key={`${drill.id}-${name}`} variant="secondary">{name}</Badge>)
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {courtBadges.length === 0 ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                courtBadges.slice(0, 2).map((name) => <Badge key={`${drill.id}-${name}`} className="bg-slate-600 hover:bg-slate-600">{name}</Badge>)
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <Switch
                              checked={favoriteDrillIds.has(drill.id)}
                              onCheckedChange={(checked) => toggleFavorite(drill.id, checked)}
                              aria-label={`Favorite drill ${drill.name}`}
                            />
                          </td>
                          <td className="py-3 pr-4">
                            {drill.is_shared ? (
                              <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-muted">Yes</span>
                            ) : (
                              <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="py-3 pr-0">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title={copyingId === drill.id ? "Copying" : "Copy"}
                                disabled={copyingId === drill.id}
                                onClick={() => handleCopy(drill)}
                                className="h-8 w-8"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="View" onClick={() => openView(drill)} className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isOwner && (
                                <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(drill)} className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {isOwner && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete"
                                  onClick={() => handleDelete(drill)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              {drill.link && (
                                <a href={drill.link} target="_blank" rel="noreferrer" title="Open reference" className="inline-flex">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingDrill?.name ?? "Drill Details"}</DialogTitle>
          </DialogHeader>
          {viewingDrill && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Duration:</span> {viewingDrill.duration_minutes ?? "-"}</div>
                <div><span className="text-muted-foreground">Age Group:</span> {viewingDrill.age_group ?? "-"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="mt-1 whitespace-pre-wrap">{viewingDrill.description || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Equipment:</span>
                <p className="mt-1 whitespace-pre-wrap">{viewingDrill.equipment || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Coach Note:</span>
                <p className="mt-1 whitespace-pre-wrap">{viewingDrill.coach_note || "-"}</p>
              </div>
              {viewingDrill.diagram_path && (
                <div>
                  <span className="text-muted-foreground">Whiteboard:</span>
                  <div className="mt-2 overflow-hidden rounded-md border bg-white" style={{ aspectRatio: "16 / 9" }}>
                    <img src={viewingDrill.diagram_path} alt="Drill whiteboard" className="h-full w-full object-contain" />
                  </div>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Whiteboard Template:</span>{" "}
                {viewingDrill.show_whiteboard_template ? "On" : "Off"}
              </div>
              {(viewVideoUrl || viewingDrill.drill_video_path) && (
                <div>
                  <span className="text-muted-foreground">Drill Video:</span>
                  {viewVideoUrl ? (
                    <video src={viewVideoUrl} controls className="mt-2 w-full rounded-md border max-h-72" />
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Loading video...</p>
                  )}
                </div>
              )}
              {viewingDrill.link && (
                <a href={viewingDrill.link} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                  Open reference <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Drill" : "New Drill"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drill-name">Name</Label>
              <Input id="drill-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drill-link">Reference Link</Label>
              <Input id="drill-link" value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drill-duration">Duration (minutes)</Label>
              <Input id="drill-duration" type="number" min={0} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drill-age">Age Group</Label>
              <Input id="drill-age" value={form.age_group} onChange={(e) => setForm((p) => ({ ...p, age_group: e.target.value }))} placeholder="e.g. U15, Senior" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drill-description">Description</Label>
            <div className="flex justify-end">
              <Button
                type="button"
                variant={isListeningField === "description" ? "destructive" : "outline"}
                size="sm"
                className="gap-1"
                onClick={() => toggleDictation("description")}
              >
                {isListeningField === "description" ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {isListeningField === "description" ? "Stop Mic" : "Mic"}
              </Button>
            </div>
            <Textarea id="drill-description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={4} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drill-equipment">Equipment</Label>
              <Textarea id="drill-equipment" value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drill-groupings">Player Groupings</Label>
              <Textarea id="drill-groupings" value={form.player_groupings} onChange={(e) => setForm((p) => ({ ...p, player_groupings: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drill-intervals">Intervals / Reps</Label>
              <Textarea id="drill-intervals" value={form.time_intervals_reps} onChange={(e) => setForm((p) => ({ ...p, time_intervals_reps: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drill-coach-note">Coach Note</Label>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant={isListeningField === "coach_note" ? "destructive" : "outline"}
                  size="sm"
                  className="gap-1"
                  onClick={() => toggleDictation("coach_note")}
                >
                  {isListeningField === "coach_note" ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {isListeningField === "coach_note" ? "Stop Mic" : "Mic"}
                </Button>
              </div>
              <Textarea id="drill-coach-note" value={form.coach_note} onChange={(e) => setForm((p) => ({ ...p, coach_note: e.target.value }))} rows={3} />
            </div>
          </div>

          <div className="space-y-2 border rounded-md p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Drill Video (2 minutes max)</Label>
              {!isRecordingVideo ? (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={startVideoRecording}>
                  <Video className="h-3.5 w-3.5" /> Record
                </Button>
              ) : (
                <Button type="button" variant="destructive" size="sm" className="gap-1" onClick={stopVideoRecording}>
                  <Square className="h-3.5 w-3.5" /> Stop ({recordingSeconds}s)
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">A popup reminder appears before recording starts. Maximum recording length is 2 minutes.</p>
            {form.drill_video_path && (
              <p className="text-xs text-muted-foreground break-all">Saved video path: {form.drill_video_path}</p>
            )}
            {recordedVideoUrl && (
              <video src={recordedVideoUrl} controls className="w-full max-h-56 rounded-md border" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drill-assistant">Assistant Role</Label>
              <Input id="drill-assistant" value={form.assistant_role} onChange={(e) => setForm((p) => ({ ...p, assistant_role: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drill-coach-role">Coach Role</Label>
              <Input id="drill-coach-role" value={form.coach_role} onChange={(e) => setForm((p) => ({ ...p, coach_role: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <Label htmlFor="whiteboard-template-switch">Show Whiteboard Template</Label>
              <p className="text-xs text-muted-foreground">Toggle the default court background on or off for this drill.</p>
            </div>
            <Switch
              id="whiteboard-template-switch"
              checked={form.show_whiteboard_template}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, show_whiteboard_template: checked }))}
            />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label>Drill Whiteboard</Label>
                <p className="text-xs text-muted-foreground">Open the board to draw player movements and save it with this drill.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setWhiteboardOpen(true)}>
                  Open Whiteboard
                </Button>
                {form.diagram_path && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, diagram_path: "" }))}>
                    Clear Drawing
                  </Button>
                )}
              </div>
            </div>
            {form.diagram_path ? (
              <div className="overflow-hidden rounded-md border bg-white" style={{ aspectRatio: "16 / 9" }}>
                <img src={form.diagram_path} alt="Whiteboard preview" className="h-full w-full object-contain" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No drawing saved yet.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.categoryIds.includes(c.id)} onCheckedChange={() => toggleMulti("categoryIds", c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {skills.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.skillIds.includes(s.id)} onCheckedChange={() => toggleMulti("skillIds", s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Courts</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {courts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.courtIds.includes(c.id)} onCheckedChange={() => toggleMulti("courtIds", c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_shared} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_shared: checked === true }))} />
            Share this drill with other coaches
          </label>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Drill"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DrillWhiteboardModal
        open={whiteboardOpen}
        onOpenChange={setWhiteboardOpen}
        initialDrawing={form.diagram_path}
        showTemplate={form.show_whiteboard_template}
        onShowTemplateChange={(show) => setForm((prev) => ({ ...prev, show_whiteboard_template: show }))}
        onSave={(drawing) => {
          setForm((prev) => ({ ...prev, diagram_path: drawing }));
          setWhiteboardOpen(false);
          toast({ title: drawing ? "Whiteboard saved" : "Whiteboard cleared" });
        }}
      />
    </CoachLayout>
  );
};

export default CoachDrills;
