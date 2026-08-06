import { describe, expect, it } from "vitest";

import type { MappingState } from "@/domain/types";

import { MOCK_CART, MOCK_MAPPING, MOCK_MENU_NAME } from "./mock";

describe("MOCK_MENU_NAME", () => {
  it("is the canonical saved menu name used across the mapping fixtures", () => {
    expect(MOCK_MENU_NAME).toBe("닭강정");
  });
});

describe("MOCK_MAPPING", () => {
  const allStates: MappingState[] = [
    "exact",
    "clarification",
    "not_found",
    "changed",
    "low_confidence",
  ];

  it("defines a fixture for every MappingState whose result matches its key", () => {
    allStates.forEach((state) => {
      expect(MOCK_MAPPING[state]).toBeDefined();
      expect(MOCK_MAPPING[state].result).toBe(state);
    });
  });

  describe("exact", () => {
    const fixture = MOCK_MAPPING.exact;

    it("has an item with the expected menu name, price and image", () => {
      expect(fixture.item?.displayName).toBe("매운 순살 닭강정");
      expect(fixture.item?.priceText).toBe("6,000원");
      expect(fixture.item?.imageUrl).toBeTruthy();
    });

    it("labels the packaging option '이용 방식' with the '포장하기' value and marks it matched", () => {
      const option = fixture.item?.options.find((o) => o.label === "이용 방식");
      expect(option).toEqual({
        label: "이용 방식",
        value: "포장하기",
        matched: true,
      });
    });

    it("uses '컵' (not the old '추가 옵션') as the cup option label", () => {
      const option = fixture.item?.options.find((o) => o.label === "컵");
      expect(option).toEqual({ label: "컵", value: "종이컵", matched: true });
      expect(fixture.item?.options.some((o) => o.label === "추가 옵션")).toBe(
        false,
      );
    });

    it("has exactly 5 options in a stable order", () => {
      expect(fixture.item?.options).toHaveLength(5);
      expect(fixture.item?.options.map((o) => o.label)).toEqual([
        "이용 방식",
        "맵기",
        "형태",
        "컵",
        "수량",
      ]);
    });

    it("carries the shared reasons list with the expected used/excluded split", () => {
      expect(fixture.reasons).toHaveLength(5);
      expect(fixture.reasons?.filter((r) => r.kind === "used")).toHaveLength(3);
      expect(fixture.reasons?.filter((r) => r.kind === "excluded")).toHaveLength(
        2,
      );
    });

    it("explains the packaging reason using '포장하기' without duplicating the particle", () => {
      const [firstReason] = fixture.reasons ?? [];
      expect(firstReason).toEqual({
        kind: "used",
        text: "포장하기를 고르셔서 포장이 되는 메뉴만 남겼어요",
      });
    });

    it("explains the allergy exclusion mentioning peanuts", () => {
      const allergyReason = fixture.reasons?.find((r) =>
        r.text.includes("알레르기"),
      );
      expect(allergyReason).toEqual({
        kind: "excluded",
        text: "땅콩 알레르기를 알려주셔서 땅콩 토핑 닭강정은 뺐어요",
      });
    });
  });

  describe("clarification", () => {
    const fixture = MOCK_MAPPING.clarification;

    it("mentions the saved menu name in its reason", () => {
      expect(fixture.reason).toContain(MOCK_MENU_NAME);
    });

    it("provides three uniquely identified candidates with prices and images", () => {
      expect(fixture.candidates).toHaveLength(3);
      expect(fixture.candidates?.map((c) => c.candidateId)).toEqual([
        "c1",
        "c2",
        "c3",
      ]);
      fixture.candidates?.forEach((candidate) => {
        expect(candidate.displayName).toBeTruthy();
        expect(candidate.priceText).toMatch(/원$/);
        expect(candidate.imageUrl).toBeTruthy();
      });
    });

    it("shares the same reasons fixture as the exact state", () => {
      expect(fixture.reasons).toEqual(MOCK_MAPPING.exact.reasons);
    });
  });

  describe("not_found", () => {
    const fixture = MOCK_MAPPING.not_found;

    it("has no item or candidates", () => {
      expect(fixture.item).toBeUndefined();
      expect(fixture.candidates).toBeUndefined();
    });

    it("mentions the saved menu name in its message", () => {
      expect(fixture.message).toContain(MOCK_MENU_NAME);
    });
  });

  describe("changed", () => {
    const fixture = MOCK_MAPPING.changed;

    it("has a diffNote describing the paper-cup option change", () => {
      expect(fixture.diffNote).toContain("종이컵");
    });

    it("marks the '컵' option as unmatched with an explanatory note", () => {
      const option = fixture.item?.options.find((o) => o.label === "컵");
      expect(option).toEqual({
        label: "컵",
        value: "종이컵",
        matched: false,
        note: "오늘은 제공되지 않아요",
      });
    });

    it("still matches every option other than the cup", () => {
      const others = fixture.item?.options.filter((o) => o.label !== "컵");
      expect(others?.length).toBeGreaterThan(0);
      others?.forEach((o) => expect(o.matched).toBe(true));
    });
  });

  describe("low_confidence", () => {
    const fixture = MOCK_MAPPING.low_confidence;

    it("matches every option including the '컵' option", () => {
      expect(fixture.item?.options.length).toBeGreaterThan(0);
      fixture.item?.options.forEach((o) => expect(o.matched).toBe(true));
    });

    it("describes the same menu item as the exact state", () => {
      expect(fixture.item?.displayName).toBe(MOCK_MAPPING.exact.item?.displayName);
      expect(fixture.item?.priceText).toBe(MOCK_MAPPING.exact.item?.priceText);
      expect(fixture.item?.options).toHaveLength(
        MOCK_MAPPING.exact.item?.options.length ?? 0,
      );
    });
  });
});

describe("MOCK_CART", () => {
  it("only exposes cart-boundary fields, no payment/completed fields (P0-7)", () => {
    expect(Object.keys(MOCK_CART).sort()).toEqual(
      ["evidenceLabel", "handoff", "itemCountText", "totalText"].sort(),
    );
  });

  it("has the expected cart summary text", () => {
    expect(MOCK_CART.itemCountText).toBe("1개");
    expect(MOCK_CART.totalText).toBe("6,000원");
    expect(MOCK_CART.evidenceLabel).toBe("화면 인식으로 확인됨");
    expect(MOCK_CART.handoff).toContain("키오스크");
  });
});