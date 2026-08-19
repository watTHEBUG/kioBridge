import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { Pictogram } from "@/design/Pictogram";
import { BORDER, BTN_H, CANVAS, FAIL, FONT, GAP, KICKER, ON_DARK, PAPER, RADIUS, RULE, SERIF, SURFACE, TEXT_1, TEXT_2, TEXT_BTN, TEXT_CHIP, TYPE, WARN, WARN_BG, TOGGLE_OFF } from "@/design/tokens";
import { tf } from "@/i18n/t";

// 워드마크는 세리프로. 정체(kio)와 이탤릭(bridge)을 섞어 에디토리얼 인상을 만든다.
export function AppLogo({ light = false, size = 34 }: { light?: boolean; size?: number }) {
  // light 는 사진.카메라처럼 늘 어두운 판 위에 얹을 때 쓴다. 팔레트를 따라가면
  // 다크에서 검은 판에 검은 글자가 된다. 여기는 뒤집지 않는다.
  const color = light ? ON_DARK : TEXT_1;
  return (
    <div
      /* 화면마다 "kio bridge" 를 다시 듣지 않는다. 눈으로는 어디에 왔는지 알려
         주는 표시지만, 귀로는 매번 같은 말이라 알려 주는 것이 없다. */
      data-소리생략
      aria-label="키오브릿지"
      style={{
        fontFamily: SERIF, fontSize: size, lineHeight: 1, color,
        letterSpacing: "-0.02em", display: "inline-flex", alignItems: "baseline",
        ...(light ? { textShadow: "0 2px 12px rgba(0,0,0,0.5)" } : {}),
      }}
    >
      <span>kio</span>
      <span style={{ fontStyle: "italic" }}>bridge</span>
    </div>
  );
}

// 레퍼런스에는 진행 막대가 없다. 점 형태로 최소화해 상단 여백을 비워 둔다.
//
// 전체 3단계다 — 회원가입 → 호칭 → 도움 설정. 그다음의 '환영합니다' 는 세지 않는다.
// 읽고 넘어가는 화면이지 채울 것이 없어서, 단계로 세면 아직 할 일이 남은 것처럼 보인다.
//
// 예전에는 두 단계였다(가입 · 호칭). 도움 설정을 계정 화면에서 이 흐름으로 끌어오면서
// 하나 늘었다. 기본값만 고치고 넘어가면 화면마다 "3단계 중 2단계" 처럼 실제와 어긋난
// 값이 남으므로 부르는 쪽에서 전부 명시한다.

export function ProgressBar({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="flex justify-center gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total} aria-label={tf("전체 {전체}단계 중 {지금}단계", { 전체: total, 지금: step })}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{ width: i < step ? 16 : 5, height: 5, borderRadius: 100, backgroundColor: i < step ? RULE : BORDER, transition: "all 0.4s" }}
        />
      ))}
    </div>
  );
}

/**
 * 개인정보 수집·이용 동의 칸.
 *
 * 이 앱은 실제 이름·전화번호를 안 받는다. 그래도 묻는 이유는 **고른 조건도 그 사람에
 * 대한 정보**여서다 — 맵기·형태·알레르기·가격 한도·안내 언어가 모이면 그 사람이
 * 무엇을 못 먹고 무엇이 불편한지가 드러난다. 이름이 없다는 것이 정보가 아니라는
 * 뜻은 아니다.
 *
 * 무엇에 동의하는지 읽을 길을 같이 둔다. 읽을 수 없는 동의는 동의가 아니다.
 * '자세히' 는 개인정보 안내 화면을 연다.
 *
 * checkbox 를 그대로 쓴다. 직접 만든 네모보다 브라우저 것이 스크린리더.키보드에서
 * 확실하고, 이 화면은 못 들어가면 아무것도 못 하는 자리라 확실한 편이 낫다.
 */
/**
 * 동의 없이도 볼 수 있는 화면.
 *
 * 앞의 셋은 들어오는 문이고, privacy 는 무엇에 동의하는지 읽는 곳이다.
 * 읽을 수 없는 동의는 동의가 아니라서 그 길은 열어 둔다.
 */

