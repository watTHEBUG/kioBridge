import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Pictogram } from "@/design/Pictogram";
import { BORDER, CANVAS, FAIL, FAIL_BG, FONT, GAP, NUM, P, PAPER, RADIUS, RULE, SERIF, SUCCESS_BG, SURFACE, TEXT_1, TEXT_2, TEXT_3, TYPE, WARN, WARN_BG } from "@/design/tokens";
import { ApproveInput, MappedItem, MappedOption, MappingCandidate, MappingResponse, OrderSheet, RecommendationReason } from "@/domain/types";
import { KioBridgeError, api } from "@/api/client";
import { 접근성설정 } from "@/api/a11y";
import { 가격한도 } from "@/api/budget";
import { 돈 } from "@/i18n/apply";
import { tf } from "@/i18n/t";
import { 이유글, 이유묶기 } from "@/i18n/reason";
import { SR_ONLY, BackButton, CheckRow, InfoBox, OutlineBtn, PrimaryBtn, SpinnerIcon, StatusHero } from "@/app/ui";

export function ConfirmRow({
  label, value, large = false, changed = false, changeNote,
}: {
  label: string; value: string; large?: boolean; changed?: boolean; changeNote?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 14, fontWeight: 400, color: TEXT_2, minWidth: 60, flexShrink: 0 }}>{label}</span>
      <div className="flex items-center gap-2 justify-end flex-wrap" style={{ justifyContent: "flex-end" }}>
        {changed ? (
          <>
            <span style={{ fontSize: 16, textDecoration: "line-through", color: TEXT_2 }}>{value}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: RADIUS.pill, backgroundColor: FAIL_BG, color: FAIL }}>
              {changeNote ?? "오늘은 제공되지 않아요"}
            </span>
          </>
        ) : large ? (
          <span style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1, color: TEXT_1, textAlign: "right", ...NUM }}>{value}</span>
        ) : (
          <span style={{ ...TYPE.bodyBold, color: TEXT_1, textAlign: "right" }}>{value}</span>
        )}
      </div>
    </div>
  );
}

export function ConfirmCard({ children, badge, badgeTone = "success" }: {
  children: React.ReactNode; badge?: string;
  // 배지가 늘 초록 체크였다. "확실하지 않아요" 같은 문구가 성공 배지를 달고 나오면
  // 색과 아이콘으로 상태를 알린다는 원칙이 여기서만 거꾸로 작동한다.
  badgeTone?: "success" | "caution" | "neutral";
}) {
  const 배지색 = badgeTone === "success"
    ? { bg: SURFACE, fg: TEXT_1, icon: "checkCircle" as const }
    : badgeTone === "caution"
      ? { bg: WARN_BG, fg: WARN, icon: "warning" as const }
      // neutral 의 바탕을 SURFACE 로 두면 카드 바탕과 같은 색이라 띠가 배경에 묻힌다.
      // 배지로 읽히지 않으면 배지가 아니다. CANVAS 는 한 톤 어두워서 경계가 보인다.
      : { bg: CANVAS, fg: TEXT_2, icon: "notePencil" as const };
  return (
    <div style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, overflow: "hidden" }}>
      {/* 키오스크가 오늘 걸어 둔 메뉴 사진. 담기 전 마지막 확인 화면이라 크게 둔다.
          글자를 읽기 어려운 분도 "내가 시키려던 그것"인지 한눈에 알아볼 수 있어야 한다.
          카탈로그에 사진이 없으면 자리를 비운다. */}

      <div data-confirm-body style={{ padding: "6px 20px" }}>{children}</div>
      {badge && (
        <div style={{ padding: "13px 20px", backgroundColor: 배지색.bg, display: "flex", alignItems: "center", gap: 8 }}>
          <Pictogram name={배지색.icon} size={17} color={배지색.fg} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 배지색.fg }}>{badge}</span>
        </div>
      )}
    </div>
  );
}

/**
 * 추천 이유.
 *
 * 왜 이걸 골랐는지 사용자의 말로 밝힌다. 심사 규칙상 최소 한 줄은 있어야 하고,
 * "쓴 정보"와 "뺀 이유"를 같이 보여 준다 — 무엇이 빠졌는지 모르면 확인이 아니다.
 * 색만으로 구분하지 않도록 두 종류에 서로 다른 픽토그램을 붙인다.
 */
/*
 * 이유 한 줄의 겉모습.
 *
 * 종류가 셋이라 삼항으로 가르면 어느 가지가 무엇인지 안 보인다. 표로 모은다.
 * 색만으로 알리지 않으므로 말머리 글자가 본체이고 그림은 거든다.
 */

export const 이유표시 = {
  // 초록을 여기 두면 이유 목록이 초록으로 늘어선다. 초록은 담기 성공 체크에만 남긴다.
  used:     { 말머리: "반영: ", 그림: "checkCircle" as const, 색: TEXT_1 },
  unmet:    { 말머리: "못 맞춤: ", 그림: "warning" as const, 색: WARN },
  excluded: { 말머리: "제외: ", 그림: "warning" as const, 색: WARN },
};

