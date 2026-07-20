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
import { formatApiError, login } from "../api/index.ts";

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  registered?: boolean;
  onSuccess: () => void;
};

export function LoginModal({
  open,
  onOpenChange,
  initialEmail = "",
  registered = false,
  onSuccess,
}: LoginModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setPassword("");
      setError(null);
    }
  }, [open, initialEmail]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
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
                <Dialog.Title>ログイン</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  {registered && (
                    <Text color="fg.success" fontSize="sm">
                      登録が完了しました。ログインしてください。
                    </Text>
                  )}
                  {error && (
                    <Text color="fg.error" fontSize="sm">
                      {error}
                    </Text>
                  )}
                  <Field.Root required>
                    <Field.Label>メールアドレス</Field.Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>パスワード</Field.Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
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
                <Button type="submit" colorPalette="blue" loading={loading}>
                  ログイン
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