export function ConsentCheck({ 동의함, on바꾸기, onDetail }: {
  동의함: boolean;
  on바꾸기: (v: boolean) => void;
  onDetail: () => void;
}) {
  const id = "consent-check";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, textAlign: "left" }}>
      {/*
        네모 자체는 22px 라도 누르는 자리는 44px 이어야 한다(이 앱의 터치 기준).
        label 이 네모를 품고 있어서 이 줄 어디를 눌러도 켜지고 꺼진다 — 손이
        떨리는 분에게 22px 과녁을 맞히라고 하면 그게 가장 어려운 동작이다.
      */}
      <label
        htmlFor={id}
        style={{
          flex: 1, minHeight: 44, display: "flex", alignItems: "center", gap: 10,
          padding: "6px 0", cursor: "pointer",
        }}
      >
        {/*
          aria-hidden 을 붙이면 안 된다. 이 안에 포커스가 가는 체크박스가 있어서,
          키보드로는 닿는데 스크린리더는 역할도 켜짐 여부도 못 읽는 자리가 된다.
          자리만 넓히는 껍데기지만 안에 든 것이 조작하는 물건이라 숨기지 않는다.
        */}
        <span
          style={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <input
            id={id}
            type="checkbox"
            checked={동의함}
            onChange={(e) => on바꾸기(e.target.checked)}
            style={{ width: 24, height: 24, accentColor: RULE, cursor: "pointer" }}
          />
        </span>
        {/*
          한 줄로 줄였다. 무엇을 모으는지는 옆의 '자세히' 가 여는 개인정보 화면이
          말한다 — 체크 옆에 두 줄을 붙여 두면 읽지 않고 넘기게 되고, 정작 자세한
          설명은 그 화면에 또 있다.

          예전에는 "개인정보 수집 동의서" 였다. 그런데 이 앱은 실제 개인정보를
          **받지 않는다** — 이름·전화번호·주소는 묻지도 저장하지도 않고, 적으려
          하면 막는다(account.ts 의 개인정보같은글). 모으는 것은 메뉴 조건과
          도움 설정뿐이다.

          안 받는 것을 받는다고 적어 두면 사용자는 실제보다 더 많이 내주는 줄
          알고 동의한다. 겁먹고 그만두는 사람도 생긴다. 하는 일을 그대로 적는다.
        */}
        <span style={{ fontSize: 14, color: TEXT_1, lineHeight: 1.6, flex: 1 }}>
          서비스 이용 및 주문표 저장 안내를 확인했어요
        </span>
      </label>
      <button
        type="button"
        onClick={onDetail}
        style={{
          flexShrink: 0, minHeight: 44, padding: "0 4px", background: "transparent", border: "none",
          color: TEXT_2, fontSize: 13, fontWeight: 700, textDecoration: "underline",
          fontFamily: FONT, cursor: "pointer",
        }}
      >
        자세히
      </button>
    </div>
  );
}

/**
 * 뒤로 가기.
 *
 * `disabled` 는 되돌아가면 안 되는 짧은 동안에 쓴다 — 서버에 승인을 보내 놓고
 * 답을 기다리는 사이 같은 자리다. 그때 나가면 요청은 이미 갔는데 화면만 없어져,
 * 담긴 것을 사용자가 못 본다.
 */
export function BackButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label="뒤로 가기"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="flex items-center justify-center"
      style={{ width: 44, height: 44, marginLeft: -10, backgroundColor: "transparent", cursor: disabled ? "default" : "pointer", border: "none", opacity: disabled ? 0.4 : 1 }}
    >
      <span
        aria-hidden="true"
        style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: SURFACE, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <ChevronLeft size={20} strokeWidth={2.2} style={{ color: TEXT_1 }} />
      </span>
    </button>
  );
}

// 화면 가운데에 세우는 헤드라인. 왼쪽 정렬 머리(SubScreenHeader)와 달리
// 문장 하나가 화면의 주인공인 자리에 쓴다.

export function CenterHeadline({ title, desc, kicker, spot }: {
  title: React.ReactNode; desc?: React.ReactNode; kicker?: string; spot?: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      {spot && <div aria-hidden="true" className="flex justify-center" style={{ marginBottom: 8 }}>{spot}</div>}
      {kicker && <span aria-hidden="true" style={{ ...KICKER, color: TEXT_2, display: "block", marginBottom: 2 }}>{kicker}</span>}
      <h1 style={{ ...TYPE.display, color: TEXT_1 }}>{title}</h1>
      {desc && <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 10 }}>{desc}</p>}
    </div>
  );
}

