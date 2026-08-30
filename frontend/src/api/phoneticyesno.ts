import { 개인정보같은글 } from "@/api/account";
import { 연동기록, 팀백엔드모드 } from "@/api/devlog";

/**
 * 신뢰도 게이트(백엔드 자신없나())는 통과했지만 예/아니오 어느 쪽으로도 못
 * 맞춘 텍스트를, 이미 확인된 발음-혼동 anchor 와 자모 거리로 한 번 더
 * 구제해 본다(2차 방어선 — PhoneticYesNoMatchingService 참고).
 *
 * ── 왜 프론트가 아니라 서버에서 하는가 ──────────────────────────────────────
 *
 * 처음엔 프론트에 두는 게 더 간단해 보였다. 하지만 anchor 목록(확인된
 * 오인식 쌍)은 사람이 계속 늘려 갈 자료다 — 새 오인식이 반복되는 게
 * 확인되면 그때 행을 추가한다(VoiceCorrectionLog 로 사람이 검토). 그 값을
 * 프론트에 박아 두면 배포마다 새로 빌드해야 한다. 서버 표에 두면 앱을
 * 다시 빌드하지 않고도 anchor 를 늘릴 수 있다.
 *
 * ── 실패하면 조용히 물러난다 ─────────────────────────────────────────────────
 *
 * 이 경로가 없거나 느려도 화면은 원래 하던 대로 "못 골랐어요" 로 간다.
 * 이건 마지막 구제 시도지 이 앱이 반드시 해야 하는 일이 아니다(spicy.ts 와
 * 같은 태도).
 */

export type 발음구제결과 =
  /** 확정. "YES" 또는 "NO". */
  | { 구제됨: "YES" | "NO" }
  /** 못 구제했다(서버 없음·오류·anchor 와 안 가까움). 화면은 원래 하던 대로 간다. */
  | { 구제안됨: true };

/** 서버가 이만큼 안에 답하지 않으면 포기한다. spicy.ts 와 같은 값. */
const 기다릴시간 = 8000;

export const 발음으로구제하기 = async (들은말: string): Promise<발음구제결과> => {
  const 글 = 들은말.replace(/\s+/g, " ").trim();
  // 서버가 @Size(max = 200) 을 걸어 두었다. 넘겨 봐야 400 이라 여기서 접는다.
  if (글 === "" || 글.length > 200) return { 구제안됨: true };

  // 실제 개인정보는 받지도 저장하지도 않는다는 약속을 여기서도 지킨다(spicy.ts 와 같은 문).
  if (개인정보같은글(글)) return { 구제안됨: true };

  const 경로 = "/internal/voice/phonetic-yes-no";
  const 부를곳 = "/api/bff" + 경로;
  const 시작 = 팀백엔드모드 ? performance.now() : 0;
  const 보낼본문 = JSON.stringify({ text: 글 });

  const 적기 = (상태: number | "실패", 응답본문?: string) => {
    if (!팀백엔드모드) return;
    연동기록.남기기({
      방법: "POST", 경로, 상태,
      걸린시간: Math.round(performance.now() - 시작), 시각: Date.now(),
      요청: 보낼본문,
      ...(응답본문 === undefined ? {} : { 응답: 응답본문 }),
    });
  };

  const 시계 = new AbortController();
  const 타이머 = setTimeout(() => 시계.abort(), 기다릴시간);
  let res: Response;
  try {
    res = await fetch(부를곳, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: 보낼본문,
      signal: 시계.signal,
    });
  } catch {
    // 끊겼든 시간이 다 됐든 사용자가 할 일은 같다 — 원래 하던 대로 "못 골랐어요".
    적기("실패");
    return { 구제안됨: true };
  } finally {
    clearTimeout(타이머);
  }

  const 받은글 = await res.text().catch(() => "");
  적기(res.status, 받은글);
  if (!res.ok) return { 구제안됨: true };

  let 본문: { matched?: boolean; correctedTo?: string } | null = null;
  try { 본문 = 받은글 ? JSON.parse(받은글) : null; } catch { 본문 = null; }
  if (!본문) return { 구제안됨: true };

  if (본문.matched === true && (본문.correctedTo === "YES" || 본문.correctedTo === "NO")) {
    return { 구제됨: 본문.correctedTo };
  }
  return { 구제안됨: true };
};
