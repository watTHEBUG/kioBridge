/**
 * 말을 듣는다.
 *
 * ── 브라우저 내장 인식(SpeechRecognition)을 걷어낸 이유 ─────────────────────
 *
 * 한동안 브라우저의 SpeechRecognition 을 그대로 썼다(처음엔 processLocally=true
 * 로 기기 안 처리를 강제했고, 그게 크롬 macOS 빌드에서 깨져 있는 걸 확인한 뒤
 * 브라우저 기본(클라우드) 경로로 되돌렸었다).
 *
 * 그런데 기본 경로도 특정 기기에서 한국어만 응답이 없었다 — 영어는 되고,
 * 같은 코드로 언어만 ko-KR/ko 로 바꾸면 몇 번을 다시 시도해도 100% 실패했다.
 * 외부 데모 페이지에서는 그 브라우저의 같은 계정으로 한국어도 잘 됐으니, 이
 * 페이지·이 앱에서만 걸리는 무언가였다 — 확장 프로그램·마이크 권한·CSP·
 * Permissions-Policy·타임아웃 길이·continuous/interimResults 조합을 전부
 * 확인했지만 코드로는 원인을 못 좁혔다(자세한 재현 기록은 #124 참고).
 *
 * 그래서 브라우저의 인식 엔진 자체를 포기했다. 대신 `MediaRecorder` 로 음성을
 * 녹음해 우리 백엔드(`POST /api/v1/voice/transcribe`)로 보내고, 백엔드가
 * OpenAI Whisper 로 인식한 글만 돌려받는다. 이 우회는 브라우저의 SpeechRecognition
 * 구현이 무엇을 하든 상관없다 — 우리가 통제하는 서버가 인식을 하기 때문이다.
 *
 * 오디오는 저장하지 않는다. 킷 문서(PARTICIPANT_IDEA_CATALOG.md "음성 주문"
 * 항목)의 "음성 원본을 서버에 저장하지 마세요. 인식 결과만 씁니다" 를 그대로
 * 지킨다 — 백엔드는 받은 바이트를 메모리에서 Whisper 로 바로 넘기고 어디에도
 * 쓰지 않는다(VoiceTranscriptionService 주석 참고). 개인정보 화면의 "음성으로
 * 답할 때" 항목도 이 경로에 맞춰 적어 뒀다(App.tsx 의 개인정보항목).
 *
 * ── '그만 듣기' 가 이제는 꼭 있어야 하는 단추다 ─────────────────────────────
 *
 * 브라우저 인식은 말이 끝난 것을 스스로 알아챘다(무음 감지). 녹음은 그렇지
 * 않다 — 사용자가 "그만 듣기" 를 눌러야 녹음이 끝나고 그때 서버로 보낸다.
 * 화면 문구에 이 안내를 넣어 뒀다(한칸씩말하기·도움설정말로채우기). 그래도
 * 안 누르는 경우를 대비해 최대 녹음 시간(아래 참고)을 뒤에 걸어 둔다.
 *
 * ── 되는지 먼저 보고 내민다 ─────────────────────────────────────────────────
 *
 * getUserMedia 나 MediaRecorder 가 없는 브라우저에서는 단추를 안 보여 준다.
 * 눌렀는데 아무 일도 안 일어나면 사용자는 앱이 고장 났다고 생각한다.
 * speech.ts 의 `소리를낼수있나` 와 같은 판단이다.
 */

import { 말끝지켜보기 } from "@/api/vad";

export type 못들은이유 = "권한없음" | "소리없음" | "안됨";

/** 이 기기에서 마이크를 녹음할 수 있는가. 화면이 단추를 내밀지 말지 이걸로 정한다. */
export const 들을수있나 = (): boolean =>
  typeof navigator !== "undefined"
  && !!navigator.mediaDevices
  && typeof navigator.mediaDevices.getUserMedia === "function"
  && typeof MediaRecorder !== "undefined";

/** 브라우저가 실제로 만들 수 있는 형식 중, 서버(Whisper)가 아는 것을 고른다. */
const 녹음형식 = (): string | undefined => {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
    .find((형식) => MediaRecorder.isTypeSupported(형식));
};

const 확장자 = (mime: string): string =>
  mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : "webm";

