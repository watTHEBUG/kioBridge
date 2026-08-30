import { afterEach, describe, expect, it, vi } from "vitest";
import { 발음으로구제하기 } from "./phoneticyesno";
import { 연동기록 } from "./devlog";

// 기록은 팀 백엔드 모드에서만 남는다 — spicy.test.ts 와 같은 이유로 켜 둔다.
vi.mock("./devlog", async (원래) => {
  const 실제 = await 원래<typeof import("./devlog")>();
  return { ...실제, 팀백엔드모드: true };
});

const 응답 = (본문: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof 본문 === "string" ? 본문 : JSON.stringify(본문)),
  }) as unknown as Response;

afterEach(() => { vi.unstubAllGlobals(); });

const 붙이기 = (본문: unknown, status = 200) => {
  const f = vi.fn(async (_url: string, _init?: RequestInit) => 응답(본문, status));
  vi.stubGlobal("fetch", f);
  return f;
};

describe("서버가 구제한 값을 그대로 옮긴다", () => {
  it("matched=true 이면 구제됨을 돌려준다", async () => {
    const f = 붙이기({ matched: true, correctedTo: "NO" });
    expect(await 발음으로구제하기("안녕")).toEqual({ 구제됨: "NO" });
    expect(f.mock.calls[0][0]).toBe("/api/bff/internal/voice/phonetic-yes-no");
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ text: "안녕" });
  });

  it("matched=false 면 구제안됨을 돌려준다", async () => {
    붙이기({ matched: false, correctedTo: null });
    expect(await 발음으로구제하기("안내")).toEqual({ 구제안됨: true });
  });

  it("correctedTo 가 YES/NO 가 아니면 구제안됨으로 접는다", async () => {
    // 서버 계약이 깨져도 화면에 이상한 값을 실어 나르지 않는다.
    붙이기({ matched: true, correctedTo: "MAYBE" });
    expect(await 발음으로구제하기("안녕")).toEqual({ 구제안됨: true });
  });
});

describe("개인정보처럼 보이는 말은 보내지 않는다", () => {
  it("전화번호·주민번호·주소는 네트워크로 안 나간다", async () => {
    const f = 붙이기({ matched: true, correctedTo: "NO" });
    for (const 말 of ["010-1234-5678", "901010-1234567", "행복로 12"]) {
      expect(await 발음으로구제하기(말)).toEqual({ 구제안됨: true });
    }
    expect(f).not.toHaveBeenCalled();
  });
});

describe("실패하면 조용히 물러난다", () => {
  it("서버가 없으면(404) 구제안됨", async () => {
    붙이기({ code: "NOT_ALLOWED" }, 404);
    expect(await 발음으로구제하기("안녕")).toEqual({ 구제안됨: true });
  });

  it("네트워크가 끊겨도 던지지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(발음으로구제하기("안녕")).resolves.toEqual({ 구제안됨: true });
  });

  it("빈 말과 너무 긴 말은 아예 안 보낸다", async () => {
    // 서버가 @NotBlank · @Size(max = 200) 을 건다.
    const f = 붙이기({ matched: true, correctedTo: "NO" });
    expect(await 발음으로구제하기("   ")).toEqual({ 구제안됨: true });
    expect(await 발음으로구제하기("가".repeat(201))).toEqual({ 구제안됨: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("JSON 이 아닌 본문이 와도 던지지 않는다", async () => {
    붙이기("<html>502</html>");
    await expect(발음으로구제하기("안녕")).resolves.toEqual({ 구제안됨: true });
  });

  it("본문을 읽다 터져도 던지지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, text: async () => { throw new Error("bad"); },
    }) as unknown as Response));
    await expect(발음으로구제하기("안녕")).resolves.toEqual({ 구제안됨: true });
  });
});

describe("개발 패널에 이 호출이 보인다", () => {
  it("경로를 /api/bff 없이 남긴다", async () => {
    연동기록.비우기();
    const f = 붙이기({ matched: true, correctedTo: "NO" });
    await 발음으로구제하기("안녕");

    const [한줄] = 연동기록.읽기();
    expect(한줄.경로).toBe("/internal/voice/phonetic-yes-no");
    expect(한줄.경로.startsWith("/api/bff")).toBe(false);
    expect(f.mock.calls[0][0]).toBe("/api/bff/internal/voice/phonetic-yes-no");
  });
});
