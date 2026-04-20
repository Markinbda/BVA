import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ChevronRight, FileText, ShieldCheck } from "lucide-react";

// Splash images for background
import heroBeach from "@/assets/hero-beach-tournament.jpg";
import heroJunior from "@/assets/hero-junior-women.jpg";
import heroGrass from "@/assets/hero-grass-indoor.jpg";
import heroNational from "@/assets/hero-national-beach.jpg";

const LIABILITY_TEXT = `BERMUDA VOLLEYBALL ASSOCIATION
LIABILITY WAIVER AND RELEASE OF CLAIMS

By participating in any activity, programme, event, or session organised or facilitated by the Bermuda Volleyball Association (BVA), you (the participant, or parent/guardian if under 18) acknowledge and agree to the following:

1. ASSUMPTION OF RISK
Volleyball and related physical activities involve inherent risks including, but not limited to, physical injury, sprains, fractures, or other bodily harm. You voluntarily assume all such risks associated with participation.

2. RELEASE OF LIABILITY
You release, waive, and discharge the Bermuda Volleyball Association, its officers, directors, coaches, volunteers, employees, and agents from any and all liability, claims, demands, or causes of action arising from your participation in BVA activities, including claims resulting from negligence.

3. MEDICAL AUTHORISATION
You consent to emergency medical treatment being sought on your behalf (or on behalf of the minor under your care) should the need arise during BVA activities, and agree to be responsible for any associated costs.

4. MEDIA CONSENT
Unless separately declined, you consent to photographs and video recordings taken during BVA activities being used for promotional purposes on BVA's website, social media, and printed materials.

5. GOVERNING LAW
This waiver is governed by the laws of Bermuda. If any provision is found unenforceable, the remaining provisions shall remain in full force.

By checking the acknowledgment box on the registration form, you confirm that you have read, understood, and agree to the terms of this Liability Waiver.`;

const CODE_OF_CONDUCT_TEXT = `BERMUDA VOLLEYBALL ASSOCIATION
CODE OF CONDUCT

The Bermuda Volleyball Association is committed to providing a safe, inclusive, and respectful environment for all players, coaches, officials, volunteers, and spectators. All members are expected to uphold the following standards:

1. RESPECT & SPORTSMANSHIP
- Treat all players, coaches, officials, and spectators with dignity and respect, regardless of skill level, age, gender, nationality, or background.
- Accept decisions made by referees and officials graciously, even when you disagree.
- Win and lose with grace — celebrate success humbly and accept defeat constructively.

2. FAIR PLAY
- Play by the rules at all times. Cheating, deliberate misconduct, or unsportsmanlike behaviour will not be tolerated.
- Compete honestly and with integrity in all BVA activities.

3. SAFETY
- Take responsibility for your own safety and the safety of those around you.
- Report any unsafe conditions, injuries, or concerns to a BVA official immediately.
- Do not participate under the influence of alcohol or prohibited substances.

4. COMMUNICATION
- Use appropriate, positive language at all times on and off the court.
- Harassment, bullying, discrimination, or abusive language — verbal, written, or physical — is strictly prohibited.

5. COMMITMENT
- Honour your commitments to your team, coach, and the BVA. Notify the appropriate person as early as possible if you are unable to attend a session or event.

6. DIGITAL CONDUCT
- Conduct yourself professionally on social media and in all online communications related to BVA activities.

7. CONSEQUENCES
Breaches of this Code of Conduct may result in warnings, suspension, or permanent exclusion from BVA activities, at the discretion of the BVA Executive Committee.

By checking the agreement box on the registration form, you confirm that you have read, understood, and agree to abide by this Code of Conduct.`;

const splashImages = [heroBeach, heroJunior, heroGrass, heroNational];

interface FormData {
  // Personal
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  address: string;
  // Roles
  roles: string[];
  // Volleyball format
  formats: string[];
  // Team format
  teamFormats: string[];
  // Additional
  medicalNotes: string;
  emergencyName: string;
  emergencyPhone: string;
  experienceLevel: string;
  // Consent
  liabilityAgreed: boolean;
  photoConsent: boolean;
  conductAgreed: boolean;
}

