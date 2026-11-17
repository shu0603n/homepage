import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/auth/http";

const req = (headers: Record<string, string>) => new Request("http://internal:3000/api/x", { headers });

describe("siteUrl（メールのリンク先のドメイン）", () => {
  it("このサイトのドメインはそのまま使う", () => {
    expect(siteUrl("/reset-password/", req({ "x-forwarded-host": "www.emorislink.co.jp" })).origin).toBe("https://www.emorislink.co.jp");
    expect(siteUrl("/reset-password/", req({ "x-forwarded-host": "main.d33wn8ifx0n6p4.amplifyapp.com" })).origin).toBe("https://main.d33wn8ifx0n6p4.amplifyapp.com");
  });

  it("書き換えられた X-Forwarded-Host は使わない（正規の URL にする）", () => {
    expect(siteUrl("/reset-password/", req({ "x-forwarded-host": "evil.example.com" })).origin).toBe("https://www.emorislink.co.jp");
    expect(siteUrl("/reset-password/", req({ "x-forwarded-host": "evil.example.com, www.emorislink.co.jp" })).origin).toBe("https://www.emorislink.co.jp");
    expect(siteUrl("/reset-password/", req({ host: "www.emorislink.co.jp.evil.example.com" })).origin).toBe("https://www.emorislink.co.jp");
  });

  it("http を指定されても https にする", () => {
    expect(siteUrl("/", req({ "x-forwarded-host": "www.emorislink.co.jp", "x-forwarded-proto": "http" })).protocol).toBe("https:");
  });
});