export function ReasonList({ reasons, 제목 = "이 메뉴를 고른 이유" }: { reasons?: RecommendationReason[]; 제목?: string }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <section
      aria-label={제목}
      style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, padding: "16px 18px" }}
    >
      <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT_1, marginBottom: 10 }}>
        {제목}
      </h3>
      <ul style={{ display: "flex", flexDirection: "column", gap: 9, margin: 0, padding: 0, listStyle: "none" }}>
        {reasons.map((r) => (
          <li key={r.text} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, marginTop: 2, display: "flex" }}>
              <Pictogram
                name={이유표시[r.kind].그림}
                size={16}
                color={이유표시[r.kind].색}
              />
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_1 }}>
              {/* 색을 못 보는 경우에도 종류를 알 수 있게 말머리를 글자로 붙인다. */}
              <b style={{ fontWeight: 700 }}>{이유표시[r.kind].말머리}</b>
              {/*
                r.text 가 아니라 조각에서 조립한다. r.text 는 우리말로 이어 붙여 둔
                완성문이라 영어로 바꿔도 그대로 남는다(i18n/reason.ts). data-원문 은
                DOM 을 훑는 쪽이 이 안을 다시 안 보게 막는 표시다 — 여기 든 메뉴
                이름이 표의 열쇠와 우연히 같으면 가게 이름이 영어로 바뀐다.
              */}
              <span data-원문>{이유글(r)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 메뉴 밑에 붙는 이유. **화면을 따로 두지 않는다.**
 *
 * 예전에는 이유만 있는 화면("이렇게 찾았어요")이 확인 카드 앞에 하나 더 있었다.
 * 스크롤을 줄이려고 나눈 것인데, 단계를 하나 늘린 것도 사실이었다 — 무엇을
 * 담을지 보려면 이유를 한 번 지나가야 했고, 이유를 다시 보려면 되돌아가야 했다.
 *
 * 이유는 그 메뉴를 왜 골랐는지의 설명이라 메뉴 옆에 있을 때 뜻이 산다. 그래서
 * 카드 바로 밑으로 내렸다.
 *
 * 빼 둔 메뉴(excluded)는 여기 안 넣는다 — 그건 고른 이유가 아니라 안 고른
 * 이유라서, 화면 맨 밑에 따로 둔다(뺀이유).
 */

export function 고른이유({ reasons, scoredAxes = [] }: {
  reasons?: RecommendationReason[];
  /**
   * 서버가 점수를 매길 때 이 메뉴를 밀어 준 축들.
   *
   * 이유 문장(reasons)이 빠뜨리는 것이 있어서 따로 보여 준다 — 가격 한도를 정해도
   * 서버의 이유 문장에는 가격 얘기가 한 줄도 안 나온다(실측). 그러면 사용자는
   * 자기가 정한 한도가 결과에 반영됐는지 알 방법이 없다.
   *
   * 점수 숫자는 안 띄운다. 0.0259 는 이 앱을 쓰는 분들에게 읽을 수 없는 값이다.
   */
  scoredAxes?: string[];
}) {
  const 쓴것 = reasons?.filter((r) => r.kind === "used") ?? [];
  const 못맞춘것 = reasons?.filter((r) => r.kind === "unmet") ?? [];
  if (쓴것.length === 0 && 못맞춘것.length === 0 && scoredAxes.length === 0) return null;
  return (
    <>
      {scoredAxes.length > 0 && (
        <div>
          <h3 style={{ ...TYPE.label, color: TEXT_2, marginBottom: 6 }}>이걸 보고 골랐어요</h3>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {scoredAxes.map((축) => (
              <span
                key={축}
                style={{
                  fontSize: 14, fontWeight: 700, color: TEXT_1, fontFamily: FONT,
                  backgroundColor: CANVAS, borderRadius: RADIUS.pill, padding: "8px 14px",
                }}
              >
                {축}
              </span>
            ))}
          </div>
        </div>
      )}
      {쓴것.length > 0 && <ReasonList reasons={쓴것} 제목="반영한 조건" />}
      {/* 못 맞춘 것을 반영한 것 바로 아래 둔다. 이 둘을 나란히 읽어야 무엇이
          되고 무엇이 안 됐는지가 한눈에 잡힌다. */}
      {못맞춘것.length > 0 && <ReasonList reasons={못맞춘것} 제목="맞추지 못한 조건" />}
    </>
  );
}

/**
 * 빼 둔 메뉴와 그 이유. **화면 맨 밑에 둔다.**
 *
 * 고른 이유와 나란히 두면 "이 메뉴를 고른 근거" 처럼 읽힌다. 여기 있는 것은
 * 화면에 없는 메뉴들의 이야기라, 지금 담을 것을 정하는 데 먼저 읽을 값이 아니다.
 * 그래도 지우지는 않는다 — 무엇이 왜 빠졌는지는 알려야 한다.
 */

export function 뺀이유({ reasons }: { reasons?: RecommendationReason[] }) {
  const 뺀것 = reasons?.filter((r) => r.kind === "excluded") ?? [];
  if (뺀것.length === 0) return null;
  return <ReasonList reasons={뺀것} 제목="빼 둔 메뉴와 그 이유" />;
}

export function OptionCard({
  name, price, selected, onClick, groupName, matched, 순위, disabled = false,
}: {
  name: string; price: string; selected: boolean; onClick: () => void; groupName: string;
  /**
   * 더 고를 수 없는 동안인가.
   *
   * 승인을 보내 놓고 답을 기다리는 사이에 쓴다. 그때 다른 후보를 짚으면 화면에
   * 검게 반전된 줄과 서버로 간 candidateId 가 어긋난다 — 무엇을 담고 있는지
   * 화면이 거짓말을 한다.
   */
  disabled?: boolean;
  /**
   * 추천 순위. 1 부터. 없으면 아무것도 안 그린다.
   *
   * 서버가 준 차례가 곧 순위다 — 총점 내림차순으로 정렬해서 내려준다
   * (백엔드 RecommendationEngineService 의 RANKING_COMPARATOR, 목은 mock.ts 의
   * 점수순()). 그래서 차례를 그대로 숫자로 옮겨 적는다.
   *
   * 여태 이 목록은 셋을 나란히만 두었다. 그러면 무엇이 가장 잘 맞는 것인지
   * 화면에 없다 — 서버는 알고 있는데 사용자만 모르는 값이었다.
   *
   * **색으로만 말하지 않는다.** 1등만 색을 뒤집어 놓으면 화면을 못 보는 분에게는
   * 순위가 없는 것과 같고, 색을 구분하기 어려운 분에게도 마찬가지다. 숫자를
   * 적고, 읽어 주는 이름(aria-label)에도 넣는다. 색은 거들기만 한다.
   */
  순위?: number;
  /**
   * 저장해 두신 조건과 이 후보가 한 축도 어긋나지 않는가.
   *
   * 서버가 후보별로 알려 준 unmatchedLabels 가 **비어 있을 때만** 참이다.
   * 안 알려 주면(undefined) 아무 말도 하지 않는다 - 이름을 뜯어보고 짐작하면
   * '아이스 아메리카노' 처럼 이름에 ICE 가 없는 후보를 틀렸다고 말하게 된다.
   */
  matched?: boolean;
}) {
  const [포커스, set포커스] = useState(false);
  const 속: React.ReactNode = (
    <>
      <span className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
        {/*
          순위 숫자. 1 등만 면을 채우고 나머지는 테두리만 둔다 — 셋 다 채우면
          순위가 아니라 장식이 된다.

          고른 줄은 면이 검게 반전되므로(겉모양) 1 등 배지도 같이 뒤집는다.
          안 뒤집으면 1 등을 고른 순간 검은 배지가 검은 면에 묻힌다. 뒤집으면
          어느 쪽이든 '1 등은 채워져 있다' 가 그대로 남는다 — 밝은 줄에서는
          검은 동그라미, 검은 줄에서는 밝은 동그라미.

          aria-hidden 인 이유 — 같은 값이 아래 radio 의 aria-label 에 이미
          들어가 있다. 안 가리면 "1 매운 순살 닭강정 6,000원" 처럼 숫자가 두 번
          읽힌다.
        */}
        {순위 !== undefined && (
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, ...NUM,
              // 1 등 배지는 초록으로 채운다 — 줄의 초록 띠와 같은 뜻이다.
              // 고른 줄에서는 예전대로 뒤집는다(검은 면에 초록을 얹으면 3.5:1 이라 묻힌다).
              backgroundColor: 순위 === 1 ? (selected ? PAPER : P) : "transparent",
              color: 순위 === 1 ? (selected ? RULE : PAPER) : (selected ? PAPER : TEXT_2),
              border: 순위 === 1 ? "none" : `1.5px solid ${selected ? PAPER : TEXT_2}`,
            }}
          >
            {순위}
          </span>
        )}
        {/*
          배지를 이름 옆에 두면 이름이 밀려 두 줄로 접힌다. 메뉴 이름은 이 줄에서
          가장 먼저 읽어야 하는 값이라 한 줄로 세우고, 배지는 아래로 내린다.
        */}
        <span style={{ minWidth: 0, textAlign: "left" }}>
        <span data-원문 style={{ ...TYPE.bodyBold, color: selected ? PAPER : TEXT_1, display: "block" }}>{name}</span>
        {/*
          위트 액센트 하나. 뜻은 옆의 '조건 일치' 라는 글자가 지고 있고 이 그림은
          거들기만 한다 - 이모지는 기기마다 모양이 다르고 스크린리더가 이름을
          읽어 주므로, 뜻을 이 자리에 맡기지 않는다.
        */}
        {/*
          초록이 아니라 검정이다.

          여기는 예전에 초록이었는데, 1 순위 줄이 초록을 쓰게 되면서 한 화면에서
          초록이 '순위' 와 '조건 일치' 두 가지를 가리키게 됐다(coderabbitai 리뷰).
          팔레트는 초록을 화면당 한 곳으로 못 박아 뒀다(tokens.ts).

          둘 중 하나를 내려야 하면 이쪽이다 — 순위는 줄 전체(면·띠·배지)로
          말하는 값이라 색을 빼면 남는 것이 24px 숫자 하나뿐이고, 조건 일치는
          체크 그림과 '조건 일치' 라는 글자가 이미 뜻을 다 지고 있다. 같은 이유로
          이유 목록의 '반영' 줄도 초록이 아니라 검정이다(이유표시).

          대비도 나아진다 — 초록면 위에서 초록 글자는 4.63 이었고 검정은 16.38 이다.
        */}
        {matched && (
          <span
            className="flex items-center"
            style={{ gap: 4, marginTop: 3, whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, color: selected ? PAPER : TEXT_1 }}
          >
            {/*
              이모지를 쓰지 않는다. 상태를 나타내는 자리라 심사 규칙이 선 아이콘을
              요구한다 — 이 파일의 다른 상태 배지도 모두 Pictogram 이다.
              이모지는 기기마다 모양이 다르고, aria-hidden 을 붙여도 자리 자체가
              상태 표시다.
            */}
            <Pictogram name="checkCircle" size={13} color={selected ? PAPER : TEXT_1} />조건 일치
          </span>
        )}
        </span>
      </span>
      <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
        <span style={{ fontFamily: SERIF, fontSize: 21, whiteSpace: "nowrap", color: selected ? PAPER : TEXT_1, ...NUM }}>{price}</span>
        <div aria-hidden="true" style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: selected ? PAPER : "transparent",
          // 안 고른 동그라미의 테두리는 "여기 고를 수 있는 게 있다"를 알리는 유일한 표시다.
          // TEXT_3 는 옅은 면 위에서 1.62:1 이라 컨트롤 경계 기준(3:1)에 못 미쳤다.
          border: selected ? "none" : `1.5px solid ${TEXT_2}`,
        }}>
          {selected && <Check size={12} strokeWidth={3} color={RULE} />}
        </div>
      </div>
    </>
  );

  /*
   * 카드에서 헤어라인 행으로 바꿨다.
   *
   * 후보가 셋이면 카드 셋이 각각 면을 갖는데, 종이색 바탕에서는 면이 겹겹이
   * 쌓여 보여 무엇을 고르는 자리인지가 흐려진다. 줄로 나누면 목록이 하나로
   * 읽히고, 고른 줄만 검게 반전돼서 어디를 골랐는지가 한눈에 들어온다.
   */
  /*
   * 1 순위만 초록 면을 깐다.
   *
   * 여태 셋이 같은 종이색 위에 나란히 있었고, 순위는 왼쪽의 작은 숫자 배지
   * 하나가 지고 있었다. 그 배지는 24px 이라 훑어볼 때는 안 보인다 — 서버가
   * 가장 잘 맞는다고 한 것이 화면에서 가장 안 띄는 셈이었다.
   *
   * ── 왜 초록인가 ────────────────────────────────────────────────────────────
   *
   * 이 팔레트의 '면' 은 전부 종이색 대비 1.1 이다(SURFACE·CANVAS·초록면 다).
   * 면만 바꿔서는 색이 달라 보이지 않는다. 실제로 달라 보이는 값은
   * 검정(17.79)과 초록(5.02)뿐인데, 검정은 이미 '고른 줄' 의 뜻이다.
   *
   * 그래서 초록으로 간다. 면은 조용하고, **왼쪽 4px 초록 띠와 초록 배지가
   * 실제로 보이는 몫**을 진다.
   *
   * 대신 **초록을 쓰던 다른 자리를 비웠다.** 처음에는 이름 아래 '조건 일치' 도
   * 초록인 채로 뒀는데, 그러면 한 화면에서 초록이 순위와 조건 일치 두 가지를
   * 가리킨다("화면당 한 곳", tokens.ts). 그쪽을 검정으로 내렸다 — 이유는 그
   * 자리의 주석에 적어 뒀다. 이 화면에서 초록은 이제 순위 하나만 뜻한다.
   *
   * ── 대비(실측) ─────────────────────────────────────────────────────────────
   *
   *   초록 띠 대 종이색            5.02  (컨트롤 경계 3:1)
   *   메뉴 이름 대 초록면         16.38
   *   '조건 일치' 대 초록면       16.38  (검정으로 내린 뒤)
   *   가격·부제 대 초록면          4.68
   *   배지 흰 글자 대 초록         5.02
   *
   * **색으로만 말하지 않는다.** 숫자 배지와 읽어 주는 이름("추천 1순위, …")이
   * 그대로 있다. 초록은 거들기만 한다.
   *
   * 고른 줄은 예전대로 검은 면이다 — 고른 것과 1 등을 같은 세기로 그리면
   * 무엇을 고른 것인지가 흐려진다.
   */
  const 일등면 = 순위 === 1 && !selected;
  const 겉모양 = {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    padding: "18px 16px", borderRadius: selected || 일등면 ? RADIUS.card : 0,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, fontFamily: FONT,
    border: "none", width: "100%",
    // 고른 것은 검은 면. 1 등은 초록 면.
    backgroundColor: selected ? RULE : 일등면 ? SUCCESS_BG : "transparent",
    // 왼쪽 띠는 안쪽 그림자로 그린다. border 로 그리면 그 두께만큼 안쪽이 밀려서
    // 1 순위 줄의 글자가 나머지 줄과 어긋난다.
    boxShadow: 일등면 ? `inset 4px 0 0 ${P}` : "none",
    transition: "background-color 0.15s",
  } as const;

  return (
    <label style={{
      ...겉모양, position: "relative", margin: 0,
      // 포커스는 숨은 input 이 받지만 표시는 이 라벨이 한다.
      // 화살표 키를 살리려다 포커스 표시를 잃으면 안 된다.
      outline: 포커스 ? `3px solid ${RULE}` : "none",
      outlineOffset: 2,
    }}>
      {/* 눈에는 안 보이지만 지우지 않는다. 화살표 이동과 그룹 의미는 이 요소가 만든다. */}
      <input
        type="radio"
        name={groupName}
        checked={selected}
        onChange={onClick}
        disabled={disabled}
        onFocus={() => set포커스(true)}
        onBlur={() => set포커스(false)}
        /*
         * 순위를 읽어 주는 이름 맨 앞에 넣는다. 눈으로는 배지가 그 일을 하는데,
         * 여기 안 넣으면 화면을 못 보는 분에게는 순위가 아예 없는 값이 된다.
         *
         * 맨 앞인 이유 — 셋을 훑을 때 순위가 먼저 들려야 고를 수 있다. 이름과
         * 값을 다 듣고 나서야 순위가 나오면 셋을 외워 두었다가 견줘야 한다.
         */
        aria-label={순위 === undefined ? `${name}, ${price}` : tf("추천 {순위}순위, {이름}, {값}", { 순위, 이름: name, 값: price })}
        style={SR_ONLY}
      />
      {속}
    </label>
  );
}

