import { useEffect, useState, type FormEvent } from "react";
import { changePasswordSchema, updateUserSchema } from "@niwa/auth-validators";
import { Alert, Badge, Button } from "@niwa/ui/components";
import { Card, FormField, TextInput } from "../../components/form-controls";
import { useAuth } from "../../context/auth-context";
import {
  authApi,
  extractApiFieldErrors,
  getErrorMessage,
} from "../../lib/auth-api";
import { extractZodFieldErrors, formatUnixDate } from "../../lib/format";

const UPCOMING_SECURITY_FEATURES = [
  {
    title: "Passkeys (WebAuthn)",
    phase: "Phase 6",
    description:
      "Sign in without a password using Face ID, Touch ID, or hardware security keys.",
  },
  {
    title: "Authenticator App (TOTP 2FA)",
    phase: "Phase 6",
    description:
      "Protect your account with time-based one-time passcodes and single-use recovery codes.",
  },
];

export default function AccountProfileRoute() {
  const { user, setUser } = useAuth();

  // Profile form state
  const [name, setName] = useState(user?.name ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    user?.whatsapp_number ?? ""
  );
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>(
    {}
  );
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(
    null
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {}
  );
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(
    null
  );
  const [savingPassword, setSavingPassword] = useState(false);

  // Email verification resend state
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyErrorMsg, setVerifyErrorMsg] = useState<string | null>(null);

  const handleResendVerification = async () => {
    setVerifyMsg(null);
    setVerifyErrorMsg(null);
    setResendingVerification(true);
    try {
      const res = await authApi.resendVerificationEmail();
      setVerifyMsg(
        res.message || "Verification email sent. Check your inbox."
      );
    } catch (err) {
      setVerifyErrorMsg(
        getErrorMessage(err, "Unable to resend verification email.")
      );
    } finally {
      setResendingVerification(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setWhatsappNumber(user.whatsapp_number ?? "");
  }, [user]);

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);
    setProfileErrors({});

    const payload = {
      name: name.trim(),
      ...(whatsappNumber.trim()
        ? { whatsapp_number: whatsappNumber.trim() }
        : {}),
    };

    const parsed = updateUserSchema.safeParse(payload);
    if (!parsed.success) {
      setProfileErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setSavingProfile(true);
    try {
      const { user: updatedUser } = await authApi.updateMe(parsed.data);
      setUser(updatedUser);
      setProfileSuccessMsg("Profile updated successfully.");
    } catch (err) {
      setProfileErrors(extractApiFieldErrors(err));
      setProfileErrorMsg(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);
    setPasswordErrors({});

    if (newPassword !== confirmPassword) {
      setPasswordErrors({
        confirm_password: "New password confirmation does not match",
      });
      return;
    }

    const parsed = changePasswordSchema.safeParse({
      current_password: currentPassword,
      new_password: newPassword,
      revoke_other_sessions: revokeOtherSessions,
    });

    if (!parsed.success) {
      setPasswordErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword(parsed.data);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccessMsg(
        res.revoked_sessions > 0
          ? `${res.message}. Signed out ${res.revoked_sessions} other session(s).`
          : `${res.message}.`
      );
    } catch (err) {
      setPasswordErrors(extractApiFieldErrors(err));
      setPasswordErrorMsg(getErrorMessage(err, "Failed to update password."));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
          Profile &amp; Security
        </h1>
        <p className="mt-1 text-xs text-neutral-400">
          Manage your Niwa identity details and account security credentials.
        </p>
      </div>

      {/* Email Verification Banner */}
      {user && !user.email_verified_at && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-amber-200">
                  Verify your email address
                </p>
                <Badge variant="warning">Unverified</Badge>
              </div>
              <p className="text-xs text-amber-200/80">
                Confirm <strong>{user.email}</strong> to secure your Niwa
                account and ensure reliable password recovery.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResendVerification}
              disabled={resendingVerification}
            >
              {resendingVerification
                ? "Sending..."
                : "Resend verification email"}
            </Button>
          </div>
          {verifyMsg && (
            <div className="mt-3">
              <Alert variant="success">{verifyMsg}</Alert>
            </div>
          )}
          {verifyErrorMsg && (
            <div className="mt-3">
              <Alert variant="error">{verifyErrorMsg}</Alert>
            </div>
          )}
        </div>
      )}

      {/* Profile Card */}
      <Card
        title="Profile Information"
        description="Your name and contact details shared across connected Niwa applications."
      >
        <form onSubmit={handleProfileSubmit} className="space-y-4" noValidate>
          {profileErrorMsg && <Alert variant="error">{profileErrorMsg}</Alert>}
          {profileSuccessMsg && (
            <Alert variant="success">{profileSuccessMsg}</Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email address" hint="Primary identifier">
              <TextInput
                type="email"
                value={user?.email ?? ""}
                disabled
                readOnly
              />
            </FormField>

            <FormField label="Member since">
              <TextInput
                type="text"
                value={user ? formatUnixDate(user.created_at) : "—"}
                disabled
                readOnly
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Full name"
              htmlFor="profile-name"
              error={profileErrors.name}
            >
              <TextInput
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={savingProfile}
                required
              />
            </FormField>

            <FormField
              label="WhatsApp number"
              htmlFor="profile-whatsapp"
              hint="8–25 characters"
              error={profileErrors.whatsapp_number}
            >
              <TextInput
                id="profile-whatsapp"
                type="tel"
                placeholder="08123456789"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                disabled={savingProfile}
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={savingProfile}
            >
              {savingProfile ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Card */}
      <Card
        title="Change Password"
        description="Update your password. Use a unique password of at least 8 characters."
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
          {passwordErrorMsg && (
            <Alert variant="error">{passwordErrorMsg}</Alert>
          )}
          {passwordSuccessMsg && (
            <Alert variant="success">{passwordSuccessMsg}</Alert>
          )}

          <FormField
            label="Current password"
            htmlFor="current-password"
            error={passwordErrors.current_password}
          >
            <TextInput
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={savingPassword}
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="New password"
              htmlFor="new-password"
              hint="Min. 8 characters"
              error={passwordErrors.new_password}
            >
              <TextInput
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={savingPassword}
                required
              />
            </FormField>

            <FormField
              label="Confirm new password"
              htmlFor="confirm-password"
              error={passwordErrors.confirm_password}
            >
              <TextInput
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={savingPassword}
                required
              />
            </FormField>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-neutral-800/80 bg-neutral-950/50 p-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={revokeOtherSessions}
              onChange={(e) => setRevokeOtherSessions(e.target.checked)}
              disabled={savingPassword}
              className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-900 accent-emerald-500"
            />
            <span>
              <span className="font-medium text-neutral-200">
                Sign out other devices
              </span>
              <span className="block text-[11px] text-neutral-500">
                Revokes all other active Niwa sessions while keeping this device
                signed in.
              </span>
            </span>
          </label>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={savingPassword}
            >
              {savingPassword ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Upcoming Security Features (Phase 5 & 6) */}
      <Card
        title="Additional Security"
        description="Upcoming authentication and verification methods for your Niwa account."
      >
        <div className="divide-y divide-neutral-800/80">
          {UPCOMING_SECURITY_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-neutral-200">
                  {feature.title}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {feature.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{feature.phase}</Badge>
                <Badge variant="warning">Coming soon</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
