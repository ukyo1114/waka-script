import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Center,
  Heading,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { GuestLoginModal } from "../components/GuestLoginModal.tsx";
import { LoginModal } from "../components/LoginModal.tsx";
import { useAuthStore } from "../stores/index.ts";

type HomeLocationState = {
  openLogin?: boolean;
  registered?: boolean;
  email?: string;
};

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as HomeLocationState | null) ?? {};

  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const logout = useAuthStore((s) => s.logout);

  const [loginOpen, setLoginOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginRegistered, setLoginRegistered] = useState(false);

  useEffect(() => {
    if (locationState.openLogin) {
      setLoginEmail(locationState.email ?? "");
      setLoginRegistered(locationState.registered ?? false);
      setLoginOpen(true);
      navigate("/", { replace: true, state: null });
    }
  }, [
    locationState.email,
    locationState.openLogin,
    locationState.registered,
    navigate,
  ]);

  if (status === "idle" || status === "loading") {
    return (
      <Center minH="100vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  if (user) {
    return (
      <Center minH="100vh" px="4">
        <VStack gap="4" textAlign="center">
          <Heading size="lg">ようこそ、{user.displayName} さん</Heading>
          <Text color="fg.muted">
            {user.isGuest ? "ゲスト" : user.email ?? "登録ユーザー"}
          </Text>
          <Button
            variant="outline"
            colorPalette="gray"
            onClick={() => void logout()}
          >
            ログアウト
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <>
      <Center minH="100vh" px="4">
        <VStack gap="8" maxW="sm" w="full" textAlign="center">
          <Stack gap="2">
            <Heading size="2xl">人狼</Heading>
            <Text color="fg.muted">ログインしてゲームを始めましょう</Text>
          </Stack>

          {error && (
            <Text color="fg.error" fontSize="sm">
              {error}
            </Text>
          )}

          <Stack gap="3" w="full">
            <Button
              size="lg"
              w="full"
              colorPalette="blue"
              onClick={() => setLoginOpen(true)}
            >
              ログイン
            </Button>
            <Button
              size="lg"
              w="full"
              variant="outline"
              colorPalette="gray"
              onClick={() => setGuestOpen(true)}
            >
              ゲストログイン
            </Button>
            <Button size="lg" w="full" variant="surface" colorPalette="gray" asChild>
              <Link to="/register">新規登録</Link>
            </Button>
          </Stack>
        </VStack>
      </Center>

      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        initialEmail={loginEmail}
        registered={loginRegistered}
        onSuccess={() => void refreshUser()}
      />
      <GuestLoginModal
        open={guestOpen}
        onOpenChange={setGuestOpen}
        onSuccess={() => void refreshUser()}
      />
    </>
  );
}
