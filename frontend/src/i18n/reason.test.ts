import { afterEach, describe, expect, it } from "vitest";
import { 이유글 } from "./reason";
import { 접근성설정 } from "../api/a11y";
import type { RecommendationReason } from "../domain/types";

/*
 * 이 파일이 지키는 것 — **영어로 바꾸면 이 줄에 우리말이 안 남는다.**
 *
 * 화면 글은 DOM 을 훑으며 통째로 옮기는데(i18n/apply.ts) 이 줄만은 매번 달라서
 * 표의 열쇠와 같아지지 않는다. 그래서 여기만 우리말로 남아 있었다.
 */

const 영어로 = () => 접근성설정.바꾸기({ language: "en-US" });
afterEach(() => 접근성설정.바꾸기({ language: "ko-KR" }));

const 이유 = (조각: Partial<RecommendationReason> & { text: string }): RecommendationReason =>
  ({ kind: "used", ...조각 }) as RecommendationReason;

describe("이유글", () => {
  it("우리말일 때는 서버가 준 그대로다", () => {
    const r = 이유({ text: "x", 문장: "선호하신 맵기와 맞는 메뉴라" });
    expect(이유글(r)).toBe("선호하신 맵기와 맞는 메뉴라");
  });

  it("영어로 바꾸면 우리말이 안 남는다", () => {
    영어로();
    const r = 이유({ text: "x", 문장: "선호하신 맵기와 맞는 메뉴라", 고른값: "매운맛" });
    expect(이유글(r)).not.toMatch(/[가-힣]/);
  });

  it("메뉴 이름은 안 옮긴다", () => {
    /*
     * 가게가 붙인 이름이다. 옮기면 영어를 쓰는 사람이 키오스크 화면에서 그 이름을
     * 못 찾는다 — 눌러야 하는 버튼에 적힌 글자는 우리말이다.
     */
    영어로();
    const r = 이유({ text: "x", 메뉴: "순살 닭강정", 문장: "지금은 품절이라 제외됐어요" });
    expect(이유글(r)).toContain("순살 닭강정");
    expect(이유글(r)).toContain("sold out");
  });

  it("알레르기 이름이 앞에 붙은 문장도 옮긴다", () => {
    영어로();
    const r = 이유({ text: "x", 문장: "[PEANUT] 알레르기와 겹쳐서 제외됐어요." });
    expect(이유글(r)).toContain("PEANUT");
    expect(이유글(r)).not.toMatch(/[가-힣]/);
  });

  it("모르는 문장은 지어내지 않고 서버가 준 그대로 둔다", () => {
    // 서버가 새 문장을 만들면 그 줄은 우리말로 보인다. 지어낸 영어보다 낫고,
    // 무엇이 안 옮겨졌는지 화면에서 바로 보인다(t.ts 와 같은 판단).
    영어로();
    const r = 이유({ text: "x", 문장: "서버가 오늘 처음 만든 문장이에요" });
    expect(이유글(r)).toBe("서버가 오늘 처음 만든 문장이에요");
  });

  it("조각이 없으면 완성문을 그대로 쓴다", () => {
    const r = 이유({ text: "이어 붙여 둔 완성문" });
    expect(이유글(r)).toBe("이어 붙여 둔 완성문");
  });
});
