import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, X } from "lucide-react";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  team: string;
  email: string | null;
}

interface AttachmentFile {
  file: File;
  name: string;
}

const CoachEmail = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [manualEmails, setManualEmails] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("coach_players")
      .select("id, first_name, last_name, team, email")
      .eq("coach_id", user.id)
      .then(({ data }: { data: Player[] }) => setPlayers(data ?? []));
  }, [user]);

  // Group players by team
  const teamGroups = players.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.team.trim() || "Unassigned";
    (acc[key] = acc[key] ?? []).push(p);
    return acc;
  }, {});

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      next.has(team) ? next.delete(team) : next.add(team);
      return next;
    });
  };

  const filteredPlayers = selectedTeams.size > 0
    ? players.filter((p) => selectedTeams.has((p.team || "").trim() || "Unassigned"))
    : players;

  useEffect(() => {
    const visiblePlayerIds = new Set(filteredPlayers.map((p) => p.id));
    setSelectedPlayerIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visiblePlayerIds.has(id)));
      return next;
    });
  }, [selectedTeams, players]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
  };

  const allVisiblePlayerIds = filteredPlayers.map((p) => p.id);
  const allVisibleSelected =
    allVisiblePlayerIds.length > 0 && allVisiblePlayerIds.every((id) => selectedPlayerIds.has(id));

  const toggleAllVisiblePlayers = () => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        allVisiblePlayerIds.forEach((id) => next.delete(id));
      } else {
        allVisiblePlayerIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectedPlayerEmails = players
    .filter((p) => selectedPlayerIds.has(p.id))
    .map((p) => p.email)
    .filter(Boolean) as string[];

  const manualList = manualEmails
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes("@"));

  const allRecipients = Array.from(new Set([...selectedPlayerEmails, ...manualList]));

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files.map((f) => ({ file: f, name: f.name }))]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSend = async () => {
    if (!user) return;

    if (!subject.trim()) {
      toast({ title: "Subject is required", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "Message body is required", variant: "destructive" });
      return;
    }
    if (allRecipients.length === 0) {
      toast({ title: "No recipients selected", description: "Select at least one team or enter an email address", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      const encodedAttachments = await Promise.all(
        attachments.map(async (a) => ({
          filename: a.name,
          content: await toBase64(a.file),
          type: a.file.type || "application/octet-stream",
        }))
      );

      const { error: fnError } = await supabase.functions.invoke("send-coach-email", {
        body: {
          subject: subject.trim(),
          body: body.trim(),
          recipients: allRecipients,
          attachments: encodedAttachments,
        },
      });

      const status = fnError ? "failed" : "sent";

      // Always save to history
      await (supabase as any).from("coach_email_history").insert({
        coach_id: user.id,
        subject: subject.trim(),
        body: body.trim(),
        recipients: allRecipients,
        team_names: Array.from(selectedTeams),
        attachments: attachments.map((a) => ({ filename: a.name, type: a.file.type, size: a.file.size })),
        status,
        error_message: fnError?.message ?? null,
      });

      if (fnError) {
        toast({ title: "Failed to send email", description: fnError.message, variant: "destructive" });
      } else {
        toast({ title: `Email sent to ${allRecipients.length} recipient${allRecipients.length !== 1 ? "s" : ""}` });
        setSubject("");
        setBody("");
        setSelectedTeams(new Set());
        setSelectedPlayerIds(new Set());
        setManualEmails("");
        setAttachments([]);
      }
    } catch (err) {
      toast({ title: "Unexpected error", description: String(err), variant: "destructive" });
    }

    setSending(false);
  };

  return (
    <CoachLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compose Email</h1>
          <p className="text-muted-foreground text-sm">Select teams to auto-populate recipients from player emails</p>
        </div>

        {/* Recipients */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recipients</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(teamGroups).length > 0 && (
              <div>
                <Label className="mb-2 block">Select Teams</Label>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(teamGroups).map(([team, members]) => {
                    const emailCount = members.filter((p) => p.email).length;
                    return (
                      <label key={team} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedTeams.has(team)}
                          onCheckedChange={() => toggleTeam(team)}
                        />
                        <span className="text-sm">{team}</span>
                        <Badge variant="secondary" className="text-xs">{emailCount} email{emailCount !== 1 ? "s" : ""}</Badge>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="block">Select Players</Label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisiblePlayers}
                  />
                  <span className="text-sm">All</span>
                </label>
              </div>

              <div className="max-h-48 space-y-2 overflow-auto rounded-md border p-3">
                {filteredPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No players found for selected team(s).</p>
                ) : (
                  filteredPlayers.map((player) => (
                    <label key={player.id} className="flex cursor-pointer items-start gap-2 rounded-md p-1 hover:bg-muted/40">
                      <Checkbox
                        checked={selectedPlayerIds.has(player.id)}
                        onCheckedChange={() => togglePlayer(player.id)}
                      />
                      <span className="text-sm">
                        <span className="font-medium">{player.first_name} {player.last_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {(player.team || "Unassigned").trim() || "Unassigned"}
                          {player.email ? ` • ${player.email}` : " • No email"}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Additional / Override Recipients</Label>
              <Textarea
                rows={2}
                placeholder="Enter emails separated by commas or new lines"
                value={manualEmails}
                onChange={(e) => setManualEmails(e.target.value)}
              />
            </div>

            {allRecipients.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Sending to {allRecipients.length} recipient{allRecipients.length !== 1 ? "s" : ""}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {allRecipients.map((email) => (
                    <Badge key={email} variant="outline" className="text-xs">{email}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message */}
        <Card>
          <CardHeader><CardTitle className="text-base">Message</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" />
            </div>
            <div className="space-y-1">
              <Label>Body *</Label>
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message here..." />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attachments</CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" /> Attach File
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAttach} />
          </CardHeader>
          {attachments.length > 0 && (
            <CardContent>
              <div className="space-y-2">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm border rounded-md px-3 py-2">
                    <span className="truncate">{a.name}</span>
                    <span className="text-muted-foreground shrink-0">{(a.file.size / 1024).toFixed(0)} KB</span>
                    <Button size="icon" variant="ghost" className="shrink-0 h-6 w-6" onClick={() => removeAttachment(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <Button onClick={handleSend} disabled={sending} className="gap-2 w-full sm:w-auto">
          <Send className="h-4 w-4" />
          {sending ? "Sending..." : `Send Email${allRecipients.length > 0 ? ` (${allRecipients.length})` : ""}`}
        </Button>
      </div>
    </CoachLayout>
  );
};

export default CoachEmail;