/**
 * 녹음한 것을 서버로 보내 글로 받는다.
 *
 * `/api/bff` 는 vite.config.ts 의 개발 서버 프록시(운영에서는 Vercel BFF 함수)를
 * 그대로 탄다 — backend.ts 의 createTeamBackend 와 같은 경로다. 다만 이 호출은
 * KioBridgeApi 목/실서버 전환 스위치와 무관하게 늘 실제 백엔드로 간다 — 음성
 * 인식은 목으로 흉내 낼 게 없는 기능이다.
 */
const 서버로보내기 = async (
  오디오: Blob, 언어: string,
): Promise<{ 들은말: string } | { 못들은이유: 못들은이유 }> => {
  const 폼 = new FormData();
  폼.append("audio", 오디오, `clip.${확장자(오디오.type)}`);
  폼.append("language", 언어);

  let res: Response;
  try {
    res = await fetch("/api/bff/api/v1/voice/transcribe", { method: "POST", body: 폼 });
  } catch {
    return { 못들은이유: "안됨" };
  }
  /*
   * 서버가 몇 번으로 거절했든 여기서는 "안됨" 하나다.
   *
   * 처음에는 401·403 을 "권한없음" 으로 접었다. 그런데 화면은 그 값을
   * **"마이크를 쓸 수 없어요"** 로 옮긴다(App.tsx). 서버가 거절한 것인데
   * 사용자는 자기 마이크 설정을 뒤지게 된다 — 아무리 뒤져도 멀쩡하다.
   * 이 경로에는 인증도 없어서 401·403 이 정상 흐름에 나올 일도 없다.
   *
   * "권한없음" 은 getUserMedia 가 실패했을 때만 쓴다. 거기서만 마이크가
   * 실제로 막혀 있고, 그때 그 안내가 사실이 된다.
   *
   * 어느 쪽이든 사용자가 할 일은 같다 — 손으로 고르는 화면으로 넘어간다.
   * 다른 것은 그 앞에 무슨 말이 적히느냐뿐이고, 그게 맞는 말이어야 한다.
   */
  if (!res.ok) return { 못들은이유: "안됨" };
  const 본문 = await res.json().catch(() => null) as { text?: string } | null;
  const 글 = (본문?.text ?? "").trim();
  return 글 ? { 들은말: 글 } : { 못들은이유: "소리없음" };
};

/**
 * 한 번 듣는다(녹음 → 그만두기 → 서버 인식).
 *
 * 성공하면 들은 글, 실패하면 왜 못 들었는지를 준다. 던지지 않는다 — 음성은
 * 더해 주는 길이고, 안 되면 손으로 고르는 길이 그대로 있다.
 *
 * `그만두기(보내기)` — 기본(true)은 지금까지 녹음한 것을 서버로 보내 끝낸다.
 * `false` 로 부르면 보내지 않고 버린다 — 화면을 떠나거나 손으로 다른 답을
 * 고를 때처럼 "이 녹음은 필요 없어졌다" 는 자리에서 쓴다. 여기서 나뉘지 않으면
 * 버릴 녹음도 매번 서버로 나가 Whisper 호출만 낭비된다.
 */