export function OrderExact({
  item, reasons, scoredAxes, 합계알림, 승인중, onApprove, onCancel,
}: {
  /** 승인 요청이 나가 있는 동안. 단추를 잠그고 그 사실을 글로 말한다. */
  승인중?: boolean;
  item: MappedItem; reasons?: RecommendationReason[];
  /** 뜻은 고른이유 의 같은 이름 주석에 있다. */
  scoredAxes?: string[];
  /** 합계가 한 개 값 한도를 넘을 때의 한 줄. 넘지 않으면 없다. */
  합계알림?: string;
  onApprove: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ConfirmCard badge="오늘의 메뉴에서 찾았어요">
        <ConfirmRow label="상품" value={item.displayName} />
        {item.options.map((o) => (
          <ConfirmRow key={o.label} label={o.label} value={o.value} />
        ))}
        <ConfirmRow label="가격" value={item.priceText} large />
      </ConfirmCard>
      {/*
        한 개 값은 한도 안인데 수량을 곱하면 넘는 경우를 알려 준다.

        **막지는 않는다.** 킷 규칙(CHICKEN_PRICE_LIMIT)은 단가에만 걸려 있어서
        서버는 이 주문을 통과시킨다. 여기서 막으면 서버는 되는데 앱만 안 되는
        상태가 되고, 사용자는 왜 막혔는지 알 수 없다. 알려 주고 정하게 한다.
      */}
      {합계알림 && (
        <p role="status" style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.7, textAlign: "center" }}>
          {합계알림}
        </p>
      )}
      <고른이유 reasons={reasons} scoredAxes={scoredAxes} />
      <뺀이유 reasons={reasons} />
      <PrimaryBtn onClick={승인중 ? undefined : onApprove} disabled={승인중}>
        {승인중 ? "담는 중이에요…" : "승인하고 담기"}
      </PrimaryBtn>
      <OutlineBtn onClick={승인중 ? undefined : onCancel} disabled={승인중}>취소</OutlineBtn>
    </div>
  );
}

