import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Radio, Copy, ExternalLink, Square, Loader2, Video, Camera, CameraOff, Mic, MicOff, MonitorStop } from "lucide-react";

interface LiveStream {
  id: string;
  title: string;
  cloudflare_live_input_id: string;
  cloudflare_playback_url: string;
  rtmps_url: string | null;
  rtmps_stream_key: string | null;
  srt_url: string | null;
  srt_stream_id: string | null;
  webrtc_url: string | null;
  is_live: boolean;
  created_at: string;
  ended_at: string | null;
  recorded_video_uid: string | null;
}

// ─── WebRTC / WHIP browser camera hook ─────────────────────────────────────
function useBrowserStream() {
  const [localStream, setLocalStream]   = useState<MediaStream | null>(null);
  const [pc, setPc]                     = useState<RTCPeerConnection | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [cameraOn, setCameraOn]         = useState(true);
  const [micOn, setMicOn]               = useState(true);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const videoRef                        = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) videoRef.current.srcObject = localStream;
  }, [localStream]);

  const openCamera = async () => {
    setBrowserError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
    } catch (e: any) {
      setBrowserError(e?.message ?? "Could not access camera/microphone. Check browser permissions.");
    }
  };

  const closeCamera = () => {
    localStream?.getTracks().forEach(t => t.stop());
    pc?.close();
    setLocalStream(null);
    setPc(null);
    setBroadcasting(false);
  };

  const startBroadcast = async (whipUrl: string) => {
    if (!localStream) return;
    setBrowserError(null);
    try {
      const peerConn = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
        bundlePolicy: "max-bundle",
      });
      localStream.getTracks().forEach(t => peerConn.addTrack(t, localStream));
      const offer = await peerConn.createOffer();
      await peerConn.setLocalDescription(offer);
      // Wait for ICE gathering (max 4 s)
      await new Promise<void>(resolve => {
        if (peerConn.iceGatheringState === "complete") { resolve(); return; }
        peerConn.addEventListener("icegatheringstatechange", () => {
          if (peerConn.iceGatheringState === "complete") resolve();
        });
        setTimeout(resolve, 4000);
      });
      const res = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: peerConn.localDescription!.sdp,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`WHIP ${res.status}: ${body || "connection refused"}`);
      }
      const answerSdp = await res.text();
      await peerConn.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setPc(peerConn);
      setBroadcasting(true);
    } catch (e: any) {
      setBrowserError(e?.message ?? "Failed to start browser stream.");
    }
  };

  const stopBroadcast = () => {
    pc?.close();
    setPc(null);
    setBroadcasting(false);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !cameraOn; });
    setCameraOn(v => !v);
  };

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(v => !v);
  };

  return { videoRef, localStream, broadcasting, cameraOn, micOn, browserError,
           openCamera, closeCamera, startBroadcast, stopBroadcast, toggleCamera, toggleMic };
}