export const 들어보기 = (
  언어: string,
  받기: (결과: { 들은말: string } | { 못들은이유: 못들은이유 }) => void,
  /**
   * `스스로끝내기` — 말이 끝나면 '그만 듣기' 없이 알아서 보낸다(api/vad.ts).
   *
   * 끄면 지금까지와 똑같다(사람이 눌러야 끝난다). 켜면 소리의 크기만 기기
   * 안에서 지켜보다가, 말이 있었고 그 뒤 조용해진 순간 녹음을 끝낸다.
   *
   * 지켜보기가 안 되는 브라우저에서도 아무것도 깨지지 않는다 — 그때는 vad 가
   * 조용히 물러나고, 사람이 누르는 길과 최대 녹음 시간이 그대로 남는다.
   */
  { 스스로끝내기 = false }: { 스스로끝내기?: boolean } = {},
): { 그만두기: (보내기?: boolean) => void } => {
  if (!들을수있나()) {
    받기({ 못들은이유: "안됨" });
    return { 그만두기: () => {} };
  }

  let 끝났나 = false;
  const 한번만 = (결과: { 들은말: string } | { 못들은이유: 못들은이유 }) => {
    if (끝났나) return;
    끝났나 = true;
    clearTimeout(최대시간표);
    받기(결과);
  };

  let 레코더: MediaRecorder | null = null;
  let 스트림: MediaStream | null = null;
  let 취소됨 = false;
  let 보낼지 = true;
  const 조각들: BlobPart[] = [];
  let 최대시간표: ReturnType<typeof setTimeout> | undefined;
  let 지켜보기: { 그만보기: () => void } | null = null;

  const 마이크끄기 = () => {
    지켜보기?.그만보기();
    지켜보기 = null;
    스트림?.getTracks().forEach((트랙) => 트랙.stop());
  };

  void (async () => {
    try {
      스트림 = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      한번만({ 못들은이유: "권한없음" });
      return;
    }
    // 마이크를 여는 동안 이미 그만두기() 가 불렸다 — 켠 김에 바로 끈다.
    if (취소됨 || 끝났나) { 마이크끄기(); return; }

    const 형식 = 녹음형식();
    try {
      레코더 = 형식 ? new MediaRecorder(스트림, { mimeType: 형식 }) : new MediaRecorder(스트림);
    } catch {
      마이크끄기();
      한번만({ 못들은이유: "안됨" });
      return;
    }

    레코더.ondataavailable = (e) => { if (e.data.size > 0) 조각들.push(e.data); };
    레코더.onerror = () => {
      마이크끄기();
      한번만({ 못들은이유: "안됨" });
    };
    레코더.onstop = () => {
      마이크끄기();
      if (끝났나) return;
      if (!보낼지) { 한번만({ 못들은이유: "소리없음" }); return; }
      const 오디오 = new Blob(조각들, { type: 레코더?.mimeType || 형식 || "audio/webm" });
      if (오디오.size === 0) { 한번만({ 못들은이유: "소리없음" }); return; }
      void 서버로보내기(오디오, 언어).then(한번만);
    };

    레코더.start();
    /*
     * 안 누르고 계속 말해도 무한정 녹음하지 않는다. 15초면 접근성 설정의
     * 예/아니오 하나, 주문표 한 축을 답하기에 넉넉하고, Whisper 호출 하나가
     * 지나치게 길어지는 것도 막는다.
     *
     * 스스로끝내기를 켜도 이 그물은 그대로 둔다 — 지켜보기가 못 도는 기기나
     * 소리가 계속 나는 곳(식당 앞)에서 끝을 못 잡을 수 있다.
     */
    최대시간표 = setTimeout(() => {
      try { 레코더?.stop(); } catch { /* 이미 끝났다 */ }
    }, 15000);

    if (!스스로끝내기) return;
    지켜보기 = 말끝지켜보기(스트림, {
      // 말이 끝났다. 사람이 '그만 듣기' 를 누른 것과 똑같이 처리한다 —
      // 지금까지 녹음한 것을 보낸다.
      말이끝나면: () => {
        try { 레코더?.stop(); } catch { /* 이미 끝났다 */ }
      },
      /*
       * 기다리는 동안 아무 말도 없었다. 녹음을 버리고 접는다.
       *
       * 보내면 Whisper 가 빈 소리를 받아 아무 글도 못 내놓고, 사용자는 그
       * 왕복 시간만큼 '인식 중…' 을 보고 있다가 같은 안내를 듣는다. 여기서
       * 접으면 바로 "잘 안 들렸어요" 로 간다.
       */
      아무말도없으면: () => {
        보낼지 = false;
        try { 레코더?.stop(); } catch { /* 이미 끝났다 */ }
      },
    });
  })();

  return {
    그만두기: (보내기 = true) => {
      보낼지 = 보내기;
      if (레코더 && 레코더.state !== "inactive") {
        레코더.stop();
        return;
      }
      if (!레코더) {
        // 마이크 권한이 아직 안 끝났다. 녹음된 것 자체가 없으니 보낼지와
        // 무관하게 못 들은 것으로 접는다 — 스트림이 도착하면 위에서 바로 끈다.
        취소됨 = true;
        한번만({ 못들은이유: "소리없음" });
      }
    },
  };
};
