import { afterEach, describe, expect, it, vi } from "vitest";
import { 불렀나, 물어보지않고들을수있나 } from "./wake";

/*
 * 이 파일이 지키는 것.
 *
 *   ① 우리를 부른 말만 문을 연다. 옆 사람 대화가 앱을 시작시키면 안 된다.
 *   ② 인식기가 또박또박 안 돌려줘도 알아듣는다 — 띄어쓰기·받아쓰기 어긋남.
 *   ③ **묻지 않고 마이크를 열 수 있을 때만** 상시 대기를 켠다. 모르면 안 켠다.
 */

afterEach(() => { vi.unstubAllGlobals(); });

describe("우리를 부른 말인가", () => {
  it("또박또박 부르면 연다", () => {
    expect(불렀나("키오브릿지")).toBe(true);
    expect(불렀나("키오브릿지!")).toBe(true);
  });

  it("띄어쓰기가 달라도 연다", () => {
    // 인식기는 "키오 브릿지" 로 적어 오기도 한다. 띄어쓰기로 문이 안 열리면
    // 사용자는 자기가 잘못 말한 줄 안다.
    expect(불렀나("키오 브릿지")).toBe(true);
    expect(불렀나("키 오 브 릿 지")).toBe(true);
  });

  it("앞뒤에 말이 붙어도 연다", () => {
    // "저기, 키오브릿지야" 처럼 실제로는 문장으로 부른다.
    expect(불렀나("저기 키오브릿지야")).toBe(true);
    expect(불렀나("키오브릿지 시작해줘")).toBe(true);
  });

  it("받아쓰기가 조금 어긋나도 연다", () => {
    // 실제로 이렇게 적어 온 것들이다. 완벽한 인식만 받으면 대부분 안 열린다.
    expect(불렀나("키오브리지")).toBe(true);
    expect(불렀나("기오브릿지")).toBe(true);
  });

  it("영어로 적어 와도 연다", () => {
    expect(불렀나("KioBridge")).toBe(true);
    expect(불렀나("kiobridge please")).toBe(true);
  });

  it("우리를 부른 것이 아니면 안 연다", () => {
    /*
     * 이 문이 헐거우면 옆 대화 한 마디에 앱이 제멋대로 시작한다. 화면을 못
     * 보는 분에게는 무슨 일이 일어났는지 알 방법이 없다.
     */
    for (const 말 of [
      "", "   ", "시작", "시작해줘", "여보세요", "브릿지", "키오스크",
      "오늘 날씨 어때", "치킨 먹고 싶다", "bridge", "start",
    ]) {
      expect(불렀나(말)).toBe(false);
    }
  });
});

describe("묻지 않고 마이크를 열 수 있나", () => {
  /*
   * 여기가 상시 대기의 전제다. 아직 안 물어본 자리에서 켜면, 사용자가 아무것도
   * 안 했는데 권한 창이 뜬다. 모르면 안 켠다.
   */
  const 권한 = (state: string) =>
    vi.stubGlobal("navigator", { permissions: { query: async () => ({ state }) } });

  it("이미 허용했으면 켠다", async () => {
    권한("granted");
    expect(await 물어보지않고들을수있나()).toBe(true);
  });

  it("아직 안 물어봤으면 안 켠다", async () => {
    권한("prompt");
    expect(await 물어보지않고들을수있나()).toBe(false);
  });

  it("막았으면 안 켠다", async () => {
    권한("denied");
    expect(await 물어보지않고들을수있나()).toBe(false);
  });

  it("Permissions API 가 없으면 안 켠다 — 모르면 안 켠다", async () => {
    vi.stubGlobal("navigator", {});
    expect(await 물어보지않고들을수있나()).toBe(false);
  });

  it("물어보다 던져도 안 켜고, 던지지도 않는다", async () => {
    // 사파리는 name:"microphone" 을 모른다며 던진다. 거기서 앱이 깨지면 안 된다.
    vi.stubGlobal("navigator", { permissions: { query: async () => { throw new TypeError("bad name"); } } });
    await expect(물어보지않고들을수있나()).resolves.toBe(false);
  });
});
