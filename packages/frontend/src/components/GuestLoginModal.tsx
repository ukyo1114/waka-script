import {
  Button,
  Dialog,
  Field,
  Input,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState, type FormEvent } from "react";
import { formatApiError, loginAsGuest } from "../api/index.ts";

type GuestLoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function GuestLoginModal({
  open,
  onOpenChange,
  onSuccess,
}: GuestLoginModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayName("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginAsGuest(
        displayName.trim() ? { displayName: displayName.trim() } : {},
      );
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <form onSubmit={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>ゲストログイン</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <Text color="fg.muted" fontSize="sm">
                    お試しプレイ用です。データは引き継がれません。
                  </Text>
                  {error && (
                    <Text color="red.600" fontSize="sm">
                      {error}
                    </Text>
                  )}
                  <Field.Root>
                    <Field.Label>表示名（任意）</Field.Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Guest"
                    />
                  </Field.Root>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" type="button">
                    キャンセル
                  </Button>
                </Dialog.ActionTrigger>
                <Button type="submit" loading={loading}>
                  はじめる
                </Button>
              </Dialog.Footer>
            </form>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