const CoachLiveStream = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [streams, setStreams]           = useState<LiveStream[]>([]);
  const [loading, setLoading]           = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen]     = useState(false);
  const [newTitle, setNewTitle]         = useState("");
  const [creating, setCreating]         = useState(false);

  // Active stream detail dialog
  const [detailStream, setDetailStream] = useState<LiveStream | null>(null);

  // End stream confirm
  const [endId, setEndId]               = useState<string | null>(null);
  const [ending, setEnding]             = useState(false);

  const browser = useBrowserStream();

  const fetchStreams = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("live_streams")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setStreams(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchStreams(); }, [user]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("cloudflare-live-stream", {
      body: { action: "create", title: newTitle.trim() },
    });
    if (error || data?.error) {
      toast({ title: "Failed to start stream", description: data?.error ?? error?.message, variant: "destructive" });
    } else {
      toast({ title: "Live stream created!", description: "Stream from your browser camera or connect a broadcasting app." });
      setCreateOpen(false);
      setNewTitle("");
      setDetailStream(data as LiveStream);
      fetchStreams();
    }
    setCreating(false);
  };

  const handleEnd = async () => {
    if (!endId) return;
    setEnding(true);
    browser.stopBroadcast();
    browser.closeCamera();
    const { data, error } = await supabase.functions.invoke("cloudflare-live-stream", {
      body: { action: "end", id: endId },
    });
    if (error || data?.error) {
      toast({ title: "Failed to end stream", description: data?.error ?? error?.message, variant: "destructive" });
    } else {
      toast({
        title: "Stream ended",
        description: data.recordedVideoSaved
          ? "Recording saved to your Video Library."
          : "Stream ended. Recording may take a moment to appear.",
      });
      if (detailStream?.id === endId) setDetailStream(null);
      fetchStreams();
    }
    setEnding(false);
    setEndId(null);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: `${label} copied to clipboard` })
    );
  };

  const activeStreams  = streams.filter(s => s.is_live);
  const pastStreams    = streams.filter(s => !s.is_live);

  return (
    <CoachLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Streaming</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stream live volleyball matches and training sessions to your audience.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={activeStreams.length > 0}
            className="gap-2"
          >
            <Radio className="h-4 w-4" />
            Start Live Stream
          </Button>
        </div>

        {/* Active Streams */}
        {activeStreams.map(stream => (
          <Card key={stream.id} className="border-red-500/40 bg-red-50/30 dark:bg-red-950/10">
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <div>
                  <p className="font-semibold">{stream.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(stream.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDetailStream(stream)}>
                  <Video className="h-3.5 w-3.5" /> RTMPS / SRT Credentials
                </Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setEndId(stream.id)}>
                  <Square className="h-3.5 w-3.5" /> End Stream
                </Button>
              </div>
            </CardContent>

            {/* ── Browser Camera Streamer ── */}
            <div className="border-t px-4 pb-4 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> Stream from Browser Camera
                </p>
                {browser.broadcasting && (
                  <Badge className="bg-red-600 text-white gap-1 text-xs animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" /> LIVE
                  </Badge>
                )}
              </div>

              {/* Camera preview */}
              <div className="relative aspect-video max-w-sm rounded-lg overflow-hidden bg-zinc-900">
                {browser.localStream ? (
                  <video ref={browser.videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
                    <CameraOff className="h-8 w-8" />
                    <p className="text-xs">Camera off</p>
                  </div>
                )}
              </div>

              {browser.browserError && (
                <p className="text-xs text-destructive">{browser.browserError}</p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {!browser.localStream ? (
                  <Button size="sm" className="gap-1.5" onClick={browser.openCamera}>
                    <Camera className="h-3.5 w-3.5" /> Open Camera
                  </Button>
                ) : (
                  <>
                    <Button size="icon" variant="outline" className="h-8 w-8"
                      onClick={browser.toggleCamera} title={browser.cameraOn ? "Turn off camera" : "Turn on camera"}>
                      {browser.cameraOn ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8"
                      onClick={browser.toggleMic} title={browser.micOn ? "Mute mic" : "Unmute mic"}>
                      {browser.micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    </Button>
                    {!browser.broadcasting ? (
                      <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => browser.startBroadcast(stream.webrtc_url ?? `https://customer-streams.cloudflarestream.com/${stream.cloudflare_live_input_id}/webRTC/publish`)}>
                        <Radio className="h-3.5 w-3.5" /> Go Live
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" className="gap-1.5" onClick={browser.stopBroadcast}>
                        <MonitorStop className="h-3.5 w-3.5" /> Stop Broadcasting
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={browser.closeCamera}>
                      Close Camera
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Or tap <strong>RTMPS / SRT Credentials</strong> to connect OBS or another broadcasting app.
              </p>
            </div>
          </Card>
        ))}

        {/* Past Streams */}
        {pastStreams.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Past Streams</h2>
            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              {pastStreams.map(stream => (
                <div key={stream.id} className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{stream.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(stream.created_at).toLocaleDateString()} ·{" "}
                      {stream.ended_at
                        ? `Ended ${new Date(stream.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Ended"
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {stream.recorded_video_uid && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Video className="h-3 w-3" /> Recording Saved
                      </Badge>
                    )}
                    {stream.cloudflare_playback_url && (
                      <a
                        href={stream.cloudflare_playback_url}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Open playback"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty */}
        {!loading && streams.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-16 text-center">
            <Radio className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">No live streams yet</p>
            <p className="text-xs text-muted-foreground">Click "Start Live Stream" to broadcast from your browser camera or a streaming app.</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16 text-muted-foreground text-sm">Loading streams...</div>
        )}
      </div>

      {/* ── Create Stream Dialog ── */}
      <Dialog open={createOpen} onOpenChange={v => { if (!creating) { setCreateOpen(v); if (!v) setNewTitle(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Live Stream</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Give your stream a title. You can then stream directly from your browser camera, or connect a broadcasting app via RTMPS/SRT.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="stream-title">Stream Title</Label>
              <Input
                id="stream-title"
                placeholder="e.g. Men's National Team Training"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !creating) handleCreate(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              {creating ? "Starting..." : "Go Live"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Stream Details Dialog ── */}
      {detailStream && (
        <Dialog open={!!detailStream} onOpenChange={v => { if (!v) setDetailStream(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {detailStream.is_live && (
                  <span className="flex h-2.5 w-2.5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
                {detailStream.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-1">

              {/* Playback preview */}
              <div className="rounded-lg overflow-hidden aspect-video bg-black">
                <iframe
                  src={`${detailStream.cloudflare_playback_url}${detailStream.cloudflare_playback_url.includes('?') ? '&' : '?'}autoplay=true&muted=true`}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* RTMPS */}
              {detailStream.rtmps_url && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold">RTMPS (OBS / Streaming App)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <CredentialRow
                      label="Server URL"
                      value={detailStream.rtmps_url}
                      onCopy={() => copy(detailStream.rtmps_url!, "RTMPS URL")}
                    />
                    {detailStream.rtmps_stream_key && (
                      <CredentialRow
                        label="Stream Key"
                        value={detailStream.rtmps_stream_key}
                        masked
                        onCopy={() => copy(detailStream.rtmps_stream_key!, "Stream key")}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* SRT */}
              {detailStream.srt_url && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold">SRT</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <CredentialRow
                      label="SRT URL"
                      value={detailStream.srt_url}
                      onCopy={() => copy(detailStream.srt_url!, "SRT URL")}
                    />
                    {detailStream.srt_stream_id && (
                      <CredentialRow
                        label="Stream ID"
                        value={detailStream.srt_stream_id}
                        onCopy={() => copy(detailStream.srt_stream_id!, "SRT Stream ID")}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">
                To stream from your browser camera, close this dialog and use the <strong>Open Camera</strong> card on the stream panel.
              </p>
            </div>
            <DialogFooter className="gap-2">
              {detailStream.is_live && (
                <Button variant="destructive" className="gap-1.5" onClick={() => { setDetailStream(null); setEndId(detailStream.id); }}>
                  <Square className="h-3.5 w-3.5" /> End Stream
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailStream(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── End Stream Confirm ── */}
      <AlertDialog open={!!endId} onOpenChange={v => { if (!v && !ending) setEndId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Live Stream?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the stream and remove it from the homepage.
              If a recording is available, it will automatically be saved to your Video Library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnd}
              disabled={ending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {ending ? "Ending..." : "End Stream"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

// Small helper component for credential rows
const CredentialRow = ({
  label, value, masked = false, onCopy,
}: {
  label: string; value: string; masked?: boolean; onCopy: () => void;
}) => {
  const [show, setShow] = useState(!masked);
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all select-all">
          {show ? value : "•".repeat(Math.min(value.length, 40))}
        </code>
        {masked && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShow(s => !s)}>
            {show ? "Hide" : "Show"}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCopy} title="Copy">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default CoachLiveStream;