export function OrderClarification({
  candidates, reason, reasons, scoredAxes, options, 승인중, onApprove, onCancel,
}: {
  /** 뜻은 OrderExact 의 같은 이름 주석에 있다. */
  승인중?: boolean;
  candidates: MappingCandidate[];
  reason?: string;
  reasons?: RecommendationReason[];
  /** 뜻은 고른이유 의 같은 이름 주석에 있다. */
  scoredAxes?: string[];
  /** 사용자가 고른 조건. 어느 후보를 고르든 같으므로 함께 보여 준다. */
  options?: MappedOption[];
  onApprove: (candidateId: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ ...TYPE.title, color: TEXT_1 }}>혹시 이 중<br />어떤 메뉴인가요?</h2>
        <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8 }}>{reason}</p>
      </div>
      {/*
       * 저장해 둔 조건을 고르기 전에 먼저 보여 준다.
       *
       * '그대로예요' 라고 단정하지 않는다. 후보마다 맞는 축이 다르기 때문이다.
       * 형태를 '순살' 로 저장했는데 '매운 뼈 닭강정' 을 고르면 형태는 안 맞는다.
       *
       * 어긋나는 축은 응답이 알려 준다(unmatchedLabels). 이름을 뜯어보고
       * 짐작하지 않는다 — '아이스 아메리카노' 는 온도가 ICE 인데 이름 어디에도
       * 'ICE' 가 없어서, 이름으로 판단하면 정확히 맞는 후보를 틀렸다고 말한다.
       * 서버가 알려 주지 않으면 아무 표시도 하지 않는다.
       */}
      {options && options.length > 0 && (
        <ConfirmCard badge="저장하신 조건" badgeTone="neutral">
          {options.map((o) => {
            const 고른후보 = selected !== null ? candidates[selected] : undefined;
            const 안맞음 = 고른후보?.unmatchedLabels?.includes(o.label) ?? false;
            return (
              <ConfirmRow
                key={o.label}
                label={o.label}
                value={o.value}
                changed={안맞음}
                changeNote={안맞음 ? "고르신 메뉴와 달라요" : undefined}
              />
            );
          })}
        </ConfirmCard>
      )}
      <div role="radiogroup" aria-label="비슷한 메뉴 후보" style={{ borderTop: `2px solid ${RULE}` }}>
        {candidates.map((c, i) => (
          <div key={`row-${c.candidateId}`} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
          <OptionCard
            key={c.candidateId}
            groupName="후보"
            selected={selected === i}
            name={c.displayName}
            price={c.priceText}
            matched={c.unmatchedLabels?.length === 0}
            // 서버가 준 차례가 곧 순위다 — 자세한 사연은 OptionCard 의 순위 주석에.
            순위={i + 1}
            onClick={() => setSelected(i)}
            disabled={승인중}
          />
          {/*
            이유는 **1 순위 밑에만** 붙인다.

            서버가 주는 이유는 응답 하나에 딸린 것이지 후보별로 오지 않는다
            (contracts/Candidate.java 에 이유 칸이 없다). 그래서 셋 밑에 다 붙이면
            같은 줄이 세 번 되풀이되고, 후보마다 다른 근거가 있는 것처럼 읽힌다.

            1 순위 밑에 두는 이유 — 이 이유들은 **왜 이 차례가 됐는지**의 설명이고,
            그 차례의 결과가 1 순위다. 목록 아래에 따로 떼어 두면 어느 메뉴 얘기인지
            가 흐려진다.

            2·3 순위 밑에는 그 후보만의 것이 이미 있다 — '조건 일치' 배지와, 위
            조건표의 '고르신 메뉴와 달라요' 표시가 그것이다.

            radiogroup 안이지만 라디오 묶기는 name 으로 되므로(각 줄의 숨은 input)
            화살표 이동은 그대로다.
          */}
          {i === 0 && (
            <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              <고른이유 reasons={reasons} scoredAxes={scoredAxes} />
            </div>
          )}
          </div>
        ))}
      </div>
      {/* 빼 둔 메뉴가 맨 밑이다. 아래 안내 한 줄은 단추에 붙어 있어야 하는 말이라
          그 사이에 이유가 끼면 안 된다 — 무엇을 눌러야 하는지가 멀어진다. */}
      <뺀이유 reasons={reasons} />
      {selected === null && (
        <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2 }}>메뉴를 선택하면 승인할 수 있어요</p>
      )}
      <PrimaryBtn
        onClick={selected !== null && !승인중 ? () => onApprove(candidates[selected].candidateId) : undefined}
        disabled={selected === null || 승인중}
      >
        {승인중 ? "담는 중이에요…" : "승인하고 담기"}
      </PrimaryBtn>
      <OutlineBtn onClick={승인중 ? undefined : onCancel} disabled={승인중}>취소</OutlineBtn>
    </div>
  );
}

