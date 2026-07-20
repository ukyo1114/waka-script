import { z } from "zod";
import { clearTokens, saveAccessToken } from "./auth-storage.ts";
import { request } from "./client.ts";
import type { LoginResponse, PublicUser, RegisterResponse } from "./types.ts";

const emailSchema = z.string().trim().min(1).email();
const nonEmptyString = z.string().trim().min(1);

const registerInputSchema = z.object({
  token: nonEmptyString,
  password: nonEmptyString,
  displayName: nonEmptyString,
});

const loginInputSchema = z.object({
  email: emailSchema,
  password: nonEmptyString,
});

export async function register(input: {
  token: string;
  password: string;
  displayName: string;
}): Promise<RegisterResponse> {
  const data = registerInputSchema.parse(input);
  return request<RegisterResponse>("/user/register", {
    method: "POST",
    body: data,
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const data = loginInputSchema.parse(input);
  const result = await request<LoginResponse>("/user/login", {
    method: "POST",
    body: data,
  });
  saveAccessToken(result.accessToken);
  return result;
}

export async function getMe(): Promise<PublicUser> {
  return request<PublicUser>("/user/me", { auth: true });
}

export async function refreshAccessToken(): Promise<string> {
  const result = await request<{ accessToken: string }>("/user/token/refresh", {
    method: "POST",
  });
  saveAccessToken(result.accessToken);
  return result.accessToken;
}

export async function logout(): Promise<void> {
  try {
    await request<void>("/user/logout", { method: "POST" });
  } finally {
    clearTokens();
  }
}

export async function loginAsGuest(input: {
  displayName?: string;
} = {}): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/user/guest", {
    method: "POST",
    body: input,
  });
  saveAccessToken(result.accessToken);
  return result;
}