export function PrimaryBtn({
  children, onClick, disabled = false, style: extraStyle,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", height: BTN_H, borderRadius: RADIUS.button,
        fontSize: 17, fontWeight: 700, fontFamily: FONT, letterSpacing: "-0.02em",
        // 종이색 바탕에서는 초록 알약이 색을 하나 더 늘린 것처럼 보인다. 검정은
        // 글자와 같은 색이라 화면이 조용해지고, 누를 곳이 대비만으로 읽힌다.
        // 초록은 성공.연결 표시 한 곳에만 남긴다.
        backgroundColor: disabled ? SURFACE : RULE,
        // 비활성 컨트롤은 WCAG 대비 규정에서 빠져 있다. 그래도 여기서는 고친다.
        // 아직 못 누르는 버튼의 글자가 "다 채우면 무슨 일이 일어나는지"를 알려 주는 유일한 문장이라
        // 1.62:1(#C4C4C8)로 지워 놓으면 무엇을 기다리는지 알 수 없다.
        // 초록 알약이 회색 알약으로 바뀌는 것만으로 못 누른다는 신호는 충분하다.
        color: disabled ? TEXT_2 : PAPER,
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.15s",
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

export function OutlineBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", height: BTN_H, borderRadius: RADIUS.button,
        fontSize: 17, fontWeight: 700, fontFamily: FONT, letterSpacing: "-0.02em",
        backgroundColor: SURFACE,
        color: TEXT_BTN,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function StickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="shrink-0 flex flex-col gap-2"
      style={{
        backgroundColor: PAPER, padding: `12px ${GAP.screenX}px 24px`,
        /*
         * 바닥은 **틀보다 커질 수 없다.**
         *
         * shrink-0 이라 안 줄어드는데, 큰 글씨를 켜면 여기 든 안내문이 여러 줄로
         * 늘어난다. 주문표 화면에서는 바닥만 864px 이 되어 틀(715)을 넘었고,
         * 가운데가 19px 까지 눌린 채 저장·시작 단추가 화면 밖으로 밀려 나갔다 —
         * 다 채워 놓고 저장할 방법이 없었다.
         *
         * 큰 글씨는 글씨를 키워 달라는 뜻이지 단추를 감춰 달라는 뜻이 아니다.
         * 넘치면 이 안에서 굴러가게 해서, 안내문이 길어져도 단추에 늘 닿는다.
         */
        maxHeight: "70%", overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}

export function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        minHeight: 44, padding: "10px 18px", borderRadius: RADIUS.pill,
        fontSize: 15, fontWeight: 700, fontFamily: FONT, letterSpacing: "-0.01em",
        // 고른 칩은 검은 알약. 초록은 화면당 한 곳(연결.성공)에만 남긴다.
        backgroundColor: selected ? RULE : CANVAS,
        color: selected ? PAPER : TEXT_CHIP,
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

/**
 * 칸 위의 제목.
 *
 * `칸id` 를 주면 `<label>` 이 되어 그 칸에 묶인다. **글자를 눌러도 커서가 칸으로
 * 간다** — 손이 떨리는 분에게는 누를 수 있는 자리가 두 배가 되는 일이다.
 *
 * 묶기 전에는 보이는 글자("메뉴 이름")와 읽히는 글자(`aria-label="메뉴 이름 (필수)"`)를
 * 따로 적어 두었다. 한쪽만 고치는 날이 오면 눈으로 보는 사람과 귀로 듣는 사람이
 * 다른 말을 받는다. 묶으면 하나가 되어 그 위험이 사라진다.
 *
 * 옆의 '필수/선택' 도 label 안에 둔다. 읽으면 "메뉴 이름 필수" 가 되어, 눈으로
 * 보는 것과 같은 것을 듣는다.
 */

export function SectionLabel({ text, required, 칸id }: { text: string; required?: boolean; 칸id?: string }) {
  const 속 = (
    <>
      <span style={{ ...TYPE.label, color: TEXT_1 }}>{text}</span>
      <span style={{ fontSize: 12, fontWeight: 400, color: TEXT_2 }}>{required ? "필수" : "선택"}</span>
    </>
  );
  const 꾸밈 = "flex items-baseline gap-2 mb-3";
  return 칸id
    ? <label htmlFor={칸id} className={꾸밈} style={{ cursor: "pointer" }}>{속}</label>
    : <div className={꾸밈}>{속}</div>;
}

/**
 * 되돌릴 수 없는 동작 앞에서만 띄운다.
 * 장소를 바꾸는 것처럼 되돌릴 수 있는 일에는 쓰지 않는다 — 매번 물으면
 * 사람은 읽지 않고 누르게 되고, 정작 위험할 때도 그냥 누른다.
 * 지금 이걸 쓰는 곳은 주문표 삭제와 '이 기기에서 정보 지우기' 둘뿐이다.
 */
export function ConfirmSheet({ title, body, confirmLabel, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const 이전포커스 = useRef<HTMLElement | null>(null);
  /*
   * 포커스를 열 때 저장했다가 닫을 때 되돌리는 일만 한다 — 마운트·언마운트
   * 한 번씩이라 의존성 배열을 비워 둔다.
   *
   * 전에는 여기에 onCancel 을 의존성으로 넣고 Escape 도 같이 처리했다. 둘 다
   * 문제였다.
   *
   *   ① Escape 가 두 번 처리됐다. 아래 포커스가두기 가 이미 onKeyDown 에서
   *      처리하는데 여기서 window 에도 달아서, 포커스가 시트 안에 있으면 한 번
   *      누른 Escape 로 onCancel 이 두 번 불렸다.
   *
   *   ② 포커스가 튀었다. onCancel 은 부모가 매 렌더마다 새로 만드는 인라인
   *      함수라, 시트가 열려 있는 동안 부모가 리렌더되면 이 effect 가 정리됐다가
   *      다시 걸렸고 그때마다 ref.current?.focus() 가 다시 돌았다.
   *
   * 닫은 뒤 포커스를 되돌리는 것도 빠져 있었다 — 시트가 사라지면 포커스가
   * <body> 로 떨어져서, 키보드로 쓰는 사람은 처음부터 Tab 을 다시 눌러야 했다.
   *
   * 순살제안시트(screens/Sheet.tsx)가 같은 이유로 이미 이 모양이다.
   */
  useEffect(() => {
    이전포커스.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => {
      if (이전포커스.current?.isConnected) 이전포커스.current.focus();
    };
  }, []);
  // aria-modal="true" 는 "뒤는 없는 셈 치라" 는 선언이다. 선언만 하고
  // Tab 이 뒤 화면으로 나가면 그 말이 사실이 아니게 된다.
  // 되돌릴 수 없는 동작을 지키는 자리라 더 그렇다.
  const 가두기 = 포커스가두기(ref, onCancel);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div
        ref={ref}
        tabIndex={-1}
        onKeyDown={가두기}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        style={{ backgroundColor: PAPER, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: `28px ${GAP.screenX}px 24px`, outline: "none" }}
      >
        <h2 id="confirm-title" style={{ ...TYPE.title, color: TEXT_1, margin: 0 }}>{title}</h2>
        <p id="confirm-body" style={{ ...TYPE.body, color: TEXT_2, marginTop: 10 }}>{body}</p>
        <div style={{ marginTop: 24 }}>
          {/* 지우는 쪽을 기본으로 두지 않는다. 취소가 더 누르기 쉬운 자리에 있어야 한다. */}
          <button
            type="button"
            onClick={onConfirm}
            style={{ width: "100%", minHeight: 52, borderRadius: RADIUS.button, backgroundColor: FAIL, color: PAPER, border: "none", cursor: "pointer", ...TYPE.bodyBold, fontFamily: FONT }}
          >
            {confirmLabel}
          </button>
          <div style={{ height: 10 }} />
          <OutlineBtn onClick={onCancel}>그대로 두기</OutlineBtn>
        </div>
      </div>
    </div>
  );
}

/**
 * 형태(뼈/순살) 제안이 필요할 수 있는 접근성 신호 전부.
 *
 * 이름을 손불편신호있나 로 뒀던 적이 있는데 틀린 이름이었다 — visualGuidance·
 * largeText·highContrast 는 손이 아니라 **시각** 신호다. 이 함수는 서로 다른
 * 두 경로를 하나로 묶는다.
 *
 *   시각 경로   안 보여서 뼈를 발라내기 어렵다   (visualGuidance·largeText·highContrast)
 *   손 경로     손이 뜻대로 안 움직여서 어렵다     (mobilitySupport·SWITCH·ASSISTED)
 *
 * 두 경로 다 "뼈 바르기가 허들이 될 수 있다" 는 같은 결론으로 이어지길래
 * 하나의 판정 함수로 묶었다 — 이름은 그 결론(순살 제안 여부)을 가리키게
 * 짓는다.
 *
 * 처음엔 시각 신호만 봤다 — 그때는 이 앱이 손 관련 신호를 아예 안 받고
 * 있었다("일단 시각 관련해서만 판단" 결정).
 *
 * ── SWITCH·ASSISTED·mobilitySupport 를 넣는 게 비약 아니냐는 지적에 대해 ─────
 *
 * 맞는 말이다 — SWITCH·ASSISTED 는 "키오스크 버튼을 어떻게 누르는가"(입력
 * 방식)이고, mobilitySupport 도 이 코드베이스에서 실제로 하는 일은 "시간 여유
 * 를 준다"(자동 만료 화면 전환을 안 함)이다. 셋 다 "뼈를 손으로 바르기 힘든가"
 * 를 직접 말하는 값이 아니다. 이 앱에는 그 질문을 문자 그대로 묻는 칸이 없다 —
 * 그래서 이미 받고 있는 신호 중 손 움직임에 가장 가까운 것들을 대신 쓴다
 * (mobilitySupport 는 정의 자체에 "손 조작이 힘들다" 가 들어 있고, SWITCH·
 * ASSISTED 는 스위치·대리 조작이 필요할 만큼 손 조작이 정교하지 않다는 뜻이다).
 *
 * 이 비약이 위험하지 않은 이유는 따로 있다 — 이 함수가 참이어도 형태를
 * **바로 채우지 않는다.** 순살제안시트를 띄워 "네/상관없어요" 로 사용자에게
 * 직접 물어보고, 그 답만 싣는다(아래 순살제안시트 주석). 신호가 잘못 켜져
 * 있어도 최악의 경우는 안 맞는 질문 하나가 떴다가 한 번 눌러 넘기는 것뿐이다
 * — 사용자가 고른 적 없는 값이 조용히 채워지는 일은 없다.
 */

/**
 * 모달 안에 Tab 을 가둔다. aria-modal 을 선언한 곳은 전부 이걸 쓴다.
 * 선언만 하고 안 지키면 스크린리더에게 거짓말을 하는 셈이다.
 *
 * Escape 도 여기 한 곳에서만 처리한다. 부르는 쪽에서 창을 여는 effect 안에
 * 따로 window keydown 리스너를 또 달면, 같은 Escape 를 두 곳이 처리하려 들거나
 * 그 effect 의 의존성 배열에 onClose 가 끼어 부모가 리렌더될 때마다 리스너가
 * 갈아 끼워진다(coderabbitai 리뷰).
 */
export function 포커스가두기(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab") return;
    const 대상 = ref.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    if (!대상 || 대상.length === 0) return;
    const 처음 = 대상[0];
    const 마지막 = 대상[대상.length - 1];
    /*
     * 열리자마자 포커스는 컨테이너 자신(tabIndex=-1)에 가 있다 — 제목·설명을
     * 먼저 읽게 하려는 것이다(순살제안시트 등). 그런데 컨테이너는 원래 탭
     * 순서 밖이라, 이 상태에서 Shift+Tab 을 누르면 "처음이 아니니" 이 함수가
     * 아무 것도 안 하고, 브라우저가 배경(겹 밖)의 이전 요소로 포커스를 새어
     * 보낸다(coderabbitai 리뷰). 컨테이너에 있을 때는 '처음' 취급해 준다 —
     * Shift+Tab 이면 마지막으로 감싸고, 그냥 Tab 이면 원래도 다음(처음 버튼)
     * 으로 자연스럽게 가므로 손댈 것이 없다.
     */
    const 지금 = document.activeElement === ref.current ? 처음 : document.activeElement;
    if (e.shiftKey && 지금 === 처음) { e.preventDefault(); 마지막.focus(); }
    else if (!e.shiftKey && 지금 === 마지막) { e.preventDefault(); 처음.focus(); }
  };
}

/**
 * 사용자가 직접 짚었다는 표시를 받는 한 줄.
 * 고르는 자리가 아니라 확인하는 자리라 카드가 아니라 체크로 둔다.
 */

/**
 * 체크 한 줄.
 *
 * `disabled` 는 이 표시를 더 바꾸면 안 되는 동안에 쓴다 — 이 체크가 승인의
 * 조건인데 승인 요청이 이미 나가 있는 자리다. 그때 풀면 화면은 '안 짚었다' 인데
 * 서버로는 짚은 것으로 갔다.
 */
export function CheckRow({ checked, onToggle, label, disabled = false }: {
  checked: boolean; onToggle: () => void; label: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 44, border: "none", backgroundColor: "transparent", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, fontFamily: FONT, padding: 0, textAlign: "left" }}
    >
      <div aria-hidden="true" style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: checked ? "none" : `1.5px solid ${TEXT_2}`,
        backgroundColor: checked ? RULE : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}>
        {checked && <Check size={12} strokeWidth={3} color={PAPER} />}
      </div>
      <span style={{ ...TYPE.caption, fontWeight: 600, color: TEXT_1 }}>{label}</span>
    </button>
  );
}

