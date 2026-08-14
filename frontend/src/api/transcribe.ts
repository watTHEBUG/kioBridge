/**
 * 짧은 음성을 녹음해 백엔드에서 글로 바꾼다.
 *
 * 오디오는 상태나 저장소에 넣지 않는다. 녹음이 끝난 뒤 한 번만 전송하고, 응답으로
 * 받은 글만 화면의 기존 선택어 해석기에 넘긴다. 서버도 파일로 저장하지 않는다.
 */

const 최대녹음밀리초 = 6_000;
const 최대오디오바이트 = 600_000;

export type 서버음성실패 = "권한없음" | "소리없음" | "너무큼" | "서버안됨" | "안됨";
type 서버음성결과 = { 들은말: string } | { 못들은이유: 서버음성실패 };

export const 서버로들을수있나 = (): boolean => {
  try {
    return typeof globalThis.MediaRecorder === "function"
      && typeof globalThis.navigator?.mediaDevices?.getUserMedia === "function";
  } catch {
    return false;
  }
};

const 녹음형식 = (): string | undefined => {
  const 후보 = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
  return 후보.find((형식) => MediaRecorder.isTypeSupported?.(형식));
};

const 취소오류 = (): Error => {
  const error = new Error("VOICE_STT_ABORTED");
  error.name = "AbortError";
  return error;
};

const 중단확인 = (signal?: AbortSignal) => {
  if (signal?.aborted) throw 취소오류();
};

const base64로 = async (blob: Blob, signal?: AbortSignal): Promise<string> => {
  중단확인(signal);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  중단확인(signal);
  let binary = "";
  // 한꺼번에 펼치면 짧은 녹음도 인자 개수 제한을 넘을 수 있어 조각내어 바꾼다.
  for (let i = 0; i < bytes.length; i += 32_768) {
    중단확인(signal);
    binary += String.fromCharCode(...bytes.subarray(i, i + 32_768));
  }
  중단확인(signal);
  return btoa(binary);
};

/** 테스트에서도 쓰는 한 번 전송 경계. API 키는 이 요청의 다음인 Spring 서버에만 있다. */
export const 음성을글로 = async (blob: Blob, 언어: string, 외부신호?: AbortSignal): Promise<string> => {
  if (blob.size === 0) throw new Error("VOICE_AUDIO_EMPTY");
  if (blob.size > 최대오디오바이트) throw new Error("VOICE_AUDIO_TOO_LARGE");

  const controller = new AbortController();
  const 외부취소 = () => controller.abort();
  if (외부신호?.aborted) controller.abort();
  else 외부신호?.addEventListener("abort", 외부취소, { once: true });
  const timer = setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    중단확인(controller.signal);
    const audioBase64 = await base64로(blob, controller.signal);
    중단확인(controller.signal);
    response = await fetch("/api/bff/api/v1/voice/transcriptions", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        audioBase64,
        mimeType: blob.type || "audio/webm",
        language: 언어,
      }),
    });
    중단확인(controller.signal);
  } finally {
    clearTimeout(timer);
    외부신호?.removeEventListener("abort", 외부취소);
  }

  중단확인(controller.signal);
  const body = await response.json().catch(() => ({})) as { text?: unknown; message?: unknown };
  중단확인(controller.signal);
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "VOICE_STT_FAILED");
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) throw new Error("VOICE_STT_EMPTY");
  return text;
};

/**
 * 최대 6초를 듣고 자동으로 전송한다. 반환된 그만두기는 취소다. 화면을 떠났거나
 * 손으로 골랐을 때 녹음하던 음성이 뒤늦게 전송되지 않도록 폐기한다.
 */
export const 서버로들어보기 = (
  언어: string,
  받기: (결과: 서버음성결과) => void,
): { 그만두기: () => void } => {
  let 취소됨 = false;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const 전사취소 = new AbortController();
  const 조각: Blob[] = [];

  const 정리 = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  void (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (취소됨) { 정리(); return; }

      const 형식 = 녹음형식();
      recorder = 형식 ? new MediaRecorder(stream, { mimeType: 형식 }) : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) 조각.push(event.data); };
      recorder.onerror = () => {
        정리();
        if (!취소됨) 받기({ 못들은이유: "안됨" });
      };
      recorder.onstop = () => {
        정리();
        if (취소됨) return;
        const blob = new Blob(조각, { type: recorder?.mimeType || 형식 || "audio/webm" });
        void 음성을글로(blob, 언어, 전사취소.signal)
          .then((들은말) => {
            if (!취소됨) 받기({ 들은말 });
          })
          .catch((error: Error) => {
            if (취소됨 || error.name === "AbortError") return;
            받기({
              못들은이유: error.message === "VOICE_AUDIO_EMPTY" ? "소리없음"
                : error.message === "VOICE_AUDIO_TOO_LARGE" ? "너무큼"
                  : "서버안됨",
            });
          });
      };
      recorder.start();
      timer = setTimeout(() => {
        if (recorder?.state === "recording") recorder.stop();
      }, 최대녹음밀리초);
    } catch (error) {
      정리();
      if (취소됨) return;
      const 이름 = (error as { name?: string })?.name;
      받기({ 못들은이유: 이름 === "NotAllowedError" || 이름 === "SecurityError" ? "권한없음" : "안됨" });
    }
  })();

  return {
    그만두기: () => {
      취소됨 = true;
      전사취소.abort();
      if (recorder?.state === "recording") recorder.stop();
      else 정리();
    },
  };
};