export function OrderNotFound({ message, onCancel }: { message?: string; onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ paddingTop: 32 }}>
      <StatusHero
        mark={<Pictogram name="magnifyingGlass" size={62} color={TEXT_3} />}
        title="메뉴를 찾지 못했어요"
        desc={message}
      />
      <div style={{ width: "100%", marginTop: 36 }}>
        <OutlineBtn onClick={onCancel}>주문표 다시 보기</OutlineBtn>
      </div>
    </div>
  );
}

export function OrderChanged({
  item, diffNote, reasons, scoredAxes, 합계알림, 승인중, onApprove, onCancel,
}: {
  /** 뜻은 OrderExact 의 같은 이름 주석에 있다. */
  승인중?: boolean;
  item: MappedItem;
  diffNote?: string;
  /** 합계가 한 개 값 한도를 넘을 때의 한 줄. 승인 버튼이 있는 화면은 모두 받는다. */
  합계알림?: string;
  reasons?: RecommendationReason[];
  /** 뜻은 고른이유 의 같은 이름 주석에 있다. */
  scoredAxes?: string[];
  onApprove: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <ConfirmCard>
        <ConfirmRow label="상품" value={item.displayName} />
        {item.options.map((o) => (
          <ConfirmRow key={o.label} label={o.label} value={o.value} changed={!o.matched} changeNote={o.note} />
        ))}
        <ConfirmRow label="가격" value={item.priceText} large />
      </ConfirmCard>
      {/* 승인 버튼이 있는 화면은 모두 같은 안내를 단다(#100 리뷰). 막지는 않는다. */}
      {합계알림 && (
        <p role="status" style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.7, textAlign: "center" }}>
          {합계알림}
        </p>
      )}

      <div style={{ borderRadius: RADIUS.input, padding: "15px 18px", backgroundColor: WARN_BG, border: "none", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="flex gap-3 items-start">
          <Pictogram name="warning" size={19} color={WARN} style={{ marginTop: 1 }} />
          <p style={{ fontSize: 14, lineHeight: 1.6, color: WARN }}>{diffNote}</p>
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          // 승인 요청이 나가 있는 동안에는 못 푼다 — 이 체크가 그 요청의 조건이다.
          onClick={승인중 ? undefined : () => setChecked((v) => !v)}
          disabled={승인중}
          style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 44, border: "none", backgroundColor: "transparent", cursor: 승인중 ? "default" : "pointer", opacity: 승인중 ? 0.6 : 1, fontFamily: FONT, padding: 0 }}
        >
          {/*
           * 안 찍힌 네모의 테두리를 WARN_BORDER 로 그리면 노란 바탕 위에서 1.29:1 이라
           * 체크박스가 있다는 것 자체가 안 보인다. 이건 승인 조건을 사람이 직접 짚었다는
           * 표시를 받는 칸이라 흐리면 안 된다. WARN 으로 그리면 5.5:1 이다.
           */}
          <div aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6, border: checked ? "none" : `1.5px solid ${WARN}`, backgroundColor: checked ? WARN : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
            {checked && <Check size={12} strokeWidth={3} color={PAPER} />}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: WARN }}>달라진 내용을 확인했어요</span>
        </button>
      </div>

      <고른이유 reasons={reasons} scoredAxes={scoredAxes} />
      <뺀이유 reasons={reasons} />
      <PrimaryBtn onClick={checked && !승인중 ? onApprove : undefined} disabled={!checked || 승인중}>
        {승인중 ? "담는 중이에요…" : "변경 내용 확인하고 담기"}
      </PrimaryBtn>
      <OutlineBtn onClick={승인중 ? undefined : onCancel} disabled={승인중}>취소</OutlineBtn>
    </div>
  );
}