// 회전은 CSS 로 돌린다. SVG SMIL(<animateTransform>)로 만들면
// prefers-reduced-motion 이 멈추지 못한다. SMIL 은 CSS 규칙의 대상이 아니라
// 축소 블록의 animation-duration·iteration-count 가 닿지 않는다.
// 어지럼을 느끼는 분에게 이 원은 계속 돌았다. 키프레임은 tokens.ts 에 한 번만 둔다.
export const SPIN = (cx: number, cy: number) => ({
  transformBox: "view-box" as const,
  transformOrigin: `${cx}px ${cy}px`,
  animation: "kb-spin 0.9s linear infinite",
});

export function SpinnerIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="27" stroke={BORDER} strokeWidth="4" />
      <path d="M32 5 A27 27 0 0 1 59 32" stroke={TEXT_1} strokeWidth="4" strokeLinecap="round" style={SPIN(32, 32)} />
    </svg>
  );
}

// 상태 화면 공통 골격 — 가운데 정렬 표식 + 제목 + 설명. 색이 아니라 배치로 위계를 만든다.
/**
 * 상태 화면의 머리.
 *
 * kicker 는 이탤릭 영문 한 줄이다. 뜻은 담지 않는다 - 읽어야 할 말은 전부 아래
 * 한글 제목에 있고, 영어를 못 읽어도 잃는 정보가 없다. aria-hidden 으로 두어
 * 스크린리더가 읽지 않는다.
 */

