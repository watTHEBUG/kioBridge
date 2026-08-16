import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import { Pictogram } from "@/design/Pictogram";
import { BORDER, CANVAS, FONT, GAP, KICKER, NUM, PAPER, RADIUS, RULE, SURFACE, TEXT_1, TEXT_2, TEXT_3, TYPE } from "@/design/tokens";
import { MainTab, OrderSheet } from "@/domain/types";
import { PLACE_ICONS, 못채운필수축 } from "@/domain/catalog";
import { 돈 } from "@/i18n/apply";
import { t, tf } from "@/i18n/t";
import { 백엔드가아는장소 } from "@/api/canonical";
import { 소리로주고받나 } from "@/app/공용";
import { SR_ONLY, AppLogo, InfoBox, OutlineBtn, PrimaryBtn, ReceiptSpot, Rule, StickyFooter } from "@/app/ui";

export function OrderSheetCard({
  sheet, selected, onSelect, onDelete, onEdit,
}: {
  sheet: OrderSheet; selected: boolean; onSelect: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const allTags = [...(sheet.place ? [sheet.place] : []), ...Object.values(sheet.selections).flat()];
  const visibleTags = allTags.slice(0, 4);
  // 화면은 태그를 넷까지만 보여 주지만 소리로는 전부 읽는다. 눈으로 보는 사람은
  // 잘린 뒤에도 카드 두 개가 다르게 생긴 걸 알지만, 듣는 사람은 읽어 준 만큼만 안다.
  const 듣는이름 = (p: OrderSheet) =>
    [p.menuName, p.place, ...Object.values(p.selections).flat(), p.memo].filter(Boolean).join(", ");
  const overflow = allTags.length - visibleTags.length;
  const [focused, setFocused] = useState(false);

  /*
   * 고르는 곳과 지우는 곳은 형제여야 한다.
   *
   * 예전에는 카드 전체가 role="radio" 이고 그 안에 삭제 버튼이 들어 있었다.
   * 그러면 삭제 버튼에 포커스를 두고 Enter 를 눌러도 카드만 선택되고 지워지지 않는다.
   * 부모가 그 Enter 를 가로채 preventDefault() 해 버리기 때문이다.
   * 키보드만 쓰는 사람에게는 주문표를 지울 방법이 아예 없었다.
   *
   * 고르는 일은 진짜 input[type=radio] 에 맡긴다. 화살표 키로 옮겨 다니는 것과
   * 그룹 전체에 탭이 한 번만 걸리는 것을 브라우저가 알아서 해 준다.
   */
  return (
    <div
      style={{
        position: "relative",
        borderRadius: RADIUS.card, marginBottom: 10,
        border: "none",
        // 고른 주문표는 검은 면. 초록은 담기 성공 체크에만 남긴다.
        backgroundColor: selected ? RULE : SURFACE,
        transition: "background-color 0.15s",
        outline: focused ? `3px solid ${TEXT_1}` : "none",
        outlineOffset: 2,
      }}
    >
      <label style={{ display: "block", padding: "20px 20px 0", cursor: "pointer" }}>
        <input
          type="radio"
          name="saved-sheet"
          style={SR_ONLY}
          checked={selected}
          onChange={onSelect}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // 이름과 장소만 읽으면 "닭강정, 음식점" 두 개를 소리로 구분할 수 없다.
          // 화면은 태그와 메모로 구분되는데 듣는 사람만 못 고른다.
          aria-label={듣는이름(sheet)}
        />
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* 저장된 주문표에는 사진을 붙이지 않는다. 아직 어느 키오스크에도 물어보기 전이라
                여기서 사진을 보여 주면 오늘 실제로 나올 메뉴를 앱이 장담하는 꼴이 된다. */}
            <div
              aria-hidden="true"
              style={{
                width: 40, height: 40, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: selected ? "rgba(127,127,127,0.22)" : PAPER,
                color: selected ? PAPER : TEXT_1, flexShrink: 0,
              }}
            >
              {sheet.place ? PLACE_ICONS[sheet.place] : <Pictogram name="squaresFour" size={19} />}
            </div>
            <span data-원문 style={{ ...TYPE.bodyBold, color: selected ? PAPER : TEXT_1 }}>{sheet.menuName}</span>
          </div>
          <div
            aria-hidden="true"
            style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 5,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: selected ? PAPER : "transparent",
              // 안 고른 동그라미의 테두리는 "여기 고를 수 있는 게 있다"를 알리는 유일한 표시다.
              // TEXT_3 는 옅은 면 위에서 1.62:1 이라 컨트롤 경계 기준(3:1)에 못 미쳤다.
              border: selected ? "none" : `1.5px solid ${TEXT_2}`,
            }}
          >
            {selected && <Check size={13} strokeWidth={3} color={RULE} />}
          </div>
        </div>

        {/*
         * 고른 카드 위의 태그는 초록을 어둡게 눌러서 만든다.
         * 예전에는 흰색을 14% 얹어 밝은 알약을 만들고 글자를 86% 흰색으로 썼는데,
         * 그러면 대비가 3.35:1 이라 13px 글자 기준(4.5:1)에 못 미쳤다.
         * 흰 글자를 100% 로 올려도 밝아진 바탕 때문에 3.94:1 에서 멈춘다.
         * 바탕을 어둡게 하면 같은 알약 모양 그대로 6.6:1 이 나온다.
         */}
        <div className="flex flex-wrap gap-1.5">
          {visibleTags.map((tag, i) => (
            <span key={i} style={{
              fontSize: 13, fontWeight: 500, padding: "4px 11px", borderRadius: RADIUS.pill,
              backgroundColor: selected ? "rgba(127,127,127,0.22)" : PAPER,
              color: selected ? PAPER : TEXT_2,
            }}>
              {tag}
            </span>
          ))}
          {overflow > 0 && (
            <span style={{
              fontSize: 13, fontWeight: 500, padding: "4px 11px", borderRadius: RADIUS.pill,
              backgroundColor: selected ? "rgba(127,127,127,0.22)" : PAPER,
              color: selected ? PAPER : TEXT_2,
            }}>
              +{overflow}
            </span>
          )}
        </div>

        {/* 반투명 흰색(70%)은 초록 위에서 3.31:1 이라 읽히지 않는다. 흰색은 5.08:1 이다. */}
        {sheet.memo && (
          <p style={{ fontSize: 14, color: selected ? PAPER : TEXT_2, lineHeight: 1.5, marginTop: 12 }} data-원문>{sheet.memo}</p>
        )}
      </label>

      {/* 고치기·삭제는 라벨 바깥에 둔다. 안에 있으면 label 이 클릭을 가로채 선택으로 바꿔 버린다. */}
      <div className="flex justify-end" style={{ gap: 4, padding: "0 20px 20px", marginTop: 4 }}>
        {/*
          고치기를 삭제 왼쪽에 둔다. 손이 가는 순서가 그렇고, 되돌릴 수 없는 쪽이
          끝에 있어야 잘못 눌러도 덜 위험하다.
        */}
        <button
          type="button"
          aria-label={`${듣는이름(sheet)}, 주문표 고치기`}
          onClick={onEdit}
          style={{
            fontSize: 13, fontWeight: 500, minHeight: 44, minWidth: 44, padding: "6px 10px",
            background: "none", border: "none", cursor: "pointer",
            color: selected ? PAPER : TEXT_2,
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          고치기
        </button>
        <button
          type="button"
          // 삭제는 되돌릴 수 없다. 고르는 쪽보다 더 정확히 말해 줘야 한다.
          /* 쉼표로 띄운다. 스크린리더가 한 박자 쉬어 읽고, 옮길 때도 토막마다 걸린다. */
          aria-label={`${듣는이름(sheet)}, 주문표 삭제`}
          onClick={onDelete}
          style={{
            // 높이만 44 였고 폭이 30 이었다. 밑줄은 글자에만 걸리므로
            // 폭을 44 로 넓혀도 보이는 크기는 그대로고 누를 수 있는 데만 넓어진다.
            fontSize: 13, fontWeight: 500, minHeight: 44, minWidth: 44, padding: "6px 10px",
            background: "none", border: "none", cursor: "pointer",
            // 70% 흰색은 초록 위에서 3.31:1 이었다. 지우는 버튼은 흐릿하면 안 된다.
            color: selected ? PAPER : TEXT_2,
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/**
 * 가격 한도를 고르는 줄.
 *
 * 순위를 바꾸는 값이 아니라 **후보를 빼는 값**이다. 서버에서 확인한 것:
 * 한도가 5,000원이면 5,500~7,000원짜리 후보가 전부 excludedCandidates 로 빠지고
 * reasonCode 는 PRICE_LIMIT_EXCEEDED 다. 그래서 "비싼 건 빼고 찾아요" 라고
 * 먼저 말한다 — 순위만 밀리는 줄 알고 낮게 잡으면 담을 게 없다는 답을 받는다.
 *
 * **묻는 자리는 주문표를 만들 때다.** 맵기·형태를 고르는 그 자리에서 얼마까지
 * 쓸지도 같이 정한다. 예전에는 주문 직전에 물었는데, 그때는 이미 어느 키오스크
 * 앞에 서 있는 참이라 조건을 되짚는 자리가 아니다.
 *
 * **담기는 곳은 주문표가 아니라 이번 이용이다.** 예산은 그날그날 다르다. 주문표에
 * 넣으면 지난주에 정한 한도가 저장된 조건으로 굳어, 오늘 주문에서 말없이 후보를
 * 자른다. 그래서 값은 budget.ts 의 이용 저장소에 담고 창을 닫으면 사라진다 —
 * 묻는 자리와 담는 자리가 다른 것은 일부러 그렇게 한 것이다.
 *
 * 만들어 둔 주문표만 있는 사람도 바꿀 수 있어야 해서 도움 설정 화면에도 둔다.
 * 알레르기가 가입 때 묻고 설정에서 고치는 것과 같은 모양이다.
 */

export function 한도적기({ 예산, on바꾸기, 영어인가 }: {
  예산: number | null;
  on바꾸기: (원: number | null) => void;
  /** 금액 표기가 언어마다 달라서 여기까지 내려온다("6,000원" vs "KRW 6,000"). */
  영어인가: boolean;
}) {
  // 이 칸은 만들기 화면과 도움 설정 두 곳에 뜬다. id 를 손으로 적어 두면 언젠가
  // 둘이 같이 떠서 라벨이 엉뚱한 칸을 가리킨다. React 가 겹치지 않게 지어 준다.
  const 칸id = useId();
  const [적은것, set적은것] = useState(예산 === null ? "" : String(예산));

  /*
   * 밖에서 값이 바뀌면 따라간다 — 로그아웃으로 비워지거나, 다른 화면에서 고친
   * 경우다. 적는 중에는 안 건드린다: 지금 칸의 값이 이미 그 숫자면 그대로 둔다.
   * (안 그러면 "8000" 을 적는 동안 매 글자마다 칸이 다시 쓰여 커서가 튄다.)
   */
  useEffect(() => {
    set적은것((지금) => (숫자만읽기(지금) === 예산 ? 지금 : 예산 === null ? "" : String(예산)));
  }, [예산]);

  const 고치기 = (글: string) => {
    /*
     * 숫자만 남긴다. 사람은 "8,000" 이나 "8000원" 이라고 적는다. 그걸 틀렸다고
     * 돌려보내는 대신 우리가 읽어 낸다. 앞의 0 은 버리고(0 8000 → 8000),
     * 일곱 자리에서 끊는다 — 키오스크 한 끼에 천만 원은 오타다.
     */
    const 숫자 = 글.replace(/[^0-9]/g, "").replace(/^0+/, "").slice(0, 7);
    set적은것(숫자);
    on바꾸기(숫자 === "" ? null : Number(숫자));
  };

  return (
    <div>
      <label htmlFor={칸id} style={{ ...TYPE.label, color: TEXT_2, display: "block", marginBottom: 6 }}>
        {/*
          "가격 한도" 라고만 두면 총액으로 읽힌다. 실제로 그렇게 읽고 8,000원을
          적은 뒤 8,000원짜리를 두 개 담았는데 안 걸러진다는 얘기를 들었다.

          킷 규칙이 단가와 비교한다 — CHICKEN_PRICE_LIMIT 은 후보의 price 필드에
          MAX 를 건다. quantity 는 이 비교에 안 들어간다. 그러니 화면이 "가격
          한도" 라고 부르는 것이 틀린 말이었다. 서버가 하는 일 그대로 부른다.
        */}
        한 개 값 한도 (선택)
        {/*
          눈으로는 칸 오른쪽의 "원" 이 단위를 알려 주지만, 그건 장식이라
          aria-hidden 이다. 소리로만 듣는 사람은 이 칸이 원 단위인지 만 원
          단위인지 알 수 없다. 잘못 적으면 후보가 통째로 걸러지는 값이라
          라벨에서 한 번 말해 준다(#98 리뷰).
        */}
        <span className="sr-only">{영어인가 ? " in won" : " 원 단위"}</span>
      </label>
      <div className="flex items-center" style={{ gap: 8, backgroundColor: CANVAS, borderRadius: RADIUS.input, padding: "0 16px" }}>
        <input
          id={칸id}
          /*
           * type="number" 를 안 쓴다. 칸에 손을 얹고 휠을 굴리면 값이 말없이
           * 바뀌고, 위아래 화살표는 손이 떨리는 사람에게 누르기 어려운 크기다.
           * 숫자판은 inputMode 로 띄운다.
           */
          type="text"
          inputMode="numeric"
          value={적은것}
          onChange={(e) => 고치기(e.target.value)}
          placeholder="예: 8000"
          aria-describedby={`${칸id}-help`}
          style={{
            flex: 1, minWidth: 0, ...TYPE.body, color: TEXT_1, fontFamily: FONT, ...NUM,
            padding: "15px 0", border: "none", outline: "none", backgroundColor: "transparent",
          }}
        />
        {/* 단위는 표에 넣지 않고 여기서 언어를 보고 적는다 — 돈() 과 같은 이유다. */}
        <span aria-hidden="true" style={{ ...TYPE.body, color: TEXT_2 }}>{영어인가 ? "KRW" : "원"}</span>
      </div>
      {/* 적는 동안 글자마다 바뀐다. 바뀔 때마다 읽으면 한 글자에 한 문장씩 듣는다. */}
      <p id={`${칸id}-help`} data-소리조용 style={{ fontSize: 12, color: TEXT_2, marginTop: 6, lineHeight: 1.6 }}>
        {예산 === null
          ? "비워 두면 한도 없이 찾아요"
          : tf("한 개에 {금액}보다 비싼 메뉴는 빼고 찾아요. 남는 게 없으면 그렇다고 알려 드려요.", { 금액: 돈(예산, 영어인가) })}
      </p>
    </div>
  );
}

/** 적힌 글에서 우리가 값으로 읽는 숫자. 못 읽으면 null 이다. */

export const 숫자만읽기 = (글: string): number | null => {
  const 숫자 = 글.replace(/[^0-9]/g, "").replace(/^0+/, "");
  return 숫자 === "" ? null : Number(숫자);
};

export function SavedSheetsScreen({
  sheets, onAddSheet, onAddVoiceSheet, onDeleteSheet, onEditSheet, onOrder, showOrder = false,
}: {
  sheets: OrderSheet[];
  onAddSheet: () => void;
  /** 말로 만드는 길. 못 듣는 기기에서는 단추를 안 내민다. */
  onAddVoiceSheet: () => void;
  onDeleteSheet: (id: string) => void;
  onEditSheet: (sheet: OrderSheet) => void;
  onOrder: (sheet: OrderSheet) => void;
  showOrder?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(sheets[0]?.id ?? null);

  // 목록이 바뀌면 고른 것도 따라가야 한다. 초기값에 갇혀 있으면
  // 전부 지웠다가 새로 만들었을 때 아무것도 안 골라진 채로 남고,
  // '이 주문표로 주문하기'가 계속 잠겨서 빠져나갈 방법이 없어진다.
  useEffect(() => {
    if (sheets.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    // 목록이 실제로 바뀌었을 때만 따라간다.
    // 지워진 주문표가 골라져 있었으면 첫 번째로 옮긴다. 삭제를 취소한 경우에는
    // sheets 가 그대로라 이 이펙트가 돌지 않으므로 선택도 움직이지 않는다.
    if (!sheets.some((p) => p.id === selectedId)) setSelectedId(sheets[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets]);

  const 고른것 = sheets.find((p) => p.id === selectedId) ?? null;
  /*
   * 필수 축이 비면 실행계획이 검증에서 떨어진다(킷의 통과 조건). 그 응답으로는
   * 무엇이 빠졌는지 사용자에게 말해 줄 수 없어서, 보내기 전에 여기서 막는다.
   * 장소 안내와 같은 판단이다 — 막을 때 무엇을 하면 되는지 같이 말한다.
   */
  const 빠진필수 = 고른것 ? 못채운필수축(고른것.place, 고른것.selections) : [];
  const 주문가능 = 고른것 !== null && 백엔드가아는장소(고른것) && 빠진필수.length === 0;

  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0" style={{ padding: `20px ${GAP.screenX}px 20px` }}>
        <AppLogo size={26} />
        <span aria-hidden="true" style={{ ...KICKER, color: TEXT_2, marginTop: 20, display: "block" }}>saved orders</span>
        <div className="flex items-end justify-between" style={{ gap: 12 }}>
          <h1 style={{ ...TYPE.display, color: TEXT_1, marginTop: 2, flex: 1 }}>어떤 주문표로<br />주문할까요?</h1>
          <span aria-hidden="true" style={{ flexShrink: 0, marginBottom: 4 }}><ReceiptSpot /></span>
        </div>
        <Rule style={{ marginTop: 18 }} />
      </div>

      <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0, paddingLeft: GAP.screenX, paddingRight: GAP.screenX }}>
        {sheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Pictogram name="squaresFour" size={56} color={TEXT_3} />
            <p style={{ ...TYPE.bodyBold, color: TEXT_1, marginTop: 20 }}>저장된 주문표가 없어요</p>
            <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 6 }}>새 주문표를 추가해보세요</p>
          </div>
        ) : (
          /*
           * role="radiogroup" 을 쓰지 않고 fieldset 을 쓴다.
           * radiogroup 은 라디오만 품는 게 원칙인데 여기에는 카드마다 삭제 버튼이 같이 있다.
           * fieldset/legend 는 브라우저가 원래 갖고 있는 묶음이라 버튼이 섞여 있어도 괜찮고,
           * 같은 name 을 가진 라디오끼리 화살표 키로 옮겨 다니는 것도 그대로 동작한다.
           */
          <fieldset style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }}>
            <legend style={SR_ONLY}>저장된 주문표 목록</legend>
            {sheets.map((sheet) => (
              <OrderSheetCard
                key={sheet.id}
                sheet={sheet}
                selected={selectedId === sheet.id}
                onSelect={() => setSelectedId(sheet.id)}
                // 선택을 여기서 옮기지 않는다. onDeleteSheet 은 이제 확인창만
                // 열고 아직 지우지 않는데, 여기서 옮기면 대답도 하기 전에 선택이
                // 움직이고 '그대로 두기' 를 눌러도 돌아오지 않는다.
                // 실제로 지워진 뒤의 선택 이동은 아래 useEffect 가 맡는다.
                onDelete={() => onDeleteSheet(sheet.id)}
                onEdit={() => onEditSheet(sheet)}
              />
            ))}
          </fieldset>
        )}
      </div>

      <StickyFooter>
        {/*
          가격 한도는 여기서 안 묻는다. 주문표를 만들 때 조건과 같이 정하고,
          만들어 둔 주문표만 있는 사람은 도움 설정에서 고친다.
        */}
        {/*
          아직 연결되지 않은 장소는 주문으로 보내지 않는다.
          
          지금 백엔드가 다루는 것은 닭강정집뿐이다. 카페 주문표로 주문하면
          "매장컵"·"테이크아웃" 을 이용방식 표에서 못 찾아 serviceType 이
          UNKNOWN 이 되고, 음료·온도·사이즈·시럽은 축 자체가 없어 전부
          NO_PREFERENCE 가 된다. 킷 스키마가 UNKNOWN 을 허용하는 enum 이라
          **검증은 통과하고 닭강정이 추천된다.**
          
          게다가 확인표() 는 UNKNOWN·NO_PREFERENCE 축을 건너뛰므로 확인 카드가
          텅 빈 채로 승인 화면이 뜬다. 무엇을 담는지 못 보고 승인하게 된다.
          
          막을 때 이유를 말한다. 버튼만 잠그면 왜 안 되는지 알 수 없다.
        */}
        {showOrder && 고른것 && !백엔드가아는장소(고른것) && (
          <div style={{ marginBottom: 4 }} role="status">
            {/*
              장소를 안 고른 주문표와 아직 안 붙은 장소를 나눠 말한다.

              예전에는 둘 다 "이 장소는 아직 키오스크와 연결되지 않았어요" 였다.
              장소를 고른 적이 없는 사람에게 '이 장소' 가 무엇인지 알 길이 없고,
              무엇을 하면 주문할 수 있는지도 안 알려 준다.
            */}
            <InfoBox>
              {고른것.place === null
                ? "장소를 아직 안 고르셨어요. 주문표를 열어 장소를 고르시면 주문할 수 있어요."
                : `${고른것.place}는 아직 키오스크와 연결되지 않았어요. 지금은 음식점 주문표로만 주문할 수 있어요.`}
            </InfoBox>
          </div>
        )}
        {/*
          장소는 맞는데 필수 축이 빈 경우.

          키오스크가 반드시 골라야 하는 축이라(킷의 option-groups.json 의 required)
          비어 있으면 실행계획이 검증에서 떨어진다. 그 응답에는 code 도 message 도
          없어서 "왜 안 됐는지" 를 사용자에게 말해 줄 수 없다. 여기서 이름을 대고
          막는다 — 무엇을 고르면 되는지 알아야 고칠 수 있다.
        */}
        {showOrder && 고른것 && 백엔드가아는장소(고른것) && 빠진필수.length > 0 && (
          <div style={{ marginBottom: 4 }} role="status">
            <InfoBox>
              {tf("아직 안 고르신 것이 있어요 — {빠진것}. 주문표를 열어 고르시면 주문할 수 있어요.", {
                빠진것: 빠진필수.map(t).join(", "),
              })}
            </InfoBox>
          </div>
        )}
        {showOrder && (
          <PrimaryBtn
            onClick={() => {
              const picked = sheets.find((p) => p.id === selectedId);
              if (picked) onOrder(picked);
            }}
            disabled={!selectedId || !주문가능}
          >
            이 주문표로 주문하기
          </PrimaryBtn>
        )}
        <OutlineBtn onClick={onAddSheet}>
          + 새 주문표 추가
        </OutlineBtn>
        {/* 말로 만드는 길. 터치 화면에 음성 카드를 끼우지 않고 문에서 가른다. */}
        {소리로주고받나() && (
          <OutlineBtn onClick={onAddVoiceSheet}>말로 주문표 만들기</OutlineBtn>
        )}
      </StickyFooter>
    </div>
  );
}

