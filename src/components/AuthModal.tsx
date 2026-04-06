import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MailCheck } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { signIn, signUp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ displayName: "", email: "", password: "", confirm: "" });
  const [signInLoading, setSignInLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // PIN verification step
  const [pinStep, setPinStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const resetAll = () => {
    setPinStep(false);
    setPendingEmail("");
    setPin("");
    setRegisterData({ displayName: "", email: "", password: "", confirm: "" });
  };

  const handleClose = (val: boolean) => {
    if (!val) resetAll();
    onOpenChange(val);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInLoading(true);
    const { error } = await signIn(signInData.email, signInData.password);
    setSignInLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      handleClose(false);
      navigate("/profile");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (registerData.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setRegisterLoading(true);
    const { error } = await signUp(registerData.email, registerData.password, registerData.displayName);
    setRegisterLoading(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      setPendingEmail(registerData.email);
      setPinStep(true);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      toast({ title: "Please enter the full PIN", variant: "destructive" });
      return;
    }
    setPinLoading(true);
    const { error } = await verifyOtp(pendingEmail, pin);
    setPinLoading(false);
    if (error) {
      toast({ title: "Invalid PIN", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome to the BVA!", description: "Your account has been verified." });
      handleClose(false);
      navigate("/member-registration");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wide">BVA Account</DialogTitle>
        </DialogHeader>

        {/* PIN verification step */}
        {pinStep ? (
          <div className="space-y-5 pt-1">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-muted p-5 text-center">
              <MailCheck className="h-10 w-10 text-accent" />
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a PIN to <span className="font-medium text-foreground">{pendingEmail}</span>.
                Enter it below to verify your account.
              </p>
              <p className="text-xs text-muted-foreground border border-dashed border-muted-foreground/40 rounded px-3 py-1.5">
                Don't see it? Check your <strong>Junk / Spam</strong> folder.
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="pin-input">Verification PIN</Label>
                <Input
                  id="pin-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="e.g. 123456"
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="tracking-widest text-center text-lg font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={pinLoading}>
                {pinLoading ? "Verifying…" : "Verify PIN"}
              </Button>
              <button
                type="button"
                onClick={resetAll}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to registration
              </button>
            </form>
          </div>
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    required
                    value={signInData.email}
                    onChange={(e) => setSignInData((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    required
                    value={signInData.password}
                    onChange={(e) => setSignInData((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={signInLoading}>
                  {signInLoading ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="reg-name">Display Name</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    required
                    value={registerData.displayName}
                    onChange={(e) => setRegisterData((p) => ({ ...p, displayName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    value={registerData.email}
                    onChange={(e) => setRegisterData((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    required
                    value={registerData.confirm}
                    onChange={(e) => setRegisterData((p) => ({ ...p, confirm: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={registerLoading}>
                  {registerLoading ? "Registering…" : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