export function StatusHero({ mark, kicker, title, desc }: {
  mark: React.ReactNode; kicker?: string; title: React.ReactNode; desc?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div aria-hidden="true" className="flex items-center justify-center" style={{ height: 72 }}>{mark}</div>
      {kicker && <span aria-hidden="true" style={{ ...KICKER, color: TEXT_2, marginTop: 18, display: "block" }}>{kicker}</span>}
      <h2 style={{ ...TYPE.display, color: TEXT_1, marginTop: kicker ? 4 : 20 }}>{title}</h2>
      {desc && <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 10 }}>{desc}</p>}
    </div>
  );
}

/**
 * 제목 오른쪽에 놓는 선 드로잉 한 점.
 *
 * 스트로크 5.5px, round cap, 배경 없음. 장식이라 aria-hidden 이고,
 * 이 그림이 없어도 화면의 뜻은 그대로다 - 뜻은 제목이 지고 있다.
 */

export function GlassesSpot({ size = 76 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 152 76" fill="none" aria-hidden="true">
      <g stroke={TEXT_1} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="40" cy="44" rx="27" ry="22" />
        <ellipse cx="112" cy="44" rx="27" ry="22" />
        <path d="M67 40c5-4 13-4 18 0" />
        <path d="M13 40C13 20 24 12 34 12" />
        <path d="M139 40c0-20-11-28-21-28" />
      </g>
    </svg>
  );
}

