import { afterEach, describe, expect, it, vi } from "vitest";
import { 맵기물어보기 } from "./spicy";

/*
 * 이 파일이 지키는 것.
 *
 *   ① 서버가 잡아 준 말을 화면 보기 이름으로 옮긴다 — enum 이 사용자에게 안 보인다.
 *   ② **부정은 서버가 읽는다.** 예전에는 우리 부정어 표로 서버 답을 되거르는
 *      겹이 있었다(서버가 "안 매운 거" 를 confident=true HOT 으로 주던 때).
 *      팀 #138 이 서버에서 고쳤고, 배포본으로 확인한 뒤 그 겹을 걷었다.
 *      아래 "부정은 이제 서버가 읽는다" 가 서버가 계속 그 일을 하는지 붙잡는다.
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

  it("모르는 enum 은 화면에 안 내보내되, 서버의 '모르겠다' 를 지우지는 않는다", async () => {
    /*
     * 화면에 없는 이름을 사용자에게 보여 주면 안 되니 EXTRA_HOT 은 뺀다.
     * 그런데 빼고 나면 보통맛 하나만 남는다 — 그걸 확정으로 삼으면 **서버가
     * 망설인 것을 우리가 없애는 셈**이다. 서버는 둘 사이에서 확신을 못 했다.
     */
    붙이기({ confident: false, matchedLevel: null, candidates: ["MEDIUM", "EXTRA_HOT"] });
    expect(await 맵기물어보기("얼큰한맛")).toEqual({ 되물을것: ["보통맛"] });
  });

  it("확신 못 한 답은 후보가 하나여도 되묻는다", async () => {
    /*
     * 아래 본문은 **지어낸 것이다.** 지금 서버로 같은 말을 보내면 후보를 둘 준다
     * (2026-08-15, #138 배포 뒤 실측):
     *
     *   "하나도 안 맵게" → confident=false, candidates=["MILD","MEDIUM"]
     *
     * 그래도 이 시험을 두는 이유는, 규칙이 **후보 개수가 아니라 confident**에
     * 걸려 있기 때문이다. 계약상 서버는 확신하지 못하면서 후보를 하나만 줄 수
     * 있고, #138 전에는 실제로 그랬다(그때 "하나도 안 맵게" 는
     * candidates=["NO_PREFERENCE"] 하나였다). 그때 우리는 그것을 자동으로
     * 골랐다 — 맵기를 못 드셔서 그렇게 말한 분의 주문이 물어본 적도 없이
     * '상관없음' 으로 넘어갔다.
     *
     * 서버가 되물을 문장(clarificationQuestion)까지 만들어 보낸다는 것은,
     * 그쪽도 묻고 싶다는 뜻이다. 그걸 우리가 대신 고르지 않는다.
     */
    붙이기({ confident: false, matchedLevel: null, candidates: ["NO_PREFERENCE"] });
    expect(await 맵기물어보기("하나도 안 맵게")).toEqual({ 되물을것: ["상관없음"] });
  });

  it("지금 서버가 실제로 주는 부정문 응답도 되묻기로 간다", async () => {
    // 위가 지어낸 것이라, 실측 본문 하나를 나란히 둔다(#138 배포 뒤).
    붙이기({ confident: false, matchedLevel: null, candidates: ["MILD", "MEDIUM"] });
    expect(await 맵기물어보기("안 매운 거")).toEqual({ 되물을것: ["순한맛", "보통맛"] });
  });

  it("확신한 답은 예전처럼 그대로 확정한다", async () => {
    // 위 시험이 '언제나 되묻는다' 로 헛통과하지 않도록 지킨다.
    붙이기({ confident: true, matchedLevel: "MEDIUM", candidates: ["MEDIUM"] });
    expect(await 맵기물어보기("얼큰한맛")).toEqual({ 고른값: "보통맛" });
  });
});

describe("개인정보처럼 보이는 말은 보내지 않는다", () => {
  /*
   * 여기 오는 것은 보기와도 예/아니오와도 안 맞은 말이라, 사람이 무슨 말을
   * 했는지 알 수 없다. 그대로 보내면 그 말이 BFF 를 지나 백엔드를 거쳐
   * OpenAI 까지 간다. 이 앱은 실제 개인정보를 받지도 저장하지도 않는다고
   * 화면에서 약속하고 있다.
   */
  it("전화번호·주민번호·주소는 네트워크로 안 나간다", async () => {
    const f = 붙이기({ confident: true, matchedLevel: "HOT", candidates: ["HOT"] });
    for (const 말 of ["010-1234-5678", "901010-1234567", "행복로 12"]) {
      expect(await 맵기물어보기(말)).toEqual({ 못함: true });
    }
    expect(f).not.toHaveBeenCalled();
  });
});

describe("부정은 이제 서버가 읽는다", () => {
  /*
   * 여기 있던 세 시험은 우리 부정어 표가 서버 답을 되거르는 것을 지키던 것이다.
   * 서버가 부정을 못 읽던 때의 방어였고, 팀 #138 이 서버에서 고친 뒤 걷어냈다.
   *
   * **이 시험들이 서버 회귀를 잡아 주지는 않는다.** fetch 를 흉내 내므로 서버가
   * 무엇을 답하든 여기는 초록이다. 지키는 것은 '서버가 이렇게 답하면 우리는
   * 이렇게 옮긴다' 는 우리 쪽 약속뿐이다 — 되거르는 겹이 없으니, 서버 답이
   * 곧 사용자가 보는 것이다.
   *
   * 서버가 되돌아갔는지는 실서버에 물어봐야만 안다:
   *
   *   curl -s -X POST https://api.hyunwoocha.site/internal/spicy-level/match \
   *     -H 'content-type: application/json' -d '{"text":"안 매운 거"}'
   *   # confident 가 다시 true/HOT 이면 이 파일이 아니라 서버가 문제다.
   *
   * 아래 본문은 #138 이 들어간 뒤 실서버에서 받은 모양이다.
   */
  it("부정어가 들어간 말은 서버가 되물으라고 하고, 우리는 그대로 옮긴다", async () => {
    붙이기({ confident: false, matchedLevel: null, candidates: ["MILD", "MEDIUM"] });
    const r = await 맵기물어보기("안 매운 거");
    // 예전에 이 자리에서 매운맛이 나왔다. 그것이 다시 나오면 안 된다.
    expect(r).not.toEqual({ 고른값: "매운맛" });
    expect(r).toEqual({ 되물을것: ["순한맛", "보통맛"] });
  });

  it("부정어가 없는 말은 예전처럼 확정된다", async () => {
    // 부정어 필터가 정상 표현까지 잡아 버리면 이 시험이 깨진다(서버 쪽 회귀).
    붙이기({ confident: true, matchedLevel: "HOT", candidates: ["HOT"] });
    expect(await 맵기물어보기("매운 거")).toEqual({ 고른값: "매운맛" });
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
