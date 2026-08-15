import { afterEach, describe, expect, it, vi } from "vitest";
import { 맵기물어보기 } from "./spicy";

/*
 * 이 파일이 지키는 것.
 *
 *   ① 서버가 잡아 준 말을 화면 보기 이름으로 옮긴다 — enum 이 사용자에게 안 보인다.
 *   ② **부정을 서버보다 우리가 더 믿는다.** 서버는 임베딩 유사도로 고르는데 그
 *      방식은 부정을 못 읽는다. 실서버로 재 봤다 —
 *        "안 매운 거" → confident=true, HOT
 *      매운 것을 못 드시는 분이 그렇게 말하면 매운맛이 들어간다. ②가 그걸 막는다.
 *   ③ 실패하면 조용히 물러난다. 이 경로가 없어도 앱은 손으로 고르기로 돌아간다.
 */

const 응답 = (본문: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => 본문 }) as unknown as Response;

afterEach(() => { vi.unstubAllGlobals(); });

const 붙이기 = (본문: unknown, status = 200) => {
  // 인자를 선언해 둬야 아래에서 mock.calls[0][1] 로 본문을 꺼내 볼 수 있다.
  const f = vi.fn(async (_url: string, _init?: RequestInit) => 응답(본문, status));
  vi.stubGlobal("fetch", f);
  return f;
};

describe("서버가 잡아 준 맵기를 화면 이름으로 옮긴다", () => {
  it("확정이면 화면 보기 이름을 돌려준다", async () => {
    const f = 붙이기({ confident: true, matchedLevel: "HOT", candidates: ["HOT"] });
    // enum(HOT)이 아니라 화면에 떠 있는 칩 이름이어야 한다. 사용자는 HOT 을 모른다.
    expect(await 맵기물어보기("불닭맛")).toEqual({ 고른값: "매운맛" });
    expect(f.mock.calls[0][0]).toBe("/api/bff/internal/spicy-level/match");
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ text: "불닭맛" });
  });

  it("애매하면 되물을 값들을 돌려준다 — 우리가 고르지 않는다", async () => {
    붙이기({ confident: false, matchedLevel: null, candidates: ["MEDIUM", "MILD"] });
    expect(await 맵기물어보기("얼큰한맛")).toEqual({ 되물을것: ["보통맛", "순한맛"] });
  });

  it("상관없음도 받는다", async () => {
    // 맵기 축은 네 칸이다. "아무거나" 라고 말하는 분이 실제로 있다.
    붙이기({ confident: true, matchedLevel: "NO_PREFERENCE", candidates: ["NO_PREFERENCE"] });
    expect(await 맵기물어보기("아무거나")).toEqual({ 고른값: "상관없음" });
  });

  it("모르는 enum 은 버린다", async () => {
    // 서버에 값이 하나 늘어도 화면에 없는 이름이 사용자에게 가면 안 된다.
    붙이기({ confident: false, matchedLevel: null, candidates: ["MEDIUM", "EXTRA_HOT"] });
    expect(await 맵기물어보기("얼큰한맛")).toEqual({ 고른값: "보통맛" });
  });
});

describe("부정은 서버보다 우리 표를 믿는다", () => {
  it("확정이어도 아니라고 말한 값은 안 받는다", async () => {
    /*
     * 실서버 실측이다. "안 매운 거" 를 보내면 confident=true 로 HOT 이 온다 —
     * "안 매운" 안에 "매운" 이 들어 있어서 매운맛 앵커와 가깝기 때문이다.
     *
     * 그대로 넣으면 매운 것을 못 드시는 분의 주문에 매운맛이 들어간다.
     * 되묻지도 않는다(confident=true). 우리 표는 이 문제를 이미 알고 있다.
     */
    붙이기({ confident: true, matchedLevel: "HOT", candidates: ["HOT", "MILD"] });
    const r = await 맵기물어보기("안 매운 거");
    expect(r).not.toEqual({ 고른값: "매운맛" });
    // 남은 후보가 있으면 그것으로 되묻는다. 무엇을 원하는지는 아직 모르기 때문이다.
    expect(r).toEqual({ 되물을것: ["순한맛"] });
  });

  it("후보에서도 아니라고 한 값을 빼고 되묻는다", async () => {
    붙이기({ confident: false, matchedLevel: null, candidates: ["HOT", "MEDIUM", "MILD"] });
    expect(await 맵기물어보기("안 맵게")).toEqual({ 되물을것: ["보통맛", "순한맛"] });
  });

  it("아니라고 한 것만 남으면 못 고른 것으로 둔다", async () => {
    // 짐작해서 넣지 않는다. 화면이 "못 골랐어요" 로 가고 사람이 손으로 짚는다.
    붙이기({ confident: true, matchedLevel: "HOT", candidates: ["HOT"] });
    expect(await 맵기물어보기("안 매운 걸로")).toEqual({ 못함: true });
  });
});

describe("실패하면 조용히 물러난다", () => {
  it("서버가 없으면(404) 못함", async () => {
    붙이기({ code: "NOT_ALLOWED" }, 404);
    expect(await 맵기물어보기("불닭맛")).toEqual({ 못함: true });
  });

  it("네트워크가 끊겨도 던지지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(맵기물어보기("불닭맛")).resolves.toEqual({ 못함: true });
  });

  it("빈 말과 너무 긴 말은 아예 안 보낸다", async () => {
    // 서버가 @NotBlank · @Size(max = 100) 을 건다. 보내 봐야 400 이고,
    // 이 경로는 호출당 비용이 나가는 임베딩을 부른다.
    const f = 붙이기({ confident: true, matchedLevel: "HOT", candidates: ["HOT"] });
    expect(await 맵기물어보기("   ")).toEqual({ 못함: true });
    expect(await 맵기물어보기("가".repeat(101))).toEqual({ 못함: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("본문이 이상해도 던지지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad"); } }) as unknown as Response));
    await expect(맵기물어보기("불닭맛")).resolves.toEqual({ 못함: true });
  });
});