/** 주문표 화면 — 영수증. */

export function ReceiptSpot({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <g stroke={TEXT_1} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 12h52v76l-10-7-9 7-9-7-9 7-9-7-6 4z" />
        <path d="M38 36h24M38 52h24M38 66h14" />
      </g>
    </svg>
  );
}

/** 개인정보 화면 — 자물쇠. */

export function LockSpot({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <g stroke={TEXT_1} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="22" y="44" width="56" height="44" rx="8" />
        <path d="M34 44V32a16 16 0 0 1 32 0v12" />
        <path d="M50 60v12" />
      </g>
    </svg>
  );
}


/** 섹션 머리의 굵은 줄. 이 디자인에서 화면을 자르는 유일한 선이다. */

export function Rule({ style }: { style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={{ height: 2, backgroundColor: RULE, ...style }} />;
}

export function InfoBox({ children, variant = "warn" }: { children: React.ReactNode; variant?: "warn" | "info" }) {
  const warn = variant === "warn";
  const bg = warn ? WARN_BG : SURFACE;
  const fg = warn ? WARN : TEXT_1;
  const icon = warn
    ? <Pictogram name="warning" size={19} color={WARN} />
    : <Pictogram name="magnifyingGlass" size={19} color={TEXT_1} />;

  return (
    <div style={{ borderRadius: RADIUS.input, padding: "14px 16px", backgroundColor: bg, border: "none", display: "flex", gap: 11, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, marginTop: 2, display: "flex" }}>{icon}</span>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: fg }}>{children}</p>
    </div>
  );
}

// 후보 선택 카드 — 선택되면 카드 전체가 검게 반전된다. 테두리로 상태를 표시하지 않는다.
/**
 * role="radio" 를 흉내 낸 button 이었다. 스크린리더는 "라디오, 3개 중 1번째" 라고
 * 읽어 주는데 사용자가 화살표를 누르면 아무 일도 일어나지 않았다. roving tabindex 도
 * 키 핸들러도 없었기 때문이다.
 *
 * 흉내 내는 대신 진짜 <input type="radio"> 를 쓴다. 화살표 이동·그룹 안 단일 포커스가
 * 브라우저 기본으로 동작하고, 우리가 유지할 코드도 줄어든다.
 * 주문표 목록(SavedSheetsScreen)이 같은 이유로 이미 이렇게 되어 있다.
 *
 * 예전에는 role="button" 분기도 있었다. low_confidence 에서 '이게 맞아요' 를
 * 짚는 자리였는데, 확인 카드와 같은 메뉴를 카드 모양으로 두 번 그리게 되어
 * CheckRow 로 옮겼다. 이제 이 컴포넌트는 라디오 하나만 한다.
 *
 * groupName 은 필수다. 기본값을 두면 화면에 라디오 그룹이 둘 이상일 때
 * 서로 다른 질문의 선택지가 조용히 한 그룹으로 묶인다.
 */

/**
 * 알약 모양으로 하나 고르는 칩. **진짜 라디오다.**
 *
 * 여러 자리에서 `<button role="radio">` 로 흉내 내고 있었다. 스크린리더는
 * "라디오, 3개 중 1번째" 라고 읽어 주는데, 사용자가 화살표를 눌러도 아무 일이
 * 없었다 — roving tabindex 도 키 핸들러도 없었기 때문이다. 읽어 주는 말과
 * 실제로 되는 일이 달랐다.
 *
 * 흉내 내는 대신 `<input type="radio">` 를 숨겨 두고 라벨을 씌운다. 화살표
 * 이동과 그룹 안 단일 포커스가 브라우저 기본으로 동작하고, 우리가 유지할
 * 코드도 줄어든다. OptionCard 와 주문표 목록이 같은 이유로 이미 이렇게 되어
 * 있고, 이 조각은 그 방식을 알약 칩에도 쓰려고 뽑아낸 것이다.
 *
 * 이름(name)은 필수다. 기본값을 두면 한 화면에 그룹이 둘 이상일 때 서로 다른
 * 질문의 선택지가 조용히 한 그룹으로 묶인다.
 */