export function OrderLowConfidence({
  item, reasons, scoredAxes, 합계알림, 승인중, onApprove, onCancel,
}: {
  /** 뜻은 OrderExact 의 같은 이름 주석에 있다. */
  승인중?: boolean;
  item: MappedItem; reasons?: RecommendationReason[];
  /** 뜻은 고른이유 의 같은 이름 주석에 있다. */
  scoredAxes?: string[];
  /** 합계가 한 개 값 한도를 넘을 때의 한 줄. 승인 버튼이 있는 화면은 모두 받는다. */
  합계알림?: string;
  onApprove: () => void; onCancel: () => void;
}) {
  const [selected, setSelected] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ ...TYPE.title, color: TEXT_1 }}>이 메뉴가 맞는지<br />확실하지 않아요</h2>
        <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8 }}>맞다면 선택해 주세요</p>
      </div>
      {/*
       * 예전에는 이름과 가격만 보여 줬다. 확신이 낮으면서 조건도 못 맞춘 경우
       * 못 맞췄다는 사실이 화면에서 통째로 사라졌다 — 가장 조심해야 하는 상황에서
       * 정보가 가장 적었다. exact 와 같은 확인 카드를 그대로 쓴다.
       * 사용자는 포장인지 종이컵인지 몇 개인지 다 보고 나서 짚는다.
       */}
      <ConfirmCard badge="확실하지 않아요" badgeTone="caution">
        <ConfirmRow label="상품" value={item.displayName} />
        {item.options.map((o) => (
          <ConfirmRow key={o.label} label={o.label} value={o.value} changed={!o.matched} changeNote={o.note ?? "오늘은 이 조합이 없어요"} />
        ))}
        <ConfirmRow label="가격" value={item.priceText} large />
      </ConfirmCard>
      {/* 승인 버튼이 있는 화면은 모두 같은 안내를 단다(#100 리뷰). 막지는 않는다. */}
      {합계알림 && (
        <p role="status" style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.7, textAlign: "center" }}>
          {합계알림}
        </p>
      )}
      <InfoBox variant="info">시스템이 정확하게 찾지 못했어요. 위 내용을 확인하고 맞으면 아래에서 짚어 주세요.</InfoBox>
      {/*
       * 위 확인 카드와 같은 메뉴를 카드 모양으로 또 그리면 두 개인 줄 안다.
       * 여기는 고르는 자리가 아니라 "위 내용이 맞다" 고 짚는 자리이므로
       * 체크 한 줄로 둔다.
       */}
      <CheckRow
        checked={selected}
        onToggle={() => setSelected((v) => !v)}
        label="위 내용이 제가 시키려던 것이 맞아요"
        disabled={승인중}
      />
      <고른이유 reasons={reasons} scoredAxes={scoredAxes} />
      {/* 차례를 가른 이유는 OrderClarification 의 같은 자리 주석에 있다. */}
      <뺀이유 reasons={reasons} />
      {!selected && (
        <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2 }}>메뉴를 선택하면 승인할 수 있어요</p>
      )}
      <PrimaryBtn onClick={selected && !승인중 ? onApprove : undefined} disabled={!selected || 승인중}>
        {승인중 ? "담는 중이에요…" : "승인하고 담기"}
      </PrimaryBtn>
      <OutlineBtn onClick={승인중 ? undefined : onCancel} disabled={승인중}>취소</OutlineBtn>
    </div>
  );
}

export function OrderMappingLoading() {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ paddingTop: 72, paddingBottom: 72 }}>
      <StatusHero
        mark={<SpinnerIcon />}
        title="오늘의 메뉴와 맞춰보는 중"
        desc="저장한 주문이 오늘도 있는지 확인하고 있어요"
      />
    </div>
  );
}

