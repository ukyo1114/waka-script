import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/** 旧 URL 互換: /login → トップでログインモーダルを開く */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    setDone(true);
    navigate("/", {
      replace: true,
      state: {
        openLogin: true,
        email: searchParams.get("email") ?? undefined,
      },
    });
  }, [done, navigate, searchParams]);

  return null;
}
