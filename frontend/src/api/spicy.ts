import { 아니라고했나 } from "@/api/voice";

/**
 * 말한 맵기를 서버가 골라 준다(팀 #133).
 *
 * ── 왜 서버가 필요한가 ───────────────────────────────────────────────────────
 *
 * 지금 말 맞추기(voice.ts)는 **화면에 떠 있는 보기와 글자를 대조**한다. 그래서
 * "매운맛"·"안 맵게" 처럼 표에 적어 둔 말은 잡지만, "불닭맛"·"얼큰한맛" 처럼
 * 표에 없는 말은 못 잡는다. 사람이 실제로 쓰는 말은 훨씬 많고, 그걸 전부
 * 앞에 적어 두는 것은 끝이 없다.
 *
 * 서버는 앵커 표현과의 임베딩 유사도로 고른다. 표에 없던 말도 잡는다.
 *
 * ── 그런데 서버 답을 그대로 믿지 않는다 ──────────────────────────────────────
 *
 * 유사도는 **부정을 못 읽는다.** "안 매운 거" 안에는 "매운" 이 들어 있어서
 * 매운맛 앵커와 가깝다. 실서버로 재 봤다:
 *
 *   "안 매운 거"     confident=true   HOT      ← 정반대인데 되묻지도 않는다
 *   "안매워요"       confident=false  [HOT, NO_PREFERENCE]
 *   "하나도 안 맵게"  confident=false  [NO_PREFERENCE]
 *
 * 매운 것을 못 드시는 분이 "안 매운 거" 라고 말하면 매운맛이 들어간다.
 * 그래서 우리 쪽 부정 표(voice.ts 의 아니라는말)로 한 번 거른다 — 그 표는
 * 이 문제를 이미 알고 만든 것이다.
 *
 * ── 실패하면 조용히 물러난다 ─────────────────────────────────────────────────
 *
 * 이 경로가 없어도 앱은 지금처럼 동작한다(손으로 고르기). 서버가 없거나
 * 느리거나 프로필이 안 켜져 있으면 못함 을 돌려주고, 화면은 원래 하던 대로
 * "못 골랐어요" 로 간다. 음성은 편의지 이 앱이 하는 일이 아니다.
 */

/** 서버가 쓰는 enum 과 화면 칩 이름. 화면에 없는 말을 사용자에게 들려주지 않는다. */
const 칩이름: Record<string, string> = {
  HOT: "매운맛",
  MEDIUM: "보통맛",
  MILD: "순한맛",
  NO_PREFERENCE: "상관없음",
};

export type 맵기결과 =
  /** 확정. 화면 칩 이름이다. */
  | { 고른값: string }
  /** 애매하다. 이 중에서 되물어야 한다. 화면 칩 이름들이다. */
  | { 되물을것: string[] }
  /** 못 골랐다(서버 없음·오류·부정 걸림). 화면은 원래 하던 대로 간다. */
  | { 못함: true };

/** 서버가 준 enum 목록을 화면 칩 이름으로. 모르는 값은 버린다. */
const 이름으로 = (값들: unknown): string[] =>
  Array.isArray(값들)
    ? 값들.filter((v): v is string => typeof v === "string").map((v) => 칩이름[v]).filter(Boolean)
    : [];

export const 맵기물어보기 = async (들은말: string, 영어인가 = false): Promise<맵기결과> => {
  const 글 = 들은말.replace(/\s+/g, " ").trim();
  // 서버가 @Size(max = 100) 을 걸어 두었다. 넘겨 봐야 400 이라 여기서 접는다.
  if (글 === "" || 글.length > 100) return { 못함: true };

  let res: Response;
  try {
    res = await fetch("/api/bff/internal/spicy-level/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: 글 }),
    });
  } catch {
    return { 못함: true };
  }
  if (!res.ok) return { 못함: true };

  const 본문 = await res.json().catch(() => null) as
    { confident?: boolean; matchedLevel?: string; candidates?: unknown } | null;
  if (!본문) return { 못함: true };

  /*
   * 부정으로 거른다. 서버가 뭐라고 했든, 사용자가 "그건 아니다" 라고 말한
   * 값은 안 받는다.
   *
   * 확정이 걸리면 되물음으로 내린다 — 버리지 않는 이유는, 부정했다는 것은
   * 무엇을 원하는지가 아니라 무엇을 원하지 않는지만 말한 것이라 여전히
   * 물어봐야 하기 때문이다.
   */
  const 원래후보 = 이름으로(본문.candidates);
  const 남은후보 = 원래후보.filter((이름) => !아니라고했나(글, 이름, 영어인가));
  const 부정걸림 = 남은후보.length !== 원래후보.length;

  if (본문.confident === true && typeof 본문.matchedLevel === "string") {
    const 이름 = 칩이름[본문.matchedLevel];
    if (이름 && !아니라고했나(글, 이름, 영어인가)) return { 고른값: 이름 };
    // 확정인데 우리 표가 아니라고 한다. 남은 것으로 되묻는다.
    const 나머지 = 남은후보.filter((n) => n !== 이름);
    return 나머지.length > 0 ? { 되물을것: 나머지 } : { 못함: true };
  }

  if (남은후보.length === 0) return { 못함: true };
  /*
   * 부정이 걸렸으면 **하나만 남아도 묻는다.**
   *
   * 사용자는 원하지 않는 것만 말했다("안 매운 거"). 남은 하나가 그 사람이
   * 원하는 것이라는 보장은 없다 — 순한맛일 수도 보통맛일 수도 있고, 서버가
   * 그 둘 중 하나만 후보로 올렸을 수도 있다. 우리가 고르면 그건 짐작이다.
   */
  if (남은후보.length === 1 && !부정걸림) return { 고른값: 남은후보[0] };
  return { 되물을것: 남은후보 };
};