export function RadioChip({
  name, label, 골랐나, onPick, lang,
}: {
  name: string;
  label: string;
  골랐나: boolean;
  onPick: () => void;
  /** 그 언어로 적힌 이름이면 함께 준다 — 읽어 주는 목소리가 언어를 따라간다. */
  lang?: string;
}) {
  const [포커스, set포커스] = useState(false);
  return (
    <label
      lang={lang}
      /*
       * lang 을 준 칩은 **그 언어로 적힌 이름**이므로 옮기지 않는다.
       *
       * "한국어" 를 영어로 옮기면 Korean 이 되는데, 그 줄을 찾아야 하는 사람은
       * 영어 화면에 잘못 들어와 자기 말로 돌아가려는 사람이라 자기 글자로
       * 적혀 있어야 찾는다. 표에서 빼는 것만으로는 부족하다 — 표에 있는 말을
       * 사용자가 그대로 쓸 수도 있어서, 자리 자체를 표시해 둔다(i18n/apply.ts).
       *
       * lang 이 없는 칩(키오스크 조작 방식 같은 것)은 우리 문구라 그대로 옮긴다.
       */
      data-원문={lang ? "" : undefined}
      style={{
        minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "10px 18px", borderRadius: RADIUS.pill,
        fontSize: 15, fontWeight: 700, fontFamily: FONT, letterSpacing: "-0.01em",
        backgroundColor: 골랐나 ? RULE : CANVAS,
        color: 골랐나 ? PAPER : TEXT_CHIP,
        cursor: "pointer", transition: "background-color 0.15s",
        // 포커스는 숨은 input 이 받지만 표시는 이 라벨이 한다.
        outline: 포커스 ? `3px solid ${RULE}` : "none",
        outlineOffset: 2,
      }}
    >
      <input
        type="radio"
        name={name}
        checked={골랐나}
        onChange={onPick}
        onFocus={() => set포커스(true)}
        onBlur={() => set포커스(false)}
        style={SR_ONLY}
      />
      {label}
    </label>
  );
}

/** 켜고 끄는 줄 하나. 라벨을 눌러도 바뀌도록 button 하나로 감싼다. */
export function ToggleRow({
  label, sub, on, onToggle,
}: {
  label: string;
  /** 없으면 이름만 보여 준다. 첫 화면처럼 이름으로 이미 뜻이 통하는 자리에서 쓴다. */
  sub?: string;
  on: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, padding: "18px 0", textAlign: "left", cursor: "pointer", fontFamily: FONT,
        backgroundColor: "transparent", border: "none",
      }}
    >
      <span>
        <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: TEXT_1, letterSpacing: "-0.02em" }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 13, color: TEXT_2, marginTop: 4 }}>{sub}</span>}
      </span>
      {/* 색만으로 상태를 알리지 않는다 — 켜짐일 때는 체크 표시도 함께 둔다. */}
      <span
        aria-hidden="true"
        style={{
          width: 54, height: 32, borderRadius: 999, flexShrink: 0, position: "relative",
          backgroundColor: on ? RULE : TOGGLE_OFF, transition: "background-color 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute", top: 3, left: on ? 25 : 3, width: 26, height: 26, borderRadius: "50%",
            backgroundColor: PAPER, boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {on && <Check size={14} strokeWidth={3} style={{ color: RULE }} />}
        </span>
      </span>
    </button>
  );
}

/** 도움설정 중 켜고 끄는 칸만. language 는 스위치가 아니라 고르는 값이라 뺀다. */

/**
 * 무엇을 저장하고 무엇을 저장하지 않는지.
 *
 * 약관 문구를 그대로 옮기지 않는다. 이 앱이 실제로 하는 일만 사용자의 말로 적는다.
 */
