import { useEffect, useRef, useState } from "react";
import { BORDER, CANVAS, FAIL, FONT, GAP, KICKER, PAPER, RADIUS, RULE, SURFACE, TEXT_1, TEXT_2, TEXT_CHIP, TYPE } from "@/design/tokens";
import { type PreferredInputHint, type 도움설정, 언어목록, type 언어코드 } from "@/api/a11y";
import { 그만읽기, 다읽을때까지, 소리를낼수있나 } from "@/api/speech";
import { 들어보기, 들을수있나, type 못들은이유 } from "@/api/listen";
import { 예아니오 } from "@/api/voice";
import { 알레르기목록 } from "@/api/allergy";
import { AllergenId } from "@/api/canonical";
import { t, tf } from "@/i18n/t";
import { ToggleRow, PrivacyRows, BackButton, CenterHeadline, Chip, GlassesSpot, LockSpot, OutlineBtn, PrimaryBtn, ProgressBar, Rule, StickyFooter } from "@/app/ui";
import { 소리로주고받나 } from "@/app/공용";

/** 도움설정 에서 켜고 끄는(boolean) 칸의 이름만 고른다. */
type 스위치칸 = { [K in keyof 도움설정]: 도움설정[K] extends boolean ? K : never }[keyof 도움설정];

export interface 도움항목 {
  key: 스위치칸;
  label: string;
  sub: string;
  /** 있으면 이게 참일 때만 보여 준다. 못 하는 것을 스위치로 내밀지 않는다. */
  될때만?: () => boolean;
}

/*
 * 일곱 항목을 여기 한 곳에만 둔다.
 *
 * 두 화면이 이걸 쓴다 — 가입 직후의 설정 화면(SetupScreen)과 계정 화면에서 여는
 * 접근성 화면(AccessibilityScreen). 각자 목록을 갖고 있으면 한쪽만 고치는 날이 오고,
 * 그러면 같은 스위치가 두 자리에서 다른 말을 하게 된다.
 *
 * 킷 계약이 요구하는 일곱 가지를 다 묻는다. 예전에는 '큰 글씨' 하나만 묻고 나머지
 * 여섯을 false 로 박아 서버에 보냈다 — 백엔드는 받을 준비가 돼 있었는데 화면이 안
 * 물어서 늘 "아무 도움도 필요 없음" 으로 나가고 있었다.
 */

/** 켜면 이 앱이 실제로 무언가를 한다. 무엇을 하는지 sub 에 그대로 적는다. */
export const 바로바꾸는것: 도움항목[] = [
  { key: "largeText", label: "큰 글씨", sub: "앱 전체의 글씨와 버튼을 크게 봐요" },
  { key: "highContrast", label: "고대비", sub: "글씨와 배경의 차이를 더 뚜렷하게 해요" },
  /*
   * 이 앱이 화면 글을 소리로 읽어 주고, 서버로는 preferredInput: "VOICE" 로 나간다.
   * 두 가지를 다 하는 유일한 항목이라 이쪽 무리에 둔다.
   *
   * 브라우저가 speechSynthesis 를 안 주면 이 줄을 아예 안 보여 준다(쓸수있는것).
   * 켰는데 아무 소리도 안 나면 사용자는 앱이 고장 났다고 생각한다.
   */
  {
    key: "voiceGuide",
    label: "소리로 듣고 답하기",
    sub: "안내를 소리로 읽어 드리고, 말로 답하실 수 있어요",
    // 읽어 주기와 말하기 중 하나라도 되면 보여 준다. 켜면 되는 쪽이 켜진다.
    될때만: () => 소리를낼수있나() || 들을수있나(),
  },
  { key: "mobilitySupport", label: "시간 여유", sub: "연결 시간이 지나도 보던 화면을 멋대로 닫지 않아요" },
  { key: "staffAssistancePreferred", label: "직원 도움", sub: "승인 화면에도 직원에게 보여 달라는 안내를 띄워요" },
];

/** 계정 화면에서 여는 하위 화면들의 공통 머리. */
export function SubScreenHeader({ title, kicker, spot, onBack }: {
  title: React.ReactNode; kicker?: string; spot?: React.ReactNode; onBack: () => void;
}) {
  return (
    <div className="shrink-0" style={{ padding: `14px ${GAP.screenX}px 0` }}>
      <BackButton onClick={onBack} />
      {kicker && <span aria-hidden="true" style={{ ...KICKER, color: TEXT_2, marginTop: 22, display: "block" }}>{kicker}</span>}
      <div className="flex items-end justify-between" style={{ gap: 12 }}>
        <h1 style={{ ...TYPE.display, color: TEXT_1, marginTop: kicker ? 2 : 12, flex: 1 }}>{title}</h1>
        {/* 제목 오른쪽의 선 드로잉 한 점. 장식이라 스크린리더에서 뺀다. */}
        {spot && <span aria-hidden="true" style={{ flexShrink: 0, marginBottom: 4 }}>{spot}</span>}
      </div>
      <Rule style={{ marginTop: 18 }} />
    </div>
  );
}

