import { 개인정보같은글 } from "@/api/account";
import { 연동기록, 팀백엔드모드 } from "@/api/devlog";

/**
 * 음성 인식이 못 맞춰서 사용자가 손으로 고친 순간을, 서버가 사람이 나중에
 * 읽어 보는 자리에 남긴다(팀 트러블슈팅 — "아니오" 가 "안녕"으로 통째로 잘못
 * 들리던 사례).
 *
 * ── 자동으로 판정을 바꾸지 않는다 ────────────────────────────────────────────
 *
 * 이 호출은 서버의 예아니오()/신뢰도 게이트 규칙을 그 자리에서 바꾸지 않는다.
 * "안녕" 이 한 번 아니오 의 오인식이었다고 다음에도 항상 그렇다는 보장이 없고,
 * 잘못된 정정 한 번이 모든 사용자의 판정을 오염시킬 위험이 있어서다(자세한
 * 이유는 백엔드 VoiceCorrectionLog 클래스 주석에 있다). 여기서 하는 일은
 * 자료를 남기는 것까지고, 그 자료를 보고 힌트 어휘나 임계값을 고치는 것은
 * 사람의 몫으로 남긴다.
 *
 * ── 실패해도 조용히 물러난다 ─────────────────────────────────────────────────
 *
 * 이 호출이 실패해도 사용자가 방금 누른 답은 이미 화면에 반영돼 있다(먼저
 * 넣기() 가 불리고 그다음에 이 함수가 불린다 — 호출부 참고). 그러니 이 함수는
 * 결과를 기다리게 만들거나 실패를 사용자에게 보여줄 이유가 없다. 기록에만
 * 남긴다.
 */

/** 서버가 이만큼 안에 답하지 않으면 포기한다. spicy.ts 와 같은 값 — 곁다리 호출이라 짧게 잡는다. */
const 기다릴시간 = 8000;

export const 정정기록남기기 = async (
  questionType: "YES_NO",
  recognizedText: string,
  correctedTo: "YES" | "NO",
): Promise<void> => {
  // 목 백엔드에는 이 경로가 없다. 팀 백엔드일 때만 의미가 있다(spicy.ts 와 같은 가드).
  if (!팀백엔드모드) return;

  const 글 = recognizedText.trim();
  if (글 === "" || 글.length > 200) return;
  // 실제 개인정보는 받지도 저장하지도 않는다는 약속을 여기서도 지킨다(spicy.ts 와 같은 문).
  if (개인정보같은글(글)) return;

  const 경로 = "/api/v1/voice/correction-log";
  const 부를곳 = "/api/bff" + 경로;
  const 시작 = performance.now();
  const 보낼본문 = JSON.stringify({ questionType, recognizedText: 글, correctedTo });

  const 적기 = (상태: number | "실패", 응답본문?: string) => {
    연동기록.남기기({
      방법: "POST", 경로, 상태,
      걸린시간: Math.round(performance.now() - 시작), 시각: Date.now(),
      요청: 보낼본문,
      ...(응답본문 === undefined ? {} : { 응답: 응답본문 }),
    });
  };

  const 시계 = new AbortController();
  const 타이머 = setTimeout(() => 시계.abort(), 기다릴시간);
  try {
    const res = await fetch(부를곳, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: 보낼본문,
      signal: 시계.signal,
    });
    적기(res.status);
  } catch {
    // 끊겼든 시간이 다 됐든, 이 기록 하나 못 남긴다고 사용자 흐름을 막지 않는다.
    적기("실패");
  } finally {
    clearTimeout(타이머);
  }
};