export const 개인정보항목 = (guest: boolean): { title: string; body: string }[] => {
  const rows: { title: string; body: string }[] = [
    {
      title: "동의는 언제 받나요",
      /*
       * 이 화면은 '자세히' 로 열리는 곳이라, 무엇에 동의하는지가 맨 위에 있어야 한다.
       * 아래로 밀면 동의 칸 옆의 링크를 눌러 놓고 정작 그 내용을 못 읽는다.
       */
      body: "처음 화면에서 한 번 여쭤요. 동의하지 않으시면 앱을 시작할 수 없어요 — 저장해 두신 메뉴 조건으로 골라 드리는 앱이라, 그 조건을 쓰지 못하면 해 드릴 수 있는 일이 없어서예요. 동의는 이번 이용에만 남고, 창을 닫으면 사라져요. 다음에 이 기기를 쓰는 분은 다시 여쭤요.",
    },
    {
      title: "저장하는 것",
      body: guest
        ? "메뉴 주문표에 적어 두신 내용(예: 포장, 매운맛, 순살, 종이컵)만 저장해요. 사람이 읽는 말 그대로예요. 지금은 이 기기 안에만 있어요. 창을 닫아도 이 휴대폰에 남아 있어서, 다음에 오시면 만들어 두신 주문표를 그대로 쓰실 수 있어요. 지우고 싶으시면 계정 화면의 ‘이 기기에서 정보 지우기’를 눌러 주세요."
        // 전부 올라간다고 적으면 사실이 아니다. 장소를 안 고른 주문표는 서버가
        // 받아 주지 않아서(place 가 필수) 이 기기에만 남는다.
        : "메뉴 주문표에 적어 두신 내용(예: 포장, 매운맛, 순살, 종이컵)만 저장해요. 사람이 읽는 말 그대로예요. 로그인하고 계셔서, 장소를 정해 두신 주문표는 서버에도 올라가요 — 다음에 로그인하면 다시 불러오기 위해서예요. 장소를 안 고르신 주문표는 이 기기에만 있어요.",
    },
    {
      title: "저장하지 않는 것",
      body: "실제 이름·주소·전화번호·주민등록번호는 받지도, 저장하지도 않아요. 결제 정보도 다루지 않아요. 부르는 호칭은 화면에 띄우는 데만 쓰고 이 기기 밖으로 나가지 않아요.",
    },
    {
      title: "음성으로 답할 때",
      // 브라우저 내장 인식 대신 서버로 오디오를 보내 인식한다(listen.ts,
      // VoiceTranscriptionService) — 그 이유(브라우저 인식이 일부 기기·언어에서
      // 응답이 아예 없었던 것)도 listen.ts 에 적어 뒀다. 여기서는 실제로 오디오가
      // 우리 서버를 거친다는 것과, 저장하지 않는다는 것을 그대로 적는다.
      body: "\"그만 듣기\"를 누르면 그때까지 녹음한 음성이 저희 서버로 전달되고, 서버가 그 음성을 글로 바꿔 알아들은 결과(예: '네')만 그 자리에서 써서 화면을 바꿔요. 보낸 음성은 인식하는 동안만 쓰고 저장하지 않고, 인식된 문장도 남기지 않아요. 말하기가 불편하시면 언제든 버튼을 눌러 손으로 답하실 수 있어요.",
    },
    {
      title: "로그인은 어떻게 하나요",
      // 예전에는 "새로고침하면 풀립니다" 라고 적혀 있었다. 이제는 안 풀린다 —
      // 문장을 같이 안 고치면 화면이 거짓말을 하게 된다.
      body: "직접 지으신 아이디와 비밀번호만 받아요. 실제 이름이나 전화번호는 묻지 않아요. 비밀번호는 서버에서 알아볼 수 없는 형태로 바꿔 저장하고, 이 앱은 적으신 비밀번호를 어디에도 남기지 않아요. 로그인 상태는 새로고침해도 그대로지만, 이 창을 닫으면 풀립니다.",
    },
    {
      title: "키오스크에 넘기는 것",
      body: "QR로 연결할 때는 이번 주문에만 쓰는 짧은 연결 표만 오가요. 시간이 지나면 저절로 만료돼요.",
    },
    {
      title: "지우는 방법",
      // 서버에 지우기 경로가 아직 없다. 지운다고 적어 두면 그 문장이 거짓이 된다.
      // 주문표만이 아니라 키오스크에 보낸 승인·거절 기록도 서버에 남는다.
      body: guest
        ? "만들어 두신 주문표는 지우실 때까지 이 휴대폰에 남아요. 계정 화면의 ‘이 기기에서 정보 지우기’를 누르시면 바로 사라져요. 이름·도움 설정·알레르기처럼 나머지 적어 두신 것은 창을 닫으면 그때 사라져요. 다만 키오스크에 보낸 주문 기록은 서버에 남아요 — 아직 지우는 길이 없어서요."
        // 둘을 뭉뚱그려 "다 지워져요" 라고 쓰면 그게 거짓말이 된다.
        // 주문표는 지워지고(팀 #79 의 DELETE), 주문 기록은 여전히 남는다.
        : "계정 화면의 ‘이 기기에서 정보 지우기’를 누르면 이 기기에 있는 내용이 모두 사라지고, 서버에 올라간 주문표도 함께 지워요. 서버 쪽이 잘 안 되면 그때 화면으로 알려 드리고 다시 시도하실 수 있어요. 다만 키오스크에 보낸 주문 기록은 서버에 남아요 — 그건 아직 지우는 길이 없어서요.",
    },
  ];
  return rows;
};

/** 같은 내용을 개인정보 화면과 가입 화면 두 곳에서 쓴다. 한쪽만 고치는 날이 없도록 한 곳에 둔다. */

export function PrivacyRows({ guest }: { guest: boolean }) {
  return (
    <>
      {개인정보항목(guest).map(({ title, body }) => (
        <section key={title} style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, padding: "16px 18px", marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_1, letterSpacing: "-0.01em" }}>{title}</h2>
          <p style={{ fontSize: 14, color: TEXT_2, marginTop: 6, lineHeight: 1.65 }}>{body}</p>
        </section>
      ))}
      <p style={{ fontSize: 13, color: TEXT_2, marginTop: 12, lineHeight: 1.7 }}>
        이 앱은 주문을 장바구니에 담는 데까지만 도와드려요. 결제는 키오스크에서 직접 하시면 돼요.
      </p>
    </>
  );
}

/**
 * 눈에는 안 보이지만 포커스와 스크린리더에는 남아 있어야 하는 요소.
 *
 * opacity:0 이나 visibility:hidden 으로 숨기지 않는다. opacity 는 그 요소에 그린
 * 포커스 표시까지 같이 지우고, visibility:hidden 은 포커스를 아예 못 받게 만든다.
 * clip 은 오래된 방법이고 clipPath 가 그 자리를 대신하는 중이라 둘 다 둔다.
 */
export const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0,0,0,0)", clipPath: "inset(50%)",
  whiteSpace: "nowrap", border: 0,
};
