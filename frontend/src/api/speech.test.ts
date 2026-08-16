import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * 이 파일이 지키는 것 하나 — **화면을 떠나면 소리도 끊긴다.**
 *
 * speechSynthesis 의 대기열은 페이지가 아니라 브라우저에 붙어 있다. 탭을 닫거나
 * 다른 곳으로 가도 넣어 둔 문장이 남아 있으면 계속 읽는다. 화면은 이미 없는데
 * 소리만 나고, 끄는 방법도 없다 — 그 탭이 이미 없기 때문이다. 실제로 그랬다.
 *
 * 시험은 node 환경에서 돈다(jsdom 을 안 쓴다). 그래서 window·document 를 직접
 * 만지지 않고, 모듈이 거는 addEventListener 를 붙잡아 그 손잡이를 직접 부른다 —
 * 브라우저가 그 일을 해 주는 자리를 흉내 내는 것이다.
 */

const 판깔기 = () => {
  const cancel = vi.fn();
  const 손잡이 = new Map<string, (() => void)[]>();
  vi.stubGlobal("speechSynthesis", { cancel, speaking: false, pending: false, speak: vi.fn() });
  vi.stubGlobal("addEventListener", (이름: string, 함수: () => void) => {
    손잡이.set(이름, [...(손잡이.get(이름) ?? []), 함수]);
  });
  vi.stubGlobal("document", { visibilityState: "visible" });
  const 부르기 = (이름: string) => (손잡이.get(이름) ?? []).forEach((f) => f());
  return { cancel, 부르기, 걸린것: () => [...손잡이.keys()] };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("화면을 떠나면 읽던 것을 끊는다", () => {
  it("떠날 때와 숨겨질 때 둘 다 손잡이를 건다", async () => {
    const { 걸린것 } = 판깔기();
    await import("./speech");
    expect(걸린것()).toContain("pagehide");
    expect(걸린것()).toContain("visibilitychange");
  });

  it("pagehide 면 끊는다 — 탭을 닫거나 다른 주소로 갈 때", async () => {
    const { cancel, 부르기 } = 판깔기();
    await import("./speech");
    expect(cancel).not.toHaveBeenCalled();

    부르기("pagehide");
    expect(cancel).toHaveBeenCalled();
  });

  it("숨겨지면 끊는다 — 다른 탭·다른 앱으로 넘어갈 때", async () => {
    const { cancel, 부르기 } = 판깔기();
    await import("./speech");

    vi.stubGlobal("document", { visibilityState: "hidden" });
    부르기("visibilitychange");
    expect(cancel).toHaveBeenCalled();
  });

  it("다시 보이는 것만으로는 안 끊는다", async () => {
    /*
     * 돌아왔을 때까지 끊으면, 화면이 새로 그려지며 읽기 시작한 것을 곧바로
     * 잘라 버린다. 숨겨질 때만 끊는다.
     */
    const { cancel, 부르기 } = 판깔기();
    await import("./speech");

    부르기("visibilitychange"); // visibilityState 는 "visible" 그대로다
    expect(cancel).not.toHaveBeenCalled();
  });
});
