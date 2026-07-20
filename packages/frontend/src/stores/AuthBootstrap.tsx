import { useEffect } from "react";
import { useAuthStore } from "../stores/index.ts";

/** アプリ起動時にセッション復元（access / refresh Cookie） */
export function AuthBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return null;
}
