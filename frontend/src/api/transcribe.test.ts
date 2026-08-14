import { afterEach, describe, expect, it, vi } from "vitest";
import { 음성을글로 } from "./transcribe";

describe("서버 음성 전사", () => {
  afterEach(() => vi.restoreAllMocks());

  it("오디오와 언어를 BFF로 보내고 글을 받는다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ text: "매운맛" }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));

    await expect(음성을글로(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }), "ko-KR"))
      .resolves.toBe("매운맛");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/voice/transcriptions",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      audioBase64: "AQID",
      mimeType: "audio/webm",
      language: "ko-KR",
    });
  });

  it("빈 녹음은 서버로 보내지 않는다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(음성을글로(new Blob([]), "ko-KR")).rejects.toThrow("VOICE_AUDIO_EMPTY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("서버 오류 문구를 호출자에게 돌려준다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ message: "음성 인식 서버가 아직 설정되지 않았어요." }),
      { status: 503, headers: { "content-type": "application/json" } },
    ));

    await expect(음성을글로(new Blob(["voice"], { type: "audio/webm" }), "ko-KR"))
      .rejects.toThrow("음성 인식 서버가 아직 설정되지 않았어요.");
  });
});