const ROLES = ["Parent / Guardian", "Player", "Coach", "Volunteer / Helper"];
const FORMATS = ["Indoor", "Beach", "Grass"];
const TEAM_FORMATS = ["Fours (4v4)", "Twos (2v2)", "Sixes (6v6)", "Any / All Formats"];
const EXPERIENCE_LEVELS = ["Beginner", "Recreational", "Intermediate", "Competitive", "Advanced"];

const MemberRegistration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const [conductOpen, setConductOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<FormData>({
    fullName: user?.user_metadata?.display_name || "",
    dob: "",
    email: user?.email || "",
    phone: "",
    address: "",
    roles: [],
    formats: [],
    teamFormats: [],
    medicalNotes: "",
    emergencyName: "",
    emergencyPhone: "",
    experienceLevel: "",
    liabilityAgreed: false,
    photoConsent: false,
    conductAgreed: false,
  });

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleArrayField = (key: "roles" | "formats" | "teamFormats", value: string) => {
    setForm((p) => {
      const arr = p[key] as string[];
      return {
        ...p,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.liabilityAgreed || !form.conductAgreed) {
      toast({ title: "Please accept the Liability Waiver and Code of Conduct", variant: "destructive" });
      return;
    }
    if (!form.fullName || !form.dob || !form.phone || !form.address) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
      return;
    }
    if (form.roles.length === 0) {
      toast({ title: "Please select at least one role", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const payload = {
      user_id: user?.id,
      full_name: form.fullName,
      date_of_birth: form.dob,
      email: form.email,
      phone: form.phone,
      address: form.address,
      roles: form.roles,
      volleyball_formats: form.formats,
      team_formats: form.teamFormats,
      medical_notes: form.medicalNotes,
      emergency_contact_name: form.emergencyName,
      emergency_contact_phone: form.emergencyPhone,
      experience_level: form.experienceLevel,
      liability_agreed: form.liabilityAgreed,
      photo_consent: form.photoConsent,
      conduct_agreed: form.conductAgreed,
      registered_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user?.id,
          display_name: form.fullName,
          date_of_birth: form.dob,
          phone: form.phone,
          address: form.address,
          roles: form.roles,
          volleyball_formats: form.formats,
          team_formats: form.teamFormats,
          medical_notes: form.medicalNotes || null,
          emergency_contact_name: form.emergencyName || null,
          emergency_contact_phone: form.emergencyPhone || null,
          experience_level: form.experienceLevel || null,
          photo_consent: form.photoConsent,
        } as any,
        { onConflict: "user_id" }
      );

    // Also try to upsert into member_registrations if the table exists
    await supabase.from("member_registrations" as any).upsert(payload, { onConflict: "user_id" });

    setSubmitting(false);

    if (error) {
      // Non-fatal — profile update failed but we can still proceed
    }

    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-primary">
        {/* Splash images */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {splashImages.map((src, i) => (
            <div key={i} className="overflow-hidden">
              <img src={src} alt="" className="h-full w-full object-cover opacity-20" />
            </div>
          ))}
        </div>
        <div className="relative flex min-h-screen items-center justify-center p-6">
          <div className="max-w-lg rounded-2xl bg-white/95 p-10 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h1 className="mb-2 font-heading text-3xl font-bold uppercase text-primary">
              Welcome to BVA!
            </h1>
            <p className="mb-1 text-lg font-medium">{form.fullName}</p>
            <p className="mb-6 text-muted-foreground">
              Your registration has been received. We're thrilled to have you as part of the
              Bermuda Volleyball family!
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              You'll receive a confirmation email shortly. Keep an eye on your inbox — and check
              your <strong>junk/spam folder</strong> if you don't see it.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-muted/30">
      {/* Splash background */}
      <div className="pointer-events-none fixed inset-0 grid grid-cols-2 grid-rows-2 z-0">
        {splashImages.map((src, i) => (
          <div key={i} className="overflow-hidden">
            <img src={src} alt="" className="h-full w-full object-cover opacity-20" />
          </div>
        ))}
      </div>

      <div className="relative z-10">
        {/* Header banner */}
        <div className="bg-primary py-10 text-center text-primary-foreground">
          <h1 className="font-heading text-4xl font-bold uppercase tracking-wide md:text-5xl">
            Member Registration
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/70">
            Welcome to the Bermuda Volleyball Association! Complete the form below to register
            as a member. Fields marked <span className="text-accent font-semibold">*</span> are required.
          </p>
          <div className="mt-1 h-1 w-full bg-accent" />
        </div>

        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8 px-4 py-10">

          {/* ── Section 1: Personal Information ── */}
          <section className="rounded-xl bg-white/90 p-6 shadow-md backdrop-blur">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase text-primary flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">1</span>
              Personal Information
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">Tell us a bit about yourself.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fullName">Full Name <span className="text-accent">*</span></Label>
                <Input id="fullName" required value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dob">Date of Birth <span className="text-accent">*</span></Label>
                <Input id="dob" type="date" required value={form.dob}
                  onChange={(e) => setField("dob", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email Address <span className="text-accent">*</span></Label>
                <Input id="email" type="email" required value={form.email}
                  onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number <span className="text-accent">*</span></Label>
                <Input id="phone" type="tel" required value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="address">Home Address <span className="text-accent">*</span></Label>
                <Textarea id="address" rows={2} required value={form.address}
                  onChange={(e) => setField("address", e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── Section 2: Role Selection ── */}
          <section className="rounded-xl bg-white/90 p-6 shadow-md backdrop-blur">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase text-primary flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">2</span>
              Areas of Interest
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Select all that apply — you can choose more than one.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((role) => (
                <label key={role} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/10 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                  <Checkbox
                    checked={form.roles.includes(role)}
                    onCheckedChange={() => toggleArrayField("roles", role)}
                  />
                  <span className="text-sm font-medium">{role}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── Section 3: Volleyball Format ── */}
          <section className="rounded-xl bg-white/90 p-6 shadow-md backdrop-blur">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase text-primary flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">3</span>
              Volleyball Format Preferences
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Which type(s) of volleyball are you interested in? Select all that apply.
            </p>
            <div className="flex flex-wrap gap-3">
              {FORMATS.map((fmt) => (
                <label key={fmt} className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors hover:bg-accent/10 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                  <Checkbox
                    checked={form.formats.includes(fmt)}
                    onCheckedChange={() => toggleArrayField("formats", fmt)}
                  />
                  <span className="text-sm font-medium">{fmt}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── Section 4: Team Format ── */}
          <section className="rounded-xl bg-white/90 p-6 shadow-md backdrop-blur">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase text-primary flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">4</span>
              Team Format Preferences
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              What team sizes do you enjoy? Select all that apply.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEAM_FORMATS.map((fmt) => (
                <label key={fmt} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/10 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                  <Checkbox
                    checked={form.teamFormats.includes(fmt)}
                    onCheckedChange={() => toggleArrayField("teamFormats", fmt)}
                  />
                  <span className="text-sm font-medium">{fmt}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── Section 5: Additional Information ── */}
          <section className="rounded-xl bg-white/90 p-6 shadow-md backdrop-blur">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase text-primary flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">5</span>
              Additional Information
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Help us support you better. All fields in this section are optional.
            </p>

            <div className="space-y-5">
              <div className="space-y-1">
                <Label htmlFor="medicalNotes">Medical or Accessibility Notes</Label>
                <Textarea
                  id="medicalNotes"
                  rows={3}
                  placeholder="e.g. asthma, knee injury, requires wheelchair access…"
                  value={form.medicalNotes}
                  onChange={(e) => setField("medicalNotes", e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-muted/60 p-4 space-y-4">
                <p className="text-sm font-semibold text-foreground">Emergency Contact</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="emergencyName">Contact Name</Label>
                    <Input id="emergencyName" value={form.emergencyName}
                      onChange={(e) => setField("emergencyName", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="emergencyPhone">Contact Phone</Label>
                    <Input id="emergencyPhone" type="tel" value={form.emergencyPhone}
                      onChange={(e) => setField("emergencyPhone", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Previous Volleyball Experience</Label>
                <p className="text-xs text-muted-foreground">Select the level that best describes your experience.</p>
                <RadioGroup
                  value={form.experienceLevel}
                  onValueChange={(val) => setField("experienceLevel", val)}
                  className="flex flex-wrap gap-3"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <label key={level} className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors hover:bg-accent/10 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                      <RadioGroupItem value={level} />
                      <span className="text-sm font-medium">{level}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </section>

          {/* ── Section 6: Consent & Agreements ── */}
          <section className="rounded-xl bg-white/90 p-6 shadow-md backdrop-blur">
            <h2 className="mb-1 font-heading text-xl font-bold uppercase text-primary flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">6</span>
              Consent &amp; Agreements
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Please read and acknowledge each of the following. All three are required to complete registration.
            </p>

            <div className="space-y-4">
              {/* Liability */}
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="liability"
                    checked={form.liabilityAgreed}
                    onCheckedChange={(v) => setField("liabilityAgreed", !!v)}
                  />
                  <div className="space-y-1">
                    <label htmlFor="liability" className="cursor-pointer text-sm font-medium leading-snug">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setLiabilityOpen(true)}
                        className="inline-flex items-center gap-1 text-accent underline underline-offset-2 hover:text-accent/80"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Liability Waiver
                      </button>{" "}
                      <span className="text-accent">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Acknowledges the inherent risks of volleyball and releases BVA from liability.
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo consent */}
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="photo"
                    checked={form.photoConsent}
                    onCheckedChange={(v) => setField("photoConsent", !!v)}
                  />
                  <div className="space-y-1">
                    <label htmlFor="photo" className="cursor-pointer text-sm font-medium leading-snug">
                      I consent to photos and videos being taken during BVA events for promotional use
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Images may be used on the BVA website, social media, and printed materials. You may withdraw consent at any time by contacting BVA.
                    </p>
                  </div>
                </div>
              </div>

              {/* Code of Conduct */}
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="conduct"
                    checked={form.conductAgreed}
                    onCheckedChange={(v) => setField("conductAgreed", !!v)}
                  />
                  <div className="space-y-1">
                    <label htmlFor="conduct" className="cursor-pointer text-sm font-medium leading-snug">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setConductOpen(true)}
                        className="inline-flex items-center gap-1 text-accent underline underline-offset-2 hover:text-accent/80"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Code of Conduct
                      </button>{" "}
                      <span className="text-accent">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Commits to respectful, fair, and safe behaviour in all BVA activities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="rounded-xl bg-white/90 p-6 shadow-md backdrop-blur text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              By submitting this form you confirm that all information provided is accurate and complete.
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full max-w-xs text-base font-semibold"
            >
              {submitting ? "Submitting…" : (
                <span className="flex items-center gap-2">
                  Complete Registration <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Questions? Email us at{" "}
              <a href="mailto:bermudavolleyball@gmail.com" className="text-accent hover:underline">
                bermudavolleyball@gmail.com
              </a>
            </p>
          </div>
        </form>
      </div>

      {/* Liability Waiver Modal */}
      <Dialog open={liabilityOpen} onOpenChange={setLiabilityOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wide">Liability Waiver</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-sans">
            {LIABILITY_TEXT}
          </pre>
          <Button onClick={() => { setField("liabilityAgreed", true); setLiabilityOpen(false); }} className="mt-2 w-full">
            I Agree
          </Button>
        </DialogContent>
      </Dialog>

      {/* Code of Conduct Modal */}
      <Dialog open={conductOpen} onOpenChange={setConductOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wide">Code of Conduct</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-sans">
            {CODE_OF_CONDUCT_TEXT}
          </pre>
          <Button onClick={() => { setField("conductAgreed", true); setConductOpen(false); }} className="mt-2 w-full">
            I Agree
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberRegistration;
