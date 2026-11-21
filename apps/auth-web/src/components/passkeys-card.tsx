import { useEffect, useState, type FormEvent } from "react";
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { Alert, Badge, Button } from "@niwa/ui/components";
import { Card, FormField, TextInput } from "./form-controls";
import {
  authApi,
  getErrorMessage,
  type PasskeyRecord,
} from "../lib/auth-api";
import { formatUnixDate } from "../lib/format";

export function PasskeysCard() {
  const supported =
    typeof window !== "undefined" && browserSupportsWebAuthn();

  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    authApi
      .listPasskeys(controller.signal)
      .then((res) => setPasskeys(res.passkeys))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setErrorMsg(getErrorMessage(err, "Failed to load passkeys."));
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setRegistering(true);

    try {
      const { challenge_id, options } =
        await authApi.startPasskeyRegistration();
      const attestation = await startRegistration({
        optionsJSON: options as unknown as PublicKeyCredentialCreationOptionsJSON,
      });

      const { passkey } = await authApi.verifyPasskeyRegistration({
        challenge_id,
        name: newName.trim() || undefined,
        response: attestation as unknown as Record<string, unknown>,
      });

      setPasskeys((prev) => [passkey, ...prev]);
      setNewName("");
      setSuccessMsg(`Passkey "${passkey.name}" added to your account.`);
    } catch (err) {
      const errName = (err as { name?: string })?.name;
      if (errName === "NotAllowedError" || errName === "AbortError") {
        setErrorMsg("Passkey registration was cancelled.");
      } else {
        setErrorMsg(getErrorMessage(err, "Failed to register passkey."));
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(id);

    try {
      const { passkey } = await authApi.renamePasskey(id, trimmed);
      setPasskeys((prev) => prev.map((p) => (p.id === id ? passkey : p)));
      setEditingId(null);
      setEditingName("");
      setSuccessMsg("Passkey renamed.");
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to rename passkey."));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (passkey: PasskeyRecord) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(passkey.id);

    try {
      await authApi.deletePasskey(passkey.id);
      setPasskeys((prev) => prev.filter((p) => p.id !== passkey.id));
      setSuccessMsg(`Passkey "${passkey.name}" removed.`);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to remove passkey."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card
      title="Passkeys (WebAuthn)"
      description="Sign in without a password using Touch ID, Face ID, iCloud Keychain, or a hardware security key."
    >
      <div className="space-y-4">
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        {successMsg && <Alert variant="success">{successMsg}</Alert>}

        {!supported && (
          <Alert variant="warning">
            This browser does not support WebAuthn passkeys.
          </Alert>
        )}

        {supported && (
          <form
            onSubmit={handleRegister}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <FormField
                label="Passkey label (optional)"
                htmlFor="new-passkey-name"
                hint="e.g. MacBook Touch ID or YubiKey"
              >
                <TextInput
                  id="new-passkey-name"
                  type="text"
                  placeholder="MacBook Pro Touch ID"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={registering}
                  maxLength={100}
                />
              </FormField>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={registering}
            >
              {registering ? "Waiting for device..." : "Add passkey"}
            </Button>
          </form>
        )}

        <div className="divide-y divide-neutral-800/80 border-t border-neutral-800/80 pt-3">
          {loading ? (
            <p className="py-2 text-xs text-neutral-500">Loading passkeys...</p>
          ) : passkeys.length === 0 ? (
            <p className="py-2 text-xs text-neutral-500">
              No passkeys registered yet. Add one above to enable passwordless
              sign-in.
            </p>
          ) : (
            passkeys.map((passkey) => {
              const isEditing = editingId === passkey.id;
              const isBusy = busyId === passkey.id;

              return (
                <div
                  key={passkey.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <TextInput
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          disabled={isBusy}
                          maxLength={100}
                          className="max-w-xs"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => handleRename(passkey.id)}
                          disabled={isBusy || !editingName.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          disabled={isBusy}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium text-neutral-100">
                          {passkey.name}
                        </p>
                        <Badge
                          variant={
                            passkey.device_type === "multiDevice"
                              ? "info"
                              : "neutral"
                          }
                        >
                          {passkey.device_type === "multiDevice"
                            ? "Synced"
                            : "Device-bound"}
                        </Badge>
                      </div>
                    )}
                    <p className="text-[11px] text-neutral-500">
                      Added {formatUnixDate(passkey.created_at)}
                      {passkey.last_used_at
                        ? ` · Last used ${formatUnixDate(passkey.last_used_at)}`
                        : " · Never used"}
                    </p>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(passkey.id);
                          setEditingName(passkey.name);
                        }}
                        disabled={isBusy}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(passkey)}
                        disabled={isBusy}
                      >
                        {isBusy ? "Removing..." : "Remove"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
