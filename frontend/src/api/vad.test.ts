import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { 말끝지켜보기 } from "./vad";

/*
 * 이 파일이 지키는 것.
 *
 *   ① 말이 있었고 그 뒤 조용해져야 '끝' 이다. 조용하기만 한 것은 끝이 아니다.
 *   ② 아무 말도 없으면 그렇게 알린다 — 부르는 쪽이 빈 녹음을 서버로 보내지
 *      않게 하는 유일한 신호다.
 *   ③ **못 하는 자리에서는 조용히 물러난다.** 오디오를 못 다루는 브라우저에서
 *      던지면, 말로 답하는 길이 통째로 막힌다. 사람이 누르는 길은 그대로 있다.
 *
 * 소리 크기는 가짜 오디오로 만든다. 실제 마이크 없이 '조용함 → 말 → 조용함'
 * 을 시간 순서대로 흉내 내야 타이밍을 볼 수 있다.
 */

/** 지금 흉내 낼 소리 크기. 0 이면 무음, 1 에 가까울수록 크다. */
let 크기 = 0;

const 가짜스트림 = {} as MediaStream;

const 붙이기 = () => {
  const 분석기 = {
    fftSize: 1024,
    getByteTimeDomainData: (칸: Uint8Array) => {
      // 128 이 무음이다. 크기만큼 위아래로 흔든다.
      for (let i = 0; i < 칸.length; i++) 칸[i] = 128 + Math.round(크기 * 127) * (i % 2 === 0 ? 1 : -1);
    },
    connect: vi.fn(),
  };
  const 소스 = { connect: vi.fn(), disconnect: vi.fn() };
  const ctx = {
    createAnalyser: () => 분석기,
    createMediaStreamSource: () => 소스,
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  vi.stubGlobal("AudioContext", vi.fn(() => ctx));
  return { ctx, 소스 };
};

/** 이만큼 시간이 흐른다. 재는 간격이 50ms 라 그 배수로 움직인다. */
const 흐르기 = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => { vi.useFakeTimers(); 크기 = 0; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("말이 끝나는 순간", () => {
  it("말이 있었고 그 뒤 조용해지면 끝이라고 알린다", () => {
    붙이기();
    const 끝남 = vi.fn();
    말끝지켜보기(가짜스트림, { 말이끝나면: 끝남 });

    // 바탕 소음을 재는 동안(400ms)은 아무 판단도 안 한다.
    흐르기(500);
    expect(끝남).not.toHaveBeenCalled();

    크기 = 0.5;          // 말한다
    흐르기(600);
    expect(끝남).not.toHaveBeenCalled();

    크기 = 0;            // 말을 멈춘다
    흐르기(600);
    // 아직 1200ms 가 안 됐다. 문장 사이 숨 고르기를 끝으로 보면 안 된다.
    expect(끝남).not.toHaveBeenCalled();

    흐르기(800);
    expect(끝남).toHaveBeenCalledTimes(1);
  });

  it("한 번 알린 뒤에는 더 안 부른다", () => {
    붙이기();
    const 끝남 = vi.fn();
    말끝지켜보기(가짜스트림, { 말이끝나면: 끝남 });
    흐르기(500);
    크기 = 0.5; 흐르기(400);
    크기 = 0; 흐르기(3000);
    expect(끝남).toHaveBeenCalledTimes(1);
  });

  it("툭 하는 짧은 소리는 말로 안 본다", () => {
    /*
     * 50ms 짜리 소리 하나로 '말이 시작됐다' 로 치면, 그 뒤 조용해지는 순간
     * 녹음이 끝난다 — 사람은 아직 입도 안 뗐는데.
     */
    붙이기();
    const 끝남 = vi.fn();
    const 없음 = vi.fn();
    말끝지켜보기(가짜스트림, { 말이끝나면: 끝남, 아무말도없으면: 없음 }, { 기다림: 3000 });
    흐르기(500);
    크기 = 0.6; 흐르기(50);   // 툭
    크기 = 0; 흐르기(3000);
    expect(끝남).not.toHaveBeenCalled();
    // 말이 시작된 적이 없으므로 '아무 말도 없음' 으로 접힌다.
    expect(없음).toHaveBeenCalledTimes(1);
  });
});

describe("아무 말도 없을 때", () => {
  it("기다림이 지나면 알린다", () => {
    붙이기();
    const 없음 = vi.fn();
    말끝지켜보기(가짜스트림, { 말이끝나면: vi.fn(), 아무말도없으면: 없음 }, { 기다림: 2000 });
    흐르기(1500);
    expect(없음).not.toHaveBeenCalled();
    흐르기(1000);
    expect(없음).toHaveBeenCalledTimes(1);
  });

  it("말이 시작된 뒤에는 기다림으로 접지 않는다", () => {
    // 길게 말하는 사람을 도중에 끊으면 안 된다. 그 그물은 listen.ts 의 최대
    // 녹음 시간이 따로 친다.
    붙이기();
    const 없음 = vi.fn();
    const 끝남 = vi.fn();
    말끝지켜보기(가짜스트림, { 말이끝나면: 끝남, 아무말도없으면: 없음 }, { 기다림: 1000 });
    흐르기(500);
    크기 = 0.5; 흐르기(3000);
    expect(없음).not.toHaveBeenCalled();
    expect(끝남).not.toHaveBeenCalled();
  });
});

describe("바탕 소음이 큰 곳", () => {
  it("시끄러운 곳에서도 말이 솟을 때만 본다", () => {
    /*
     * 못 박은 값으로 재면 식당 앞에서는 바탕 소음이 늘 '말' 이 되어, 조용해지는
     * 순간이 오지 않는다. 처음 얼마를 재서 그 자리 바탕을 잡는 이유다.
     */
    붙이기();
    const 끝남 = vi.fn();
    크기 = 0.2;                       // 시끄러운 곳
    말끝지켜보기(가짜스트림, { 말이끝나면: 끝남 });
    흐르기(500);                       // 이 동안의 0.2 가 바탕이 된다
    흐르기(2000);
    // 바탕 그대로면 말이 아니다. 여기서 끝났다고 하면 안 된다.
    expect(끝남).not.toHaveBeenCalled();

    크기 = 0.8; 흐르기(400);           // 바탕 위로 솟는다 = 말
    크기 = 0.2; 흐르기(1500);          // 바탕으로 돌아온다 = 조용해짐
    expect(끝남).toHaveBeenCalledTimes(1);
  });
});

describe("그만보기", () => {
  it("그만두면 더 안 알리고 오디오도 놓는다", () => {
    const { ctx, 소스 } = 붙이기();
    const 끝남 = vi.fn();
    const { 그만보기 } = 말끝지켜보기(가짜스트림, { 말이끝나면: 끝남 });
    흐르기(500);
    크기 = 0.5; 흐르기(400);
    그만보기();
    expect(소스.disconnect).toHaveBeenCalled();
    expect(ctx.close).toHaveBeenCalled();
    크기 = 0; 흐르기(3000);
    expect(끝남).not.toHaveBeenCalled();
  });
});

describe("못 하는 자리에서는 조용히 물러난다", () => {
  it("AudioContext 가 없으면 던지지 않는다", () => {
    // 여기서 던지면 들어보기() 가 통째로 깨져 말로 답하는 길이 막힌다.
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);
    const 끝남 = vi.fn();
    const r = 말끝지켜보기(가짜스트림, { 말이끝나면: 끝남 });
    expect(() => r.그만보기()).not.toThrow();
    흐르기(5000);
    expect(끝남).not.toHaveBeenCalled();
  });

  it("오디오를 만들다 실패해도 던지지 않는다", () => {
    vi.stubGlobal("AudioContext", vi.fn(() => { throw new Error("no audio"); }));
    const 끝남 = vi.fn();
    expect(() => 말끝지켜보기(가짜스트림, { 말이끝나면: 끝남 })).not.toThrow();
    흐르기(5000);
    expect(끝남).not.toHaveBeenCalled();
  });
});