export function BottomNav({ tab, onChange }: { tab: MainTab; onChange: (t: MainTab) => void }) {
  const items: { id: MainTab; icon: React.ReactNode; label: string }[] = [
    { id: "qr", icon: <Pictogram name="qrCode" size={25} />, label: "QR 찍기" },
    { id: "menu", icon: <Pictogram name="notePencil" size={25} />, label: "내 주문표" },
    { id: "account", icon: <Pictogram name="userCircle" size={25} />, label: "계정" },
  ];
  return (
    /* 화면마다 끝에 "QR 찍기 내 주문표 계정" 이 붙어 읽혔다. 늘 같은 자리에
       있는 것이라, 새 화면에 왔다는 소식에 끼워 읽을 값어치가 없다. */
    <nav data-소리생략 aria-label="주요 메뉴" className="shrink-0 flex" style={{ borderTop: `1px solid ${BORDER}`, backgroundColor: PAPER, paddingBottom: 12 }}>
      {items.map(({ id, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center"
            style={{ border: "none", backgroundColor: "transparent", cursor: "pointer", minHeight: 56, padding: "14px 0 6px" }}
          >
            {/*
              아이콘을 빼고 글자만 남겼다. 셋뿐인 탭이라 그림이 없어도 무엇인지
              알 수 있고, 그림.글자.색 셋으로 알리던 것을 글자 하나로 줄이면
              화면이 조용해진다. 대신 지금 탭에는 밑줄을 그어 색 말고도 표시가
              남게 한다 - 색을 못 보는 경우에도 어디에 있는지 알아야 한다.

              안 눌린 탭도 읽을 수 있어야 해서 TEXT_2 를 쓴다(TEXT_3 는 1.74:1).
            */}
            <span style={{
              fontSize: 15, fontWeight: active ? 800 : 500, letterSpacing: "-0.02em",
              color: active ? TEXT_1 : TEXT_2, fontFamily: FONT,
              borderBottom: active ? `2px solid ${RULE}` : "2px solid transparent",
              paddingBottom: 4,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
