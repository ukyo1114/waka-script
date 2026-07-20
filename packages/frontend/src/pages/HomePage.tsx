import {
  Button,
  Center,
  Heading,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GuestLoginModal } from "../components/GuestLoginModal.tsx";
import { LoginModal } from "../components/LoginModal.tsx";
import {
  formatApiError,
  getMe,
  isLoggedIn,
  logout,
  refreshAccessToken,
  type PublicUser,
} from "../api/index.ts";

type HomeLocationState = {
  openLogin?: boolean;
  registered?: boolean;
  email?: string;
};

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as HomeLocationState | null) ?? {};

  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginRegistered, setLoginRegistered] = useState(false);

  const loadUser = useCallback(async () => {
    const me = await getMe();
    setUser(me);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (isLoggedIn()) {
          await loadUser();
          return;
        }
        try {
          await refreshAccessToken();
          await loadUser();
        } catch {
          // Cookie なし or 期限切れ — 未ログインのまま
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err));
          await logout();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadUser]);

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

  async function handleAuthSuccess() {
    setLoading(true);
    try {
      await loadUser();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setError(null);
  }

  if (loading) {
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
          <Button variant="outline" onClick={() => void handleLogout()}>
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
            <Text color="red.600" fontSize="sm">
              {error}
            </Text>
          )}

          <Stack gap="3" w="full">
            <Button size="lg" w="full" onClick={() => setLoginOpen(true)}>
              ログイン
            </Button>
            <Button
              size="lg"
              w="full"
              variant="outline"
              onClick={() => setGuestOpen(true)}
            >
              ゲストログイン
            </Button>
            <Button size="lg" w="full" variant="surface" asChild>
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
        onSuccess={() => void handleAuthSuccess()}
      />
      <GuestLoginModal
        open={guestOpen}
        onOpenChange={setGuestOpen}
        onSuccess={() => void handleAuthSuccess()}
      />
    </>
  );
}