/** 이 브라우저에서 실제로 되는 항목만 남긴다. */
export const 쓸수있는것 = (항목들: 도움항목[]): 도움항목[] => 항목들.filter((r) => !r.될때만 || r.될때만());

/**
 * 늘 피해야 하는 것을 고르는 줄.
 *
 * 주문표에도 알레르기 축이 있는데 여기서 또 묻는 이유 — **알레르기는 주문마다
 * 달라지는 값이 아니라 그 사람에 대한 사실**이다. 주문표에만 두면 새 주문표를
 * 만들 때마다 다시 골라야 하고, 한 번 빠뜨리면 그 주문표로 주문할 때 안 걸러진다.
 * 빠뜨려도 되는 값이 아니라서 한 번 묻고 계속 쓴다.
 *
 * 서버로 나갈 때 주문표 쪽과 **합쳐진다**(canonical.ts). 덮지 않으므로 어느 쪽을
 * 빠뜨려도 걸러지는 후보가 줄지는 않는다.
 *
 * 여섯뿐인 이유는 킷 계약이 여섯만 알아서다. 표에 없는 것을 고르게 하면
 * UNKNOWN 으로 나가고 서버가 주문을 아예 막는다.
 */

export function 알레르기고르기({ 고른것, on뒤집기 }: { 고른것: AllergenId[]; on뒤집기: (id: AllergenId) => void }) {
  return (
    <div>
      <h2 style={{ ...TYPE.label, color: TEXT_2, marginBottom: 2 }}>못 드시는 것</h2>
      <p style={{ fontSize: 12, color: TEXT_2, marginBottom: 8, lineHeight: 1.6 }}>
        고르시면 그게 들어간 메뉴는 추천에서 아예 빼요. 없으시면 안 고르셔도 돼요.
      </p>
      <div className="flex flex-wrap" style={{ gap: 6 }} role="group" aria-label="못 드시는 것">
        {알레르기목록.map(({ id, label }) => (
          <Chip
            key={id}
            label={label}
            selected={고른것.includes(id)}
            onClick={() => on뒤집기(id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 안내받고 싶은 언어를 고르는 줄.
 *
 * 스위치가 아니라 넷 중 하나라서 칩으로 둔다. 이름은 그 언어로 적는다 —
 * 한국어를 못 읽는 분이 자기 언어를 찾아야 하는 목록인데 "영어" 라고 적어 두면
 * 정작 그 줄을 찾아야 할 사람이 못 읽는다.
 *
 * **이 앱 화면은 안 바뀐다.** 키오스크에 전하기만 한다. 그래서 '전해 드려요'
 * 무리에 두고, 화면이 안 바뀐다는 말을 위에 적어 둔다 — 골랐는데 아무 일도
 * 안 일어나면 사용자는 앱이 고장 났다고 생각한다.
 */

export function 언어고르기({ 고른것, on바꾸기 }: { 고른것: 언어코드; on바꾸기: (v: 언어코드) => void }) {
  return (
    <div style={{ paddingTop: 16 }}>
      <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: TEXT_1, letterSpacing: "-0.02em" }}>
        안내 언어
      </span>
      <span style={{ display: "block", fontSize: 13, color: TEXT_2, marginTop: 4, marginBottom: 10 }}>
        키오스크에 이 언어로 안내해 달라고 전해요
      </span>
      <div className="flex flex-wrap" style={{ gap: 6 }} role="radiogroup" aria-label="안내 언어">
        {언어목록.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={고른것 === code}
            lang={code}
            onClick={() => on바꾸기(code)}
            style={{
              minHeight: 44, padding: "10px 18px", borderRadius: RADIUS.pill,
              fontSize: 15, fontWeight: 700, fontFamily: FONT, letterSpacing: "-0.01em",
              backgroundColor: 고른것 === code ? RULE : CANVAS,
              color: 고른것 === code ? PAPER : TEXT_CHIP,
              border: "none", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 키오스크에서 어떻게 조작하는지, 사용자가 직접 밝히는 자리.
 *
 * VOICE/TOUCH 처럼 이 앱에서 감지할 수 있는 값이 아니다 — 스위치 보조기기나
 * 다른 사람의 도움은 화면 어디에도 감지할 단서가 없다. 그래서 짐작하지 않고
 * 직접 물어본다("혹시 순살이 편하실까요?" 배너와 같은 원칙 — 추측 대신 확인).
 *
 * 셋 중 하나만 고를 수 있다. 스위치로도 쓰고 다른 사람 도움도 받는 경우를 담을
 * 값이 계약에 따로 없다 — 회의 결과 MULTIMODAL 은 이번엔 안 만들기로 했다.
 * 하나를 고르면 나머지는 자동으로 꺼진다(언어고르기와 같은 라디오 모양).
 */

export function 입력도움고르기({ 고른것, on바꾸기 }: {
  고른것: PreferredInputHint;
  on바꾸기: (v: PreferredInputHint) => void;
}) {
  const 보기: { value: PreferredInputHint; label: string }[] = [
    { value: "NONE", label: "특별히 없어요" },
    { value: "SWITCH", label: "보조기기(스위치)를 써요" },
    { value: "ASSISTED", label: "다른 사람이 도와줘요" },
  ];
  return (
    <div style={{ paddingTop: 16 }}>
      <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: TEXT_1, letterSpacing: "-0.02em" }}>
        키오스크에서 어떻게 조작하시나요
      </span>
      <span style={{ display: "block", fontSize: 13, color: TEXT_2, marginTop: 4, marginBottom: 10 }}>
        키오스크가 미리 준비할 수 있도록 전해 드려요
      </span>
      <div className="flex flex-wrap" style={{ gap: 6 }} role="radiogroup" aria-label="키오스크에서 어떻게 조작하시나요">
        {보기.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={고른것 === value}
            onClick={() => on바꾸기(value)}
            style={{
              minHeight: 44, padding: "10px 18px", borderRadius: RADIUS.pill,
              fontSize: 15, fontWeight: 700, fontFamily: FONT, letterSpacing: "-0.01em",
              backgroundColor: 고른것 === value ? RULE : CANVAS,
              color: 고른것 === value ? PAPER : TEXT_CHIP,
              border: "none", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {label}
            {고른것 === value && <span style={{ marginLeft: 6 }}>(선택됨)</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 머리카락 굵기 선으로 이어 붙인 스위치 묶음. 두 화면이 같은 모양으로 쓴다. */

export function 도움목록({ 항목들, 설정, onChange }: {
  항목들: 도움항목[];
  설정: 도움설정;
  onChange: (한칸: Partial<도움설정>) => void;
}) {
  return (
    <div style={{ borderTop: `1px solid ${BORDER}` }}>
      {항목들.map((r, i) => (
        <div key={r.key} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
          <ToggleRow
            label={r.label}
            sub={r.sub}
            on={설정[r.key]}
            onToggle={() => onChange({ [r.key]: !설정[r.key] })}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * 도움 설정을 말로 채운다.
 *
 * 접근성 일곱 칸 중 이 앱이 화면을 바로 바꾸는 다섯 개(바로바꾸는것에서
 * voiceGuide 를 뺀 것)만 묻는다 — 전부 켬/끔 둘 중 하나라 예아니오() 하나로
 * 충분하고, 한칸씩말하기 가 쓰는 말에서고르기() 의 보기 목록 매칭은 필요 없다.
 *
 * voiceGuide 는 안 묻는다. 이미 소리로 묻고 있는 화면이라 "소리로 읽어 드릴까요"
 * 는 스스로 답이 정해진 질문이다. visualGuidance·hearingSupport 도 안 묻는다 —
 * 도움목록 의 '전해드릴것' 무리와 같은 이유로, 지금 환경(chicken-store)에서는
 * 켜도 결과가 달라지지 않는다.
 *
 * 알레르기는 여기 없다. 음성으로 절대 받지 않기로 정한 축이라(VOICE_PROFILE_
 * BUILD_SPEC.md 5번) 이 화면에도 안 올린다 — 눈으로만 고른다.
 *
 * 골격은 한칸씩말하기 와 같다(듣기 → 받기, 회차로 경쟁 상태 정리). 다른 것은
 * 판정뿐이다 — 이쪽은 늘 예아니오() 다.
 */

export function 도움설정말로채우기({ 언어, 설정, onChange, onDone, on마이크막힘 }: {
  언어: string;
  설정: 도움설정;
  onChange: (한칸: Partial<도움설정>) => void;
  /** 마지막 칸을 답하고 끝났으면 참(말로든 손으로든). 건너뛰었으면 거짓 — 다음으로() 주석. */
  onDone: (답했나: boolean) => void;
  /**
   * 마이크가 막혀 여기서는 답할 수 없다.
   *
   * 부르는 쪽이 손으로 고르는 목록으로 내려 준다. 이걸 안 주면 막다른 화면이
   * 된다 — 답할 수 없는 물음만 남고 되돌아갈 문이 없다.
   */
  on마이크막힘?: () => void;
}) {
  const 축들 = 쓸수있는것(바로바꾸는것).filter((r) => r.key !== "voiceGuide");
  const [칸, set칸] = useState(0);
  // '처리중' — 한칸씩말하기 와 같은 이유로 갈라 둔다(그만듣기() 주석 참고).
  const [상태, set상태] = useState<"쉬는중" | "듣는중" | "처리중">("쉬는중");
  const [못들음, set못들음] = useState<못들은이유 | "못골랐어요" | null>(null);
  const 듣던것 = useRef<{ 그만두기: (보내기?: boolean) => void } | null>(null);
  const 회차 = useRef(0);
  /*
   * 이어 듣기. 한칸씩말하기 와 같은 장치이고 이유도 같다 — 칸마다 두 번씩
   * 단추를 찾아 누르게 하지 않는다. 자세한 사연은 그쪽 주석에 있다.
   */
  const 이어서 = useRef(false);
  const 잇단실패 = useRef(0);
  const 살아있나 = useRef(true);
  /*
   * 예약을 참·거짓이 아니라 **번호**로 둔다.
   *
   * 참으로 두면 이미 참일 때 다시 예약할 수 없다. 여러 개 고르는 칸이 그
   * 자리다 — 값을 하나 넣어도 그 칸에 머물므로 예약이 이미 걸려 있는데,
   * set예약(true) 는 값이 안 바뀌어 효과를 다시 안 돌린다. 그러면 앞 예약이
   * 세대 검사에 걸려 물러난 뒤로 아무도 다음 듣기를 안 걸고, 사용자는 '말하기'
   * 를 다시 눌러야 한다.
   *
   * 번호는 부를 때마다 달라지므로 언제나 새 효과가 돈다.
   */
  const [예약번호, set예약번호] = useState(0);
  // 예약의 셈. 이유는 한칸씩말하기 의 같은 ref 주석에 있다.
  const 예약세대 = useRef(0);

  // 화면을 떠나면 듣던 녹음을 버린다 — 한칸씩말하기 의 같은 정리와 같은 이유다.
  useEffect(() => () => {
    살아있나.current = false;
    이어서.current = false;
    회차.current += 1;
    듣던것.current?.그만두기(false);
  }, []);

  /*
   * 들어오자마자 듣는다. **'말하기' 도 안 누른다.**
   *
   * 이 화면이 열렸다는 것은 첫 화면에서 '소리로 듣고 답하기' 를 켜 두었다는
   * 뜻이다(SetupScreen 의 음성모드). 그 스위치가 갈림길이고 여기까지 왔으면
   * 이미 고른 것인데, 그 뒤에 단추를 한 번 더 찾아 누르라고 하면 화면을 못
   * 보는 분에게는 그 한 번이 남은 문턱이 된다.
   *
   * 손으로 고르는 분에게는 이 자리가 아예 안 열린다. 스위치를 끄면 목록이
   * 나오고 이 컴포넌트는 그려지지도 않는다 — 그분들의 마이크를 우리가 열지
   * 않는다는 뜻이다.
   *
   * 마이크가 막혀 있으면 아래 콜백이 on마이크막힘 으로 목록에 내려 준다.
   * 막다른 화면이 되지 않는다.
   */
  useEffect(() => {
    /*
     * 그릴 것이 없으면 걸지 않는다.
     *
     * 훅은 아래 이른 반환(null)보다 먼저 돈다. 그래서 이 검사가 없으면 화면에
     * 아무것도 안 그린 채로 마이크만 열리는 일이 생긴다 — 소리를 끈 분이나
     * 물을 축이 없는 자리가 그렇다.
     */
    if (!소리로주고받나() || 축들.length === 0) return;
    이어서.current = true;
    set예약번호((n) => n + 1);
    // 들어올 때 한 번만. 칸마다 다시 여는 일은 이어서예약 이 한다.
  }, []);

  if (!소리로주고받나() || 축들.length === 0) return null;
  const 지금축 = 축들[Math.min(칸, 축들.length - 1)];
  const 마지막인가 = 칸 >= 축들.length - 1;

  const 이어서예약 = () => {
    if (!이어서.current) return;
    set예약번호((n) => n + 1);
  };

  /*
   * 마지막 칸을 **답하고** 끝났는지를 알려 준다. 말로든 손으로든.
   *
   * 부르는 쪽(SetupScreen)이 이 값으로 다음 화면까지 넘길지 정한다.
   *
   * ── 갈림길은 첫 화면의 스위치다 ──────────────────────────────────────────
   *
   * 이 화면은 '소리로 듣고 답하기' 를 켠 사람에게만 열린다(SetupScreen 의
   * 음성모드). 스위치를 안 켠 분은 여기 대신 손으로 고르는 목록을 보고, 거기서
   * '계속하기' 를 직접 누른다 — 그분의 화면은 저절로 안 바뀐다.
   *
   * 그러니 여기까지 온 사람은 이미 '알아서 넘어가는 쪽' 을 고른 것이다. 그 안에서
   * 말로 답했는지 켜기·끄기를 눌렀는지로 다시 가르지 않는다 — 말이 잘 안 들려
   * 손으로 누른 분에게만 마지막에 단추가 하나 더 생기는 셈이 된다.
   *
   * 건너뛰기는 안 넘긴다. 그건 이 물음들을 그만 듣겠다는 뜻이지 설정을 마쳤다는
   * 뜻이 아니다 — 손으로 고르는 목록에 내려놓고 거기 머문다.
   */
  const 다음으로 = (답했나 = false) => {
    set못들음(null);
    if (마지막인가) { 이어서.current = false; onDone(답했나); return; }
    set칸((n) => n + 1);
    이어서예약();
  };

  const 넣기 = (켬: boolean) => {
    onChange({ [지금축.key]: 켬 });
    다음으로(true);
  };

  // `손으로` 의 뜻은 한칸씩말하기 의 같은 함수 주석에 있다.
  const 듣기시작 = ({ 손으로 = false } = {}) => {
    if (손으로) 잇단실패.current = 0;
    // 스피커부터 조용히 시킨다 — 한칸씩말하기 의 같은 자리와 같은 이유다.
    그만읽기();
    set못들음(null);
    set상태("듣는중");
    회차.current += 1;
    // 한 번 누르면 그 뒤로는 이어서 듣는다(한칸씩말하기 와 같다).
    이어서.current = true;
    시작하기(회차.current);
  };

  const 시작하기 = (내회차: number) => {
    듣던것.current = 들어보기(언어, (r) => {
      if (내회차 !== 회차.current) return;
      듣던것.current = null;
      set상태("쉬는중");
      if (!("들은말" in r)) {
        set못들음(r.못들은이유);
        // 못 들었다 — 한칸씩말하기 와 같은 그물(권한이 막혔으면 바로 접는다).
        잇단실패.current += 1;
        if (r.못들은이유 === "권한없음") { 이어서.current = false; on마이크막힘?.(); return; }
        if (잇단실패.current >= 2) { 이어서.current = false; return; }
        이어서예약();
        return;
      }
      잇단실패.current = 0;
      // 이 화면은 늘 켬/끔 둘 중 하나다. 목록 매칭이 필요 없어 예아니오() 하나로 끝낸다.
      const 답 = 예아니오(r.들은말, 언어 === "en-US");
      if (답 === null) { set못들음("못골랐어요"); 이어서예약(); return; }
      넣기(답);
    }, { 스스로끝내기: 이어서.current });
  };

  /*
   * 예약이 걸려 있으면 칸이 새로 그려진 뒤에 듣기를 시작한다.
   * 여기서 바로 타이머를 걸면 옛 렌더의 지금축으로 듣는다 — 한칸씩말하기 의
   * 같은 effect 주석에 그 사연이 있다.
   */
  useEffect(() => {
    if (예약번호 === 0) return;
    const 내회차 = 회차.current;
    // 새 예약이 걸렸다. 앞 예약이 기다리다 깨어나도 이 값으로 걸러진다.
    const 내세대 = ++예약세대.current;
    const 표 = setTimeout(() => {
      if (!살아있나.current || !이어서.current) return;
      if (내회차 !== 회차.current) return;
      void 다읽을때까지(8000, { 시작기다림: 1200 }).then(() => {
        if (!살아있나.current || !이어서.current) return;
        if (내회차 !== 회차.current) return;
        // 기다리는 동안 예약이 갈렸다(칩·건너뛰기·앞 질문). 그때는 회차가
        // 안 올라가므로 위 검사로는 못 잡는다.
        if (내세대 !== 예약세대.current) return;
        듣기시작();
      });
    }, 700);
    return () => clearTimeout(표);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [예약번호, 칸]);

  // '그만 듣기' 단추 — 지금까지 녹음한 것을 서버로 보내 인식을 끝낸다.
  // 회차를 여기서 올리면 안 된다 — 한칸씩말하기 의 같은 함수 주석에 이유를 적어 뒀다.
  const 그만듣기 = () => {
    set상태("처리중");
    듣던것.current?.그만두기(true);
  };

  // 손으로 답하거나 건너뛸 때는 듣던 녹음을 버린다 — 한칸씩말하기 의 듣기취소() 와 같은 이유다.
  const 듣기취소 = () => {
    회차.current += 1;
    듣던것.current?.그만두기(false);
    듣던것.current = null;
    set상태("쉬는중");
    set못들음(null);
  };

  const 손으로답하기 = (켬: boolean) => {
    // 상태와 상관없이 — 이유는 한칸씩말하기 의 앞칸단추 주석에 있다.
    듣기취소();
    넣기(켬);
  };

  const 건너뛰기 = () => {
    // 상태와 상관없이 — 예약된 듣기까지 무효로 만든다.
    듣기취소();
    다음으로(false);
  };

  return (
    /*
      소리로 읽을 때는 이 카드 안만 읽는다(speech.ts 의 화면글).

      화면을 통째로 읽으면 질문 사이마다 화면 제목, 순번, 아래 단추까지 되풀이된다.
      지금 답해야 하는 것은 이 안에 다 있다 — 무엇을 묻는지, 물음, 고를 보기.
    */
    <div data-소리중요 style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, padding: 20, marginBottom: 28 }}>
      {/*
        순번은 읽지 않는다(data-소리조용).

        읽어 주면 "1번째 질문 전체 7개" 로 시작해서, 정작 무엇을 묻는지는 그
        뒤에 온다. 듣는 사람에게 먼저 필요한 것은 몇 번째인지가 아니라 무엇을
        묻는지다. 눈으로는 순번이 도움이 되니 화면에는 그대로 둔다.
      */}
      <p data-소리조용 style={{ ...TYPE.caption, color: TEXT_2 }}>
        {tf("{n}번째 질문 (전체 {전체}개)", { n: 칸 + 1, 전체: 축들.length })}
      </p>
      <h3 style={{ fontSize: 19, fontWeight: 800, color: TEXT_1, margin: "8px 0 4px" }}>{지금축.label}</h3>
      <p style={{ ...TYPE.caption, color: TEXT_2, lineHeight: 1.7 }}>
        {지금축.sub} — 켜 드릴까요? "네" 또는 "아니요" 로 말씀해 주세요.
      </p>

      {/*
        보기 칩도 읽지 않는다(data-소리조용).

        바로 위 안내가 이미 무엇을 답하면 되는지 말하고 있다. 칩까지 읽으면
        "…말씀해 주세요. 켜기. 끄기." 처럼 같은 말을 두 번 듣게 되고, 답할
        차례에 소리가 아직 안 끝나 있다. 손으로 고르는 사람에게는 화면에
        그대로 보인다.
      */}
      <div data-소리조용 className="flex flex-wrap" style={{ gap: 8, marginTop: 14 }}>
        {([{ label: "켜기", 값: true }, { label: "끄기", 값: false }] as const).map(({ label, 값 }) => (
          <button
            key={label}
            type="button"
            aria-pressed={설정[지금축.key] === 값}
            onClick={() => 손으로답하기(값)}
            style={{
              minHeight: 44, padding: "10px 14px", borderRadius: 999, fontFamily: FONT, fontSize: 15,
              cursor: "pointer", border: `1px solid ${설정[지금축.key] === 값 ? TEXT_1 : BORDER}`,
              backgroundColor: 설정[지금축.key] === 값 ? TEXT_1 : "transparent",
              color: 설정[지금축.key] === 값 ? PAPER : TEXT_1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* data-소리조용 — 한칸씩말하기 의 같은 자리와 같은 이유(위 주석 참고). */}
      <div data-소리조용>
        {못들음 !== null && (
          <p role="alert" style={{ fontSize: 13, color: FAIL, marginTop: 12, lineHeight: 1.7 }}>
            {못들음 === "권한없음"
              ? "마이크를 쓸 수 없어요. 위에서 손으로 골라 주세요."
              : 못들음 === "못골랐어요"
                ? '"네" 또는 "아니요" 로 다시 말씀해 주시거나 위에서 골라 주세요.'
                : "잘 안 들렸어요. 다시 말씀해 주세요."}
          </p>
        )}

        {/* 녹음은 스스로 안 끝난다 — 한칸씩말하기 의 같은 안내와 같은 이유. */}
        {상태 === "듣는중" && (
          <p role="status" style={{ fontSize: 13, color: TEXT_2, marginTop: 12, lineHeight: 1.7 }}>
            {t(이어서.current
              ? "듣고 있어요. 말씀이 끝나면 알아서 다음으로 넘어가요."
              : "듣고 있어요. 말씀하신 뒤 \"그만 듣기\"를 눌러 주세요.")}
          </p>
        )}
        {상태 === "처리중" && (
          <p role="status" style={{ fontSize: 13, color: TEXT_2, marginTop: 12, lineHeight: 1.7 }}>
            알아듣는 중이에요…
          </p>
        )}

        <div className="flex" style={{ gap: 8, marginTop: 16 }}>
          <OutlineBtn onClick={상태 === "듣는중" ? 그만듣기 : () => 듣기시작({ 손으로: true })} disabled={상태 === "처리중"}>
            {상태 === "듣는중" ? "그만 듣기" : 상태 === "처리중" ? "인식 중…" : "말하기"}
          </OutlineBtn>
          {/* 건너뛰기를 늘 둔다. 답하고 싶지 않은 칸에서 갇히면 안 된다(한칸씩말하기 와 같은 이유). */}
          <OutlineBtn onClick={건너뛰기} disabled={상태 === "처리중"}>{마지막인가 ? "끝내기" : "건너뛰기"}</OutlineBtn>
        </div>
      </div>
    </div>
  );
}

/**
 * 가입 직후 한 번 묻는 도움 설정. 회원가입 → 호칭 → **여기** → 환영합니다.
 *
 * 예전에는 계정 화면 깊숙한 곳에만 있었다. 큰 글씨가 필요한 사람이 그걸 찾으려면
 * 이미 작은 글씨로 세 번을 눌러야 했다 — 도움이 필요한 사람일수록 도달하기 어려운
 * 자리에 도움을 두고 있었다.
 *
 * 스위치는 **누르는 즉시 적용된다.** 저장 버튼을 따로 두지 않는 이유가 이것이다.
 * 큰 글씨를 켜 보고 "이 정도면 읽히는지" 를 눈으로 확인한 뒤 넘어가야 뜻이 있다.
 * 눌러 놓고 저장을 눌러야 반영되면, 그 사이에는 아무 일도 안 일어나서 사용자는
 * 자기가 무엇을 골랐는지 모른 채 확인을 누르게 된다.
 *
 * 그래서 아래에도 버튼이 하나뿐이다. '건너뛰기' 와 '저장하기' 를 나란히 두면
 * 둘이 똑같은 일(다음 화면으로 가기)을 하게 되고, 무엇을 눌러야 하는지 묻는
 * 화면이 하나 더 생긴다. 이 화면은 통째로 선택이라 그 말을 글로 적는다.
 */

export function SetupScreen({ 설정, onChange, 알레르기, on알레르기, onNext, onBack, 진행표시 = true }: {
  설정: 도움설정;
  onChange: (한칸: Partial<도움설정>) => void;
  알레르기: AllergenId[];
  on알레르기: (id: AllergenId) => void;
  onNext: () => void;
  onBack: () => void;
  /**
   * 가입 흐름(호칭 → 도움 설정)일 때만 단계를 보여 준다. '바로 시작하기' 로 들어온
   * 게스트에게 "3단계 중 3단계" 는 밟은 적 없는 단계다 — role="progressbar" 라
   * 스크린리더가 그 틀린 단계를 그대로 읽는다.
   */
  진행표시?: boolean;
}) {
  /*
   * 말로 답할지 손으로 고를지 — **첫 화면의 스위치가 정한다.**
   *
   * 쓰는 분이 둘로 갈린다. 눈으로 보고 손으로 고르는 분과, 화면을 못 보고
   * 말로 하는 분이다. 그 갈림길은 첫 화면의 '소리로 듣고 답하기' 하나이고,
   * 여기서 그 선택을 그대로 잇는다.
   *
   * 여태 여기서 한 번 더 물었다 — 목록을 먼저 보여 주고 '말로 답할게요' 라는
   * 링크를 눌러야 열렸다. 그런데 그 링크를 찾아 누르는 일이 **바로 그
   * 링크가 필요한 분에게 가장 어렵다.** 앞에서 이미 고른 것을 여기서 다시
   * 묻는 셈이기도 했다.
   *
   * 스위치를 끈 분에게는 아무것도 안 바뀐다 — 목록을 손으로 고른다.
   *
   * 도움설정말로채우기 가 끝나면(onDone) 다시 손으로 고르는 목록으로 돌아온다.
   * 여기서 답한 값이 스위치에 그대로 반영돼 있으니, 말로 답한 뒤에도 눈으로
   * 확인하고 손으로 고칠 수 있다 — "음성 없이도 다 된다" 는 같은 원칙이다.
   */
  const [음성모드, set음성모드] = useState(() => 소리로주고받나());
  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0 flex items-center" style={{ padding: `12px ${GAP.screenX}px 0` }}>
        <BackButton onClick={onBack} />
        <div className="flex-1 flex justify-center" style={{ marginRight: 34 }}>
          {진행표시 && <ProgressBar step={3} total={3} />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, padding: `28px ${GAP.screenX}px 24px` }}>
        <CenterHeadline
          kicker="accessibility"
          title={<>필요한 도움이<br />있으신가요?</>}
          spot={<GlassesSpot />}
        />

        <h2 style={{ ...TYPE.label, color: TEXT_2, marginBottom: 2 }}>이 앱이 바로 바꿔요</h2>
        {음성모드 ? (
          <도움설정말로채우기
            언어={설정.language}
            설정={설정}
            onChange={onChange}
            /*
             * 마지막 칸을 답하고 끝났으면 다음 화면까지 넘긴다.
             *
             * 이 카드는 '소리로 듣고 답하기' 를 켠 사람에게만 열린다. 그 스위치가
             * 갈림길이라, 여기까지 온 사람은 이미 알아서 넘어가는 쪽을 고른 것이다.
             * 마지막 물음에 답하고 나서 '계속하기' 를 찾아 누르라고 하면, 다 해
             * 놓고 마지막 한 번에서 막힌다 — 없애려던 바로 그 문턱이다.
             *
             * 건너뛰었으면 안 넘긴다. 물음을 그만 듣겠다는 뜻이지 설정을 마쳤다는
             * 뜻이 아니다. 손으로 고르는 목록에 내려놓는다.
             */
            onDone={(답했나) => { set음성모드(false); if (답했나) onNext(); }}
            /*
             * 마이크가 막혔다. 손으로 고르는 목록으로 물러난다.
             *
             * 여기서 안 물러나면 막다른 화면이 된다 — '말로 답할게요' 단추를
             * 없앴으므로 되돌아갈 문이 없고, 답할 수도 없는 물음만 남는다.
             * 목록으로 내려 주면 적어도 손으로는 다 할 수 있다.
             */
            on마이크막힘={() => set음성모드(false)}
          />
        ) : (
          <>
            <도움목록 항목들={쓸수있는것(바로바꾸는것)} 설정={설정} onChange={onChange} />
          </>
        )}
        {/*
          '키오스크에 전해 드려요' 무리는 한동안 비어 있었다(그림 안내·소리 대신
          화면이 이번 환경(chicken-store)에서는 안 쓰여서 뺐다). 이제 하나가
          다시 생겼다 — 조작 방식은 어느 환경에서든 킷이 그대로 쓴다.

          안내 언어는 이 화면에서 뺐다. 첫 화면 맨 아래에서 이미 고르고 들어온다 —
          같은 것을 두 화면에서 물으면, 여기서 처음 보는 사람은 아직 안 고른 줄 알고
          한 번 더 고르게 된다. 나중에 바꾸고 싶은 사람은 계정 화면의 '접근성 설정'
          에서 바꾼다(AccessibilityScreen 에는 그대로 있다).
        */}
        <h2 style={{ ...TYPE.label, color: TEXT_2, marginTop: 24, marginBottom: 2 }}>키오스크에 전해 드려요</h2>
        <입력도움고르기
          고른것={설정.preferredInputHint}
          on바꾸기={(v) => onChange({ preferredInputHint: v })}
        />

        {/*
          알레르기는 '도움 설정' 이 아니라 안전에 관한 값이라 선 아래에 따로 둔다.
          스위치 묶음에 섞으면 켜고 끄는 편의 항목처럼 읽힌다.
        */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: `2px solid ${RULE}` }}>
          <알레르기고르기 고른것={알레르기} on뒤집기={on알레르기} />
        </div>
      </div>

      <div style={{ padding: `0 ${GAP.screenX}px 32px` }}>
        <PrimaryBtn onClick={onNext}>계속하기</PrimaryBtn>
      </div>
    </div>
  );
}

/**
 * 접근성 설정. 계정 화면에서 언제든 다시 연다.
 *
 * 두 무리로 나눠 적는다.
 *
 *   이 앱이 바로 바꾸는 것   큰 글씨 · 고대비 · 쉬운 단계 · 시간 여유 · 직원 도움
 *   키오스크에 전해 드릴 것   그림 안내 · 소리 대신 화면
 *
 * 뒤의 둘은 이 앱 화면을 바꾸지 않는다. 켰는데 아무 일도 안 일어나면 사용자는
 * 앱이 고장 났다고 생각하므로, 무엇을 하는 값인지 제목으로 먼저 밝힌다.
 * 바꾸지 않는 것을 바꾼다고 말하지 않는다.
 */

export function AccessibilityScreen({ 설정, onChange, onBack }: {
  설정: 도움설정;
  onChange: (한칸: Partial<도움설정>) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full kb-paper">
      <SubScreenHeader
        kicker="accessibility"
        title={<>보기 편하게<br />바꿔드릴게요</>}
        spot={<GlassesSpot />}
        onBack={onBack}
      />
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, padding: `12px ${GAP.screenX}px 24px` }}>
        {/*
          설명은 전부 맨 위에 모아 둔다.
          예전에는 스위치 사이사이와 맨 아래에 문단이 흩어져 있었다. 스위치를 켜러
          온 사람이 글에 걸려 넘어지고, 어디까지가 설명이고 어디부터 켤 것인지
          한눈에 안 들어왔다. 읽을 것은 먼저 끝내고, 그다음부터는 켜기만 한다.

          다섯 문단이던 것을 둘로 줄였다. 지운 것이 아니라 합쳤다 -
          없어지면 안 되는 말들이다(어디까지 남는지 · 직원 도움).
        */}
        <h2 style={{ ...TYPE.label, color: TEXT_2, marginBottom: 2 }}>이 앱이 바로 바꿔요</h2>
        <도움목록 항목들={쓸수있는것(바로바꾸는것)} 설정={설정} onChange={onChange} />

        {/*
          '키오스크에 전해 드려요' 무리도 위 설정 화면과 같은 이유로 한동안
          비어 있었다. 조작 방식(입력도움고르기)이 다시 생겨서 제목도 함께 둔다.
        */}
        <h2 style={{ ...TYPE.label, color: TEXT_2, marginTop: 24, marginBottom: 2 }}>키오스크에 전해 드려요</h2>
        <입력도움고르기
          고른것={설정.preferredInputHint}
          on바꾸기={(v) => onChange({ preferredInputHint: v })}
        />
        <언어고르기 고른것={설정.language} on바꾸기={(v) => onChange({ language: v })} />

        {/*
          알레르기와 가격 한도는 여기 없다.
          
          계약에서 자리가 다르다 — 이 화면의 것들은 accessibility 와 interaction 에
          들어가고, 저 둘은 hardConstraints 다. 도움이 필요한 정도를 말하는 값과,
          이번 주문에서 무엇을 빼라는 값은 같은 화면에 있을 것이 아니다.
          
          알레르기는 가입할 때, 가격 한도는 주문표를 만들 때 묻는다.
        */}
      </div>
      {/*
        스위치는 누르는 즉시 적용된다(SetupScreen 과 같은 원칙) — 이 버튼은 저장을
        하는 게 아니라 "다 됐다" 는 걸 눈으로 확인시켜 주는 자리다.
        예전에는 뒤로가기 화살표 하나뿐이었다. 설정을 만지러 들어온 화면에
        나가는 길이 그 작은 화살표뿐이면, 다 골랐다는 확신 없이 뒤로 가게 된다 —
        이 화면 자체가 "골랐으면 끝" 이라는 걸 말해 주는 자리가 없었다.
      */}
      <StickyFooter>
        <PrimaryBtn onClick={onBack}>확인</PrimaryBtn>
      </StickyFooter>
    </div>
  );
}

export function PrivacyScreen({ guest, onBack }: { guest: boolean; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full kb-paper">
      <SubScreenHeader
        kicker="privacy"
        title={<>무엇을 남기고<br />무엇을 안 남기나요</>}
        spot={<LockSpot />}
        onBack={onBack}
      />
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, padding: `12px ${GAP.screenX}px 24px` }}>
        <PrivacyRows guest={guest} />
      </div>
    </div>
  );
}