export function OrderConfirmScreen({
  pairingId, sheet, onBack, on연결끝남, onApproved,
}: {
  pairingId: string;
  sheet: OrderSheet;
  onBack: () => void;
  /**
   * 거절해서 이 연결을 다 썼다.
   *
   * onBack 과 갈라 둔다. 머리의 뒤로가기는 그냥 나가는 것이라 연결이 살아
   * 있지만, 거절은 서버가 그 pairing 을 폐기하는 자리다(팀 #146). 둘을 한
   * 콜백으로 묶으면 그냥 나간 사람의 연결까지 끊게 된다.
   */
  on연결끝남: () => void;
  onApproved: (planId: string) => void;
}) {
  const [mapping, setMapping] = useState<MappingResponse | null>(null);
  // 서버가 이유를 여러 줄 줄 수 있어 문장 하나가 아니라 목록으로 들고 있는다.
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);
  /*
   * 한 개 값은 한도 안인데 수량을 곱하면 넘는 경우.
   *
   * 킷 규칙(CHICKEN_PRICE_LIMIT)은 후보의 단가에만 MAX 를 건다 — quantity 는 그
   * 비교에 안 들어간다. 그래서 8,000원 한도에 8,000원짜리 두 개가 통과한다.
   * 서버가 틀린 것이 아니라 그 값의 뜻이 '한 개 값 상한' 이라서다.
   *
   * 우리가 대신 세어 알려만 준다. 막지 않는 이유는 OrderExact 주석에 적었다.
   */
  const 한도 = 가격한도.읽기();
  const 수량 = Number((sheet.selections?.["수량"]?.[0] ?? "").replace(/[^0-9]/g, "")) || 1;
  /*
   * 이유는 여기서 한 번만 합쳐 아래로 내려보낸다.
   *
   * 서버가 맞은 축마다 한 줄씩 주는 탓에 같은 메뉴 이름이 되풀이됐다
   * (i18n/reason.ts 의 이유묶기). 화면마다 따로 합치면 접힌 한 줄이 세는
   * "외 N개" 와 펼친 목록의 줄 수가 어긋난다 — 둘이 같은 목록을 봐야 한다.
   */
  const 이유들 = useMemo(
    () => 이유묶기(mapping?.reasons ?? [], sheet.selections),
    [mapping?.reasons, sheet.selections],
  );
  /*
   * 승인 버튼이 있는 화면은 셋이다 — exact · changed · low_confidence. 셋 다
   * MappedItem 을 그리고 셋 다 담긴다. 한 곳에만 안내를 달면 나머지 둘에서는
   * 합계가 한도를 넘어도 아무 말 없이 담긴다(#100 리뷰).
   */
  const 단가 = mapping?.item?.price;
  const 합계알림 = (한도 !== null && typeof 단가 === "number" && 수량 > 1 && 단가 * 수량 > 한도)
    ? tf("한 개 값은 한도 안이지만, {수량}개면 {합계}예요.", {
        수량, 합계: 돈(단가 * 수량, 접근성설정.읽기().language === "en-US"),
      })
    : undefined;
  // 승인은 한 번만. 연타로 실행 계획이 두 번 만들어지면 안 된다.
  /*
   * 승인 중인가. **두 벌로 들고 있다.**
   *
   * ref 는 중복 호출을 막는다 — 상태만 두면 setState 가 다음 그림에 반영되므로,
   * 빠르게 두 번 누르면 두 번 나간다.
   *
   * 상태는 화면을 바꾼다. 예전에는 ref 만 있어서, 서버가 답할 때까지 단추가
   * 그대로 눌리는 채였고 아무 표시도 없었다. 중복은 막았지만 사용자는 눌린
   * 것인지 알 수 없었다 — 이 앱을 쓰는 분들에게 반응 없는 단추가 가장 막히는
   * 자리다.
   */
  const approving = useRef(false);
  const [승인중, set승인중] = useState(false);
  /*
   * 이 화면을 이미 떠났나.
   *
   * 승인 요청은 서버를 한 번 오간다. 그 사이에 화면이 접히면(거절, 뒤로 가기,
   * 부모가 연결을 끝냄) 늦게 도착한 답이 onApproved 를 불러 **떠난 화면이
   * 실행 계획 화면을 다시 연다.** 사용자는 그만뒀는데 앱이 주문을 이어 간다.
   *
   * 그래서 나가는 길마다 여기 표를 남기고, 돌아온 답은 그 표를 먼저 본다.
   * 요청 자체는 안 되돌린다 — 서버는 이미 받았고, 되돌리는 것은 거절의 몫이다.
   */
  const 떠났나 = useRef(false);
  useEffect(() => () => { 떠났나.current = true; }, []);

  useEffect(() => {
    let alive = true;
    api.requestMapping(pairingId, sheet.id)
      .then((res) => { if (alive) setMapping(res); })
      .catch((e: KioBridgeError) => { if (alive) setError({ message: e.message }); });
    return () => { alive = false; };
  }, [pairingId, sheet.id]);

  // P0-4: 실행 계획 생성은 이 핸들러 안에서만 일어난다.
  // 매핑 조회(useEffect)는 계획을 만들지 않으므로 승인 전 실행 경로가 존재하지 않는다.
  /**
   * 승인하지 않고 되돌아간다.
   *
   * 그냥 화면만 닫으면 서버는 사용자가 무엇을 보고 무엇을 거절했는지 모른다.
   * 대신 눌러 주는 앱에서 '아니오' 는 '예' 만큼 중요한 기록이라 남긴다.
   *
   * 기다리지 않고 바로 되돌아간다. 그만두겠다는 사람을 붙잡지 않는다.
   * 기록이 실패해도 화면은 이미 나가 있다 — 그건 서버 사정이지
   * 사용자가 감당할 일이 아니다.
   */
  const 거절하기 = () => {
    /*
     * 승인을 보내 놓고 기다리는 중이면 거절이 안 된다.
     *
     * 두 요청이 같은 pairing 을 두고 엇갈린다. 거절이 먼저 닿아 연결이 폐기되면
     * 승인은 실패하고, 승인이 먼저 닿으면 이미 담긴 것을 거절로 지우는 셈이다.
     * 어느 쪽이든 화면에 보이는 것과 서버에 남는 것이 갈린다.
     *
     * 단추도 함께 잠근다(승인중). 여기 검사는 그 그물을 빠져나온 길 —
     * 키보드 연타나 스크린리더의 직접 활성화 — 을 위한 것이다.
     */
    if (approving.current) return;
    떠났나.current = true;
    /*
     * 되돌아가는 것으로 끝내지 않고, 이 연결이 끝났다는 것까지 알린다.
     *
     * 서버는 거절도 승인과 같은 경로로 처리해 pairing 을 폐기한다. 프론트가
     * 그 값을 계속 들고 있으면, 다른 주문표로 들어갈 때 죽은 연결로 매핑을
     * 시도해 "연결 정보를 찾을 수 없습니다" 라는 개발자 말이 뜬다(팀 #146).
     */
    on연결끝남();
    void api.reject({ pairingId, sheetId: sheet.id }).catch(() => {});
  };

  /*
   * 이유를 먼저 읽고, 그 다음에 무엇을 담을지 고른다.
   *
   * 예전에는 한 화면에 확인 카드.조건표.후보 목록.이유가 다 쌓여서, 이유를
   * 읽으려면 스크롤을 한참 내려야 했다. 승인 전에 꼭 읽어야 할 것이 가장 읽기
   * 어려운 자리에 있었다. 단계를 나눈다.
   *
   * 이유가 없으면 이 단계를 건너뛴다 - 빈 화면을 하나 더 지나가게 하지 않는다.
   */
  /*
   * 이유만 있는 화면은 없앴다.
   *
   * 확인 카드 앞에 "이렇게 찾았어요" 한 화면이 더 있었다. 스크롤을 줄이려고
   * 나눈 것인데, 단계를 하나 늘린 것도 사실이었다 — 무엇을 담을지 보려면 이유를
   * 한 번 지나가야 했고, 이유를 다시 읽으려면 되돌아가야 했다. '쉬운 단계' 를
   * 켠 사람에게는 아예 건너뛰게 해 두었던 것도 그 때문이다.
   *
   * 지금은 이유가 메뉴 카드 바로 밑에 붙는다(고른이유). 왜 골랐는지의 설명이라
   * 메뉴 옆에 있을 때 뜻이 살고, 한 화면에서 다 읽힌다. 빼 둔 메뉴는 맨 밑이다
   * (뺀이유). 킷 가이드가 [필수] 로 정한 "왜 그런지 함께 보여준다" 는 그대로다.
   */

  /*
   * 내용이 도착한 뒤에 제목으로 포커스를 옮긴다.
   *
   * App 의 화면 전환 효과는 screen 이 바뀌는 그 순간 한 번만 돈다. 그런데 이
   * 화면은 **비어 있는 채로 뜬다** — 매핑을 기다리는 동안에는 제목이 아직
   * 없어서, 그 효과는 옮길 곳을 못 찾고 그냥 돌아간다. 추천이 도착해 제목이
   * 그려질 때는 효과가 다시 돌지 않으므로 포커스는 <body> 에 남는다.
   *
   * 무엇이 주문될지 정하는 자리다. 키보드로 쓰는 사람이 하필 여기서 문서 맨
   * 위부터 Tab 을 다시 눌러 내려와야 하는 것이 가장 나쁘다.
   */
  const 본문칸 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 아직 기다리는 중이면 옮길 곳이 없다. 도착하면 이 효과가 다시 돈다.
    if (!mapping) return;
    const 뿌리 = 본문칸.current;
    if (!뿌리) return;
    /*
     * 보이는 제목만 고른다.
     *
     * 확인 갈래는 이유를 볼 때도 display:none 으로 붙어 있다(아래 주석 참고).
     * 그냥 첫 제목을 잡으면 화면 밖에 있는 제목에 포커스가 가서, 키보드
     * 사용자는 자기가 어디 있는지도 모르고 다음 Tab 이 어디서 이어질지도 모른다.
     */
    const 제목 = [...뿌리.querySelectorAll<HTMLElement>("h1, h2")].find((e) => e.offsetParent !== null);
    if (!제목) return;
    if (!제목.hasAttribute("tabindex")) 제목.setAttribute("tabindex", "-1");
    // 스크롤을 내려 둔 상태에서 단계가 바뀔 수 있다. 보이게 한 뒤에 잡는다(#120).
    제목.scrollIntoView({ block: "nearest", inline: "nearest" });
    제목.focus({ preventScroll: true });
  }, [mapping]);

  const approve = (extra: Omit<ApproveInput, "pairingId" | "sheetId" | "mappingResult"> = {}) => {
    if (!mapping || approving.current) return;
    approving.current = true;
    set승인중(true);
    setError(null);
    api.approve({ pairingId, sheetId: sheet.id, mappingResult: mapping.result, ...extra })
      .then((res) => { if (!떠났나.current) onApproved(res.planId); })
      .catch((e: KioBridgeError) => {
        if (떠났나.current) return;
        approving.current = false;
        set승인중(false);
        setError({ message: e.message, ...(e.details && e.details.length > 1 ? { details: e.details } : {}) });
      });
  };

  // 거절하기 와 같은 이유로 승인 중에는 나가지 않는다. 여기는 거절 기록을
  // 남기지 않는 길이라(그냥 되돌아가기) 표만 남기고 나간다.
  const 뒤로가기 = () => {
    if (approving.current) return;
    떠났나.current = true;
    onBack();
  };

  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0" style={{ padding: `12px ${GAP.screenX}px 0` }}>
        <BackButton onClick={뒤로가기} disabled={승인중} />
        <div className="flex items-center gap-2" style={{ marginTop: 20, paddingBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: PAPER, backgroundColor: RULE, padding: "4px 11px", borderRadius: RADIUS.pill }}>내 주문표</span>
          <span data-원문 style={{ ...TYPE.bodyBold, color: TEXT_1 }}>{sheet.menuName}</span>
        </div>
        <div style={{ height: 1, backgroundColor: BORDER, marginLeft: -GAP.screenX, marginRight: -GAP.screenX }} />
      </div>

      <div ref={본문칸} className="flex-1 overflow-y-auto pb-6" style={{ minHeight: 0, paddingLeft: GAP.screenX, paddingRight: GAP.screenX, paddingTop: 24 }} aria-busy={!mapping && !error}>
        {!mapping && !error && <OrderMappingLoading />}

        {/*
          이유가 여러 줄이면 줄줄이 잇지 않고 하나씩 세운다. 붙여 놓으면
          두 가지 문제가 한 문장으로 읽혀서 몇 개인지조차 안 보인다.
          InfoBox 안은 <p> 라 <ul> 을 넣을 수 없어 블록 <span> 으로 세운다.
        */}
        {error && (
          <div className="mb-4" role="alert">
            <InfoBox>
              {error.details
                ? <>
                    이런 점 때문에 담지 못했어요.
                    {/* 서버는 distinct 로 주지만 옛 경로는 같은 문장이 겹칠 수 있다. */}
                    {error.details.map((줄, i) => (
                      <span key={`${i}-${줄}`} style={{ display: "block", marginTop: 6 }}>· {줄}</span>
                    ))}
                  </>
                : error.message}
            </InfoBox>
          </div>
        )}

        {!mapping && error && <OutlineBtn onClick={onBack}>주문표 다시 보기</OutlineBtn>}

        {/*
          '직원 도움' 을 켠 사람에게는 승인 화면에서도 이 줄을 띄운다.

          지금까지 이 안내는 실패.중단 화면에만 있었다. 그런데 막히는 곳은
          대개 실패 화면이 아니라 "이게 맞나" 싶은 확인 화면이고, 거기서
          도움을 청할 길이 없으면 사람은 그냥 앱을 닫는다.
          켠 사람에게만 띄운다 - 안 켠 사람에게는 화면에 줄 하나가 더 늘 뿐이다.
        */}
        {mapping && 접근성설정.읽기().staffAssistancePreferred && (
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 16 }}>
            <Pictogram name="warning" size={17} color={TEXT_2} />
            <p style={{ ...TYPE.caption, color: TEXT_2, flex: 1 }}>
              막히시면 이 화면을 매장 직원에게 보여 주세요. 직원이 이어서 도와드릴 수 있어요.
            </p>
          </div>
        )}

        <div>
        {/*
         * item 이 없으면 그리지 않는다. 예전에는 mapping.item! 로 있다고 단정했는데,
         * 조건에 다 걸려 후보가 하나도 안 남으면 undefined 가 들어와 화면이 터진다.
         * 목은 이제 그 경우를 not_found 로 답하지만, 화면이 서버를 믿고 단정할 이유는 없다.
         */}
        {mapping?.result === "exact" && mapping.item && (
          <OrderExact 승인중={승인중} item={mapping.item} reasons={이유들} scoredAxes={mapping.scoredAxes} 합계알림={합계알림} onApprove={() => approve()} onCancel={거절하기} />
        )}
        {mapping?.result === "clarification" && (
          <OrderClarification 승인중={승인중}
            candidates={mapping.candidates ?? []}
            reason={mapping.reason}
            reasons={이유들}
            scoredAxes={mapping.scoredAxes}
            options={mapping.sheetOptions}
            onApprove={(candidateId) => approve({ candidateId })}
            onCancel={거절하기}
          />
        )}
        {mapping?.result === "not_found" && <OrderNotFound message={mapping.message} onCancel={거절하기} />}
        {mapping?.result === "changed" && mapping.item && (
          <OrderChanged 승인중={승인중}
            item={mapping.item}
            diffNote={mapping.diffNote}
            reasons={이유들}
            scoredAxes={mapping.scoredAxes}
            합계알림={합계알림}
            onApprove={() => approve({ acknowledgedDiff: true })}
            onCancel={거절하기}
          />
        )}
        {/*
         * 상태는 왔는데 그 상태가 요구하는 필드가 없는 경우.
         * 예전에는 조건이 거짓이 되어 본문이 통째로 비었고, 사용자는
         * 무슨 일이 일어났는지도 나갈 방법도 알 수 없었다.
         */}
        {(mapping?.result === "exact" || mapping?.result === "changed" || mapping?.result === "low_confidence") && !mapping.item && (
          <div className="flex flex-col gap-4">
            <InfoBox>메뉴 정보를 불러오지 못했어요. 키오스크 화면을 직접 확인해 주세요.</InfoBox>
            <OutlineBtn onClick={onBack}>주문표 다시 보기</OutlineBtn>
          </div>
        )}
        {mapping?.result === "low_confidence" && mapping.item && (
          <OrderLowConfidence 승인중={승인중}
            item={mapping.item}
            reasons={이유들}
            scoredAxes={mapping.scoredAxes}
            합계알림={합계알림}
            /* 사용자가 카드를 눌러 "이 메뉴가 맞다"고 짚어야만 여기까지 온다. 그 사실을 서버에도 알린다. */
            onApprove={() => approve({ confirmedLowConfidence: true })}
            onCancel={거절하기}
          />
        )}
        </div>
      </div>
    </div>
  );
}
