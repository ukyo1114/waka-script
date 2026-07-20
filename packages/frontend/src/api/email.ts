import { z } from "zod";
import { request } from "./client.ts";
import type { SendCodeResponse, VerifyCodeResponse } from "./types.ts";

const emailSchema = z.string().trim().min(1).email();
const codeSchema = z.string().trim().min(1);

export async function sendRegisterCode(email: string): Promise<SendCodeResponse> {
  const parsed = emailSchema.parse(email);
  return request<SendCodeResponse>("/email/send/register", {
    method: "POST",
    body: { email: parsed },
  });
}

export async function verifyRegisterCode(
  email: string,
  code: string,
): Promise<VerifyCodeResponse> {
  const parsedEmail = emailSchema.parse(email);
  const parsedCode = codeSchema.parse(code);
  return request<VerifyCodeResponse>("/email/verify/register", {
    method: "POST",
    body: { email: parsedEmail, code: parsedCode },
  });
}
