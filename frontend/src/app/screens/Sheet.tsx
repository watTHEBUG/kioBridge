import { useEffect, useId, useRef, useState } from "react";
import { BORDER, CANVAS, FAIL, FONT, GAP, PAPER, RADIUS, SURFACE, TEXT_1, TEXT_2, TYPE } from "@/design/tokens";
import { DetailOption, OrderSheet, PlaceType } from "@/domain/types";
import { DETAIL_OPTIONS, 못채운축 } from "@/domain/catalog";
import { MEMO_MAX, MENU_NAME_MAX, 개인정보같은글 } from "@/api/account";
import { 접근성설정, type 도움설정 } from "@/api/a11y";
import { 그만읽기, 다읽을때까지, 읽어주기 } from "@/api/speech";
import { 들어보기, type 못들은이유 } from "@/api/listen";
import { 말에서고르기, 예아니오, 뒤로가자고했나, 다음가자고했나 } from "@/api/voice";
import { 맵기물어보기 } from "@/api/spicy";
import { 입력출처 } from "@/api/inputsource";
import { t, tf } from "@/i18n/t";
import { 소리로주고받나 } from "@/app/공용";
import { BackButton, Chip, InfoBox, OutlineBtn, PrimaryBtn, SectionLabel, StickyFooter, 포커스가두기 } from "@/app/ui";
import { 한도적기 } from "@/app/screens/Saved";

export const 순살제안신호있나 = (설정: 도움설정): boolean =>
  설정.visualGuidance || 설정.largeText || 설정.highContrast
  || 설정.mobilitySupport
  || 설정.preferredInputHint === "SWITCH" || 설정.preferredInputHint === "ASSISTED";

/**
 * 형태를 안 고른 채 저장하려는 순간에만 뜬다 — 위 순살제안신호있나 가 참이고,
 * 다른 축은 다 골랐는데 형태만 빈 그 경우다.
 *
 * 시각 안내가 필요하거나 저시력인 사람에게는 뼈를 발라 먹는 과정 자체가
 * 허들이 될 수 있다. 그렇다고 앱이 짐작으로 순살을 채워 넣지 않는다 —
 * 직접 묻고, 사용자가 고른 답만 싣는다. "네"도 "상관없어요"도 둘 다
 * 형태를 채운 뒤 그대로 저장을 이어간다(OrderSheetScreen 의 저장하기).
 * 이미 저장하고 시작하기를 한 번 눌렀으니, 답한 뒤 또 눌러야 하면
 * 왜 두 번 눌러야 하는지부터 설명해야 한다.
 */

export function 순살제안시트({ onAnswer, onCancel }: {
  onAnswer: (형태: "순살" | "상관없음") => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const 이전포커스 = useRef<HTMLElement | null>(null);
  /*
   * 포커스를 열 때 저장했다가 닫을 때 되돌리는 일만 한다 — 마운트·언마운트
   * 한 번씩이라 의존성 배열을 비워 둔다.
   *
   * 전에는 여기에 onCancel 을 의존성으로 넣고 Escape 도 같이 처리했다. onCancel
   * 은 부모가 매 렌더마다 새로 만들어 주는 인라인 함수라, 시트가 열려 있는 동안
   * 부모가 리렌더되면 이 effect 가 정리(cleanup)됐다가 다시 걸렸다 — 그 사이
   * cleanup 이 배경 요소로 포커스를 되돌렸다가, 곧바로 다시 걸린 effect 가 시트로
   * 도로 옮겨서 포커스가 튀었다. Escape 는 아래 포커스가두기 한 곳에서만
   * 처리한다(그 함수 주석 참고) — 여기서 window 에 또 리스너를 달 필요가 없다
   * (coderabbitai 리뷰).
   */
  useEffect(() => {
    이전포커스.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => {
      if (이전포커스.current?.isConnected) 이전포커스.current.focus();
    };
  }, []);
  const 가두기 = 포커스가두기(ref, onCancel);

  /*
   * 뜨는 순간, 앞서 읽고 있던 화면 안내를 끊고 이 시트만 읽는다.
   *
   * 이 시트는 화면(screen)을 바꾸지 않는다 — 부모 화면 안의 로컬 상태로만 뜬다.
   * 그런데 App 루트의 소리 안내 효과는 screen/tab 이 바뀔 때만 "앞의 말을 끊고
   * 처음부터 다시 읽는다." 이 시트가 뜬 것만으로는 그 효과가 안 걸려서, 안 끊고
   * 그냥 두면 사용자는 이전 화면을 계속 듣다가 뒤늦게 이 질문을 놓친다.
   *
   * 그래서 여기서 직접 끊고(그만읽기) 이 시트의 문장만 읽는다. 아래 data-소리생략
   * 도 같이 달아 둔다 — 안 달면 루트의 "새로 붙은 줄" 감지가 350ms 뒤에 같은
   * 문장을 한 번 더 읽어서 두 번 들린다.
   */
  /*
   * 시트 문구와 읽어주기를 같은 t() 결과에서 뽑는다.
   *
   * 예전에는 읽어주기 쪽만 한국어 원문을 그대로 썼다 — 언어를 English로 두면
   * 화면은 영어인데 소리는 한국어 문장을 그대로 읽어서 알아들을 수 없는
   * 소리가 났다(coderabbitai 리뷰). t() 는 접근성설정.읽기().language 를 매
   * 호출마다 직접 보므로, 여기서 언어를 따로 안 넘겨도 화면·소리가 같이 맞다.
   */
  const 제목 = t("먹기 편한 순살로 하시겠어요?");
  const 설명 = t("형태를 아직 안 고르셨어요. 뼈를 발라 먹는 게 불편하실 수 있어 여쭤봐요.");
  const 순살버튼 = t("네, 순살로 할게요");
  const 상관없음버튼 = t("상관없어요");

  useEffect(() => {
    if (!접근성설정.읽기().voiceGuide) return;
    그만읽기();
    읽어주기(
      [제목, 설명, 순살버튼, 상관없음버튼].join(". "),
      { 언어: 접근성설정.읽기().language },
    );
    return () => 그만읽기();
  }, [제목, 설명, 순살버튼, 상관없음버튼]);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      data-소리생략
    >
      <div
        ref={ref}
        tabIndex={-1}
        onKeyDown={가두기}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bone-suggest-title"
        aria-describedby="bone-suggest-body"
        style={{ backgroundColor: PAPER, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: `28px ${GAP.screenX}px 24px`, outline: "none" }}
      >
        <h2 id="bone-suggest-title" style={{ ...TYPE.title, color: TEXT_1, margin: 0 }}>
          {제목}
        </h2>
        <p id="bone-suggest-body" style={{ ...TYPE.body, color: TEXT_2, marginTop: 10 }}>
          {설명}
        </p>
        <div style={{ marginTop: 24 }}>
          {/* 값은 "순살"/"상관없음" 한국어 그대로 넘긴다 — 저장되는 의미값(selections)이고
              canonical.ts 가 이 한국어를 enum 으로 옮긴다(t.ts 주석). 번역은 보여줄 때뿐이다. */}
          <PrimaryBtn onClick={() => onAnswer("순살")}>{순살버튼}</PrimaryBtn>
          <div style={{ height: 10 }} />
          <OutlineBtn onClick={() => onAnswer("상관없음")}>{상관없음버튼}</OutlineBtn>
        </div>
      </div>
    </div>
  );
}

/**
 * 서버가 "이 둘 중 하나 같은데 확실치 않다" 고 할 때 되묻는 창(팀 #133).
 *
 * ── 왜 창으로 바꿨나 ────────────────────────────────────────────────────────
 *
 * 예전에는 보기 줄 아래에 한 줄만 붙였다 — "혹시 순한맛 / 보통맛 말씀이신가요?
 * **위에서** 짚어 주세요." 그 한 줄이 세 가지로 나빴다.
 *
 *   ① 짚을 곳이 여기가 아니라 위였다. 되물어 놓고 답할 자리를 다른 데 두면,
 *      화면을 못 보는 분은 어디를 눌러야 하는지 알 수 없다.
 *   ② 보기가 넷이어도 후보는 둘인데, 화면에는 넷이 그대로 늘어서 있었다.
 *      무엇이 후보인지 표시가 없었다.
 *   ③ 한 줄이라 놓치기 쉬웠다. 다음 안내가 이어 나오면 그대로 흘러갔다.
 *
 * 창으로 띄우고 **후보만** 단추로 낸다. 짚으면 그 값이 그대로 들어가고 다음
 * 질문으로 넘어간다 — 되물음과 답이 한자리에 있다.
 *
 * ── 우리가 고르지 않는다 ────────────────────────────────────────────────────
 *
 * 후보 단추는 서로 생김새가 같다. 하나를 눈에 띄게 만들면 앱이 답을 미는 셈이고,
 * 그러면 "고르지 않은 조건이 섞이면 안 된다" 는 이 앱의 규칙을 화면이 어긴다.
 * 서버도 어느 쪽이라고 말하지 못해서 여기까지 온 것이다.
 *
 * ── 말로도 답할 수 있다 ─────────────────────────────────────────────────────
 *
 * 창이 떠 있는 동안에도 이어 듣기 예약은 살아 있다(부르는 쪽의 이어서예약).
 * "순한맛" 이라고 말하면 같은 자리로 들어가고 창은 닫힌다 — 손을 안 쓰는 분에게
 * 창이 새 문턱이 되면 안 된다.
 */
export function 되묻기시트({ 축이름, 값들, onPick, onCancel }: {
  축이름: string;
  /** 서버가 애매하다고 한 값들. 화면에 실제로 있는 보기만 걸러서 들어온다. */
  값들: string[];
  onPick: (값: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const 이전포커스 = useRef<HTMLElement | null>(null);
  // 포커스 저장·되돌리기. 빈 의존성인 이유는 순살제안시트의 같은 자리 주석에 있다.
  useEffect(() => {
    이전포커스.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => {
      if (이전포커스.current?.isConnected) 이전포커스.current.focus();
    };
  }, []);
  const 가두기 = 포커스가두기(ref, onCancel);

  /*
   * 문구와 읽어주기를 같은 t() 결과에서 뽑는다 — 순살제안시트와 같은 이유다
   * (영어로 두면 화면만 영어이고 소리는 한국어가 나오던 것).
   *
   * 값 이름은 보기 이름 그대로 쓴다. 서버가 만들어 준 물음 문장은 안 쓴다 —
   * 거기에는 사용자가 말한 말이 박혀 있어 번역표의 열쇠가 될 수 없다(i18n/en.ts).
   */
  /*
   * 축 이름을 제목에 넣는다. 창이 뜨면 뒤의 질문 카드가 가려져서, 무엇을 묻던
   * 중이었는지가 화면에서 사라진다.
   *
   * 조사를 안 붙인다 — '맵기를/형태를' 을 맞추려면 받침 판별이 필요한데 그
   * 도우미는 mock.ts 안에만 있고, 무엇보다 이 문장은 번역표의 열쇠라 조사가
   * 값에 따라 갈리면 열쇠가 둘로 늘어난다.
   */
  const 제목 = tf("{축} — 혹시 이 중에 있나요?", { 축: t(축이름) });
  const 설명 = t("말씀하신 것과 가까운 것을 찾았어요. 맞는 것을 짚어 주세요.");
  const 그만 = t("아니에요, 다시 말할게요");
  const 값이름 = 값들.map((v) => t(v));

  useEffect(() => {
    if (!접근성설정.읽기().voiceGuide) return;
    그만읽기();
    읽어주기([제목, 설명, ...값이름, 그만].join(". "), { 언어: 접근성설정.읽기().language });
    return () => 그만읽기();
    // 값이름 은 배열이라 매 렌더 새 참조다. 문장으로 묶어서 값이 같으면 안 돌게 한다.
  }, [제목, 설명, 그만, 값이름.join(". ")]);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      data-소리생략
    >
      <div
        ref={ref}
        tabIndex={-1}
        onKeyDown={가두기}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reask-title"
        aria-describedby="reask-body"
        /*
         * 틀을 넘지 못하게 한다.
         *
         * 후보는 많아야 넷이고(맵기), 큰 글씨를 켜고 재 보니 715 중 625 까지 찼다 —
         * 지금은 들어가지만 남는 것이 90px 뿐이다. 보기 이름이 길어지거나 언어가
         * 바뀌면 넘어가고, 그러면 맨 아래 '아니에요' 가 화면 밖으로 나가서 창을
         * 닫을 길이 사라진다. 넘칠 때는 안에서 굴러가게 둔다(StickyFooter 와 같은 그물).
         */
        style={{ backgroundColor: PAPER, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: `28px ${GAP.screenX}px 24px`, outline: "none", maxHeight: "92%", overflowY: "auto" }}
      >
        <h2 id="reask-title" style={{ ...TYPE.title, color: TEXT_1, margin: 0 }}>{제목}</h2>
        <p id="reask-body" style={{ ...TYPE.body, color: TEXT_2, marginTop: 10 }}>{설명}</p>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* 값은 한국어 그대로 넘긴다 — 저장되는 의미값이고 번역은 보여줄 때뿐이다. */}
          {값들.map((v) => (
            <OutlineBtn key={v} onClick={() => onPick(v)}>{t(v)}</OutlineBtn>
          ))}
        </div>
        {/*
          그만두는 길은 한 톤 낮춘다. 후보 단추와 같은 무게로 두면 "아니에요" 가
          보기 중 하나처럼 읽힌다.
        */}
        <button
          type="button"
          onClick={onCancel}
          style={{
            width: "100%", minHeight: 44, marginTop: 14, background: "transparent", border: "none",
            color: TEXT_2, fontSize: 15, fontWeight: 600, fontFamily: FONT, cursor: "pointer",
          }}
        >
          {그만}
        </button>
      </div>
    </div>
  );
}

let 주문표일련번호 = 0;

export const newSheetId = () => `p${Date.now()}_${++주문표일련번호}`;

/**
 * 말로 주문표를 채운다.
 *
 * ── 안내를 먼저 보여 준다 ───────────────────────────────────────────────────
 *
 * '말하세요' 만 띄우면 사람은 무엇을 어떻게 말해야 할지 모른다. 특히 처음 쓰는
 * 사람은 기계에게 말하는 법을 따로 배웠다고 여겨서, 틀릴까 봐 아예 안 쓴다.
 * 그래서 **예문을 먼저 보여 주고, 다 말하지 않아도 된다고 알려 준다.**
 *
 * ── 들은 것을 보여 주고 나서 채운다 ─────────────────────────────────────────
 *
 * 바로 채우지 않는다. 무엇을 어떻게 알아들었는지 보여 주고, 사용자가 확인한
 * 뒤에 채운다. 잘못 들었을 때 사용자가 그 사실을 알 수 있어야 한다 — 값만
 * 슬쩍 바뀌면 왜 그렇게 됐는지 알 길이 없다.
 *
 * ── 못 알아들은 축은 비워 둔다 ──────────────────────────────────────────────
 *
 * 말 안 한 것을 우리가 고르지 않는다(api/voice.ts). 화면도 그대로 말한다 —
 * "이건 못 들었어요" 라고 적고, 손으로 고르라고 남겨 둔다.
 */
/**
 * 한 칸씩 묻고 말로 답을 받는다.
 *
 * 예전에는 한 번에 다 말하게 했다("포장이고 매운맛으로 두 개"). 짧은 문장으로
 * 여러 축을 한꺼번에 말하는 건 익숙한 사람에게나 쉬운 일이다. 무엇을 말해야
 * 하는지 모르는 채로 마이크가 켜지면 대부분 아무 말도 못 한다.
 *
 * 한 칸씩 물으면 답할 것이 하나뿐이라 말이 짧아진다. 답하는 길도 둘로 연다.
 *
 *   보기 이름을 그대로   "매운맛"
 *   예/아니오            "매운맛으로 할까요?" → "네"
 *
 * 둘째 길이 필요한 이유 — 물음표로 끝나는 말을 들으면 사람은 네/아니오로 답한다.
 * 이름을 다시 말하게 하면 물어 놓고 안 듣는 셈이 된다.
 *
 * 손으로 고르는 길은 그대로 둔다. 말이 안 되는 자리에서 갇히면 안 된다.
 */

export function 한칸씩말하기({ place, 언어, 값, on고르기, onDone }: {
  place: PlaceType;
  언어: string;
  값: Record<string, string[]>;
  /**
   * 말로: 이 선택이 음성 인식에서 왔는가. 보기 칩을 눌러 고른 것은 false 다 —
   * 계약의 preferredInput 으로 나가는 값이라, 손으로 고른 것을 음성으로 적으면
   * 사용자가 실제로 하지 않은 입력 방식이 키오스크에 전해진다(#106 리뷰).
   */
  on고르기: (축: string, 고른것: string[], 말로: boolean) => void;
  onDone: () => void;
}) {
  const 축들 = place ? DETAIL_OPTIONS[place] : [];
  const [칸, set칸] = useState(0);
  /*
   * '받는중' 은 기기 안 음성 모델을 내려받는 동안이다(#102). 처음 한 번만
   * 지나가는 자리인데, 없으면 단추를 누르고 한참 아무 일도 안 일어나는 것처럼
   * 보인다. 말로채우기가 한칸씩말하기로 바뀌면서 그 상태를 여기로 옮겨 왔다.
   */
  /*
   * '처리중' 은 그만 듣기를 눌러 녹음을 서버로 보내고 응답을 기다리는 동안이다.
   * 듣는중과 갈라 둔 이유는 회차 때문이다(아래 그만듣기() 주석 참고) — 여기서
   * 상태만 바꾸고 회차는 안 올려야, 서버가 돌려준 결과를 시작하기() 콜백이
   * 제대로 받는다.
   */
  const [상태, set상태] = useState<"쉬는중" | "듣는중" | "처리중">("쉬는중");
  const [못들음, set못들음] = useState<못들은이유 | "못골랐어요" | "첫질문이에요" | "비우고넘어감" | null>(null);
  /*
   * 서버가 "이 둘 중 하나 같은데 확실치 않다" 고 할 때 되물을 값들(팀 #133).
   *
   * 우리가 고르지 않는다. 화면이 그 값들만 보여 주고 사람이 짚는다 —
   * 짐작해서 넣으면 고르지 않은 것이 골라진다는 규칙은 여기서도 같다.
   */
  const [되물을것, set되물을것] = useState<string[] | null>(null);
  const 듣던것 = useRef<{ 그만두기: (보내기?: boolean) => void } | null>(null);
  const 회차 = useRef(0);
  /*
   * 이어 듣기 — 한 번 '말하기' 를 누르면 그 뒤로는 손을 안 댄다.
   *
   * 말이 끝나면 알아서 보내고(api/vad.ts), 답이 들어가면 다음 질문을 읽어 준
   * 뒤 다시 듣기 시작한다. 다섯 칸이면 열 번 눌러야 하던 것이 한 번이 된다.
   * 화면을 못 보는 분에게는 그 열 번이 답하는 일보다 오래 걸리는 장벽이었다.
   *
   * ref 로 둔다 — 이 값이 바뀌었다고 화면을 다시 그릴 일이 없고, 늦게 도착한
   * 콜백 안에서도 지금 값을 봐야 한다(state 면 그 콜백이 만들어질 때의 옛 값을
   * 본다).
   */
  const 이어서 = useRef(false);
  /*
   * 이어 듣기가 헛도는 것을 막는다.
   *
   * 사용자가 자리를 뜨면 "말이 없다 → 다시 듣기" 가 끝없이 돈다 — 마이크가
   * 계속 켜져 있고 배터리도 닳는다. 잇달아 두 번 못 들으면 이어 듣기를 끄고
   * 단추를 남긴다. 그때부터는 사람이 다시 시작하는 길로 돌아간다.
   */
  const 잇단실패 = useRef(0);
  /** 화면을 떠난 뒤 늦게 도착한 예약이 마이크를 다시 열면 안 된다. */
  const 살아있나 = useRef(true);
  /*
   * "다음 듣기를 걸어야 한다" 는 표시. 실제로 거는 일은 아래 useEffect 가 한다.
   *
   * state 로 두는 이유는 이어서예약() 주석에 있다 — 요약하면, 칸이 새로 그려진
   * 뒤에 걸어야 옛 축으로 듣지 않는다.
   */
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
  /*
   * 예약이 몇 번째인가.
   *
   * 회차만으로는 부족하다. 회차는 **듣는 중일 때만** 올라가는데(듣기취소 는
   * 상태가 쉬는중이면 아무 일도 안 한다), 예약이 안내 읽기를 기다리는 동안은
   * 바로 그 쉬는중이다. 그 사이에 칩을 누르거나 건너뛰면 회차는 그대로이고,
   * 기다리던 약속이 깨어나 **옛 축으로** 듣기를 시작한다 — 화면은 다음 칸을
   * 묻는데 답은 앞 칸에 들어간다.
   *
   * 그래서 예약에는 예약의 셈이 따로 있어야 한다. 새 예약이 걸릴 때마다
   * 올리고, 기다리다 깨어난 쪽은 자기 세대가 아직 최신인지 본다.
   */
  const 예약세대 = useRef(0);

  /*
   * 화면을 떠나면 듣던 것을 멈춘다. 안 멈추면 마이크가 계속 켜져 있다.
   *
   * false 를 준다 — 화면을 떠나며 하던 녹음은 버린다. 안 그러면 필요 없어진
   * 녹음도 서버로 나가 Whisper 호출만 낭비된다(listen.ts 그만두기 주석 참고).
   * 회차도 올려서, 이미 서버로 나간 요청이 뒤늦게 돌아와도 무시된다.
   */
  useEffect(() => () => {
    // 이어 듣기 예약이 화면을 떠난 뒤 깨어나 마이크를 다시 열면 안 된다.
    살아있나.current = false;
    이어서.current = false;
    회차.current += 1;
    듣던것.current?.그만두기(false);
  }, []);

  /*
   * 들어오자마자 듣는다. 도움설정말로채우기 와 같은 이유다.
   *
   * 여기까지 오려면 두 번 고른 셈이다 — 첫 화면에서 '소리로 듣고 답하기' 를
   * 켰고, 주문표 목록에서 '말로 주문표 만들기' 를 골랐다. 그러고도 '말하기'
   * 를 또 찾아 누르라고 하면, 앞 화면에서 없앤 문턱이 한 칸 뒤로 옮겨질 뿐이다.
   *
   * 손으로 만드는 분에게는 이 화면 자체가 안 열린다 — 그쪽은 터치 주문표로
   * 간다. 그분들의 마이크를 우리가 열지 않는다.
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

  /*
   * 장소를 바꾸면 첫 칸으로 돌아간다.
   *
   * 축 목록이 통째로 바뀌는데 칸만 남으면 화면과 소리가 틀린 순번을 말한다 —
   * 카페(7축)에서 다섯 번째까지 간 뒤 관공서(2축)로 바꾸면 "5번째 질문 (전체
   * 2개)" 를 읽어 준다. 듣던 것도 같이 끊는다. 안 그러면 앞 장소를 보고 말한
   * 답이 새 축에 들어간다.
   */
  useEffect(() => {
    회차.current += 1;
    듣던것.current?.그만두기(false);
    듣던것.current = null;
    set칸(0);
    set상태("쉬는중");
    set못들음(null);
    set되물을것(null);
  }, [place]);

  /*
   * 지금 묻고 있는 축. 축이 하나도 없으면 undefined 다.
   *
   * 예전에는 바로 위에서 `축들.length === 0` 이면 null 을 반환했다. 그런데 그
   * 자리가 **훅 두 개 사이**였다 — 아래 예약 effect 를 건너뛰게 된다. 소리로
   * 주고받기 스위치는 이 카드가 떠 있는 동안에도 꺼질 수 있고(App 이 접근성
   * 설정을 구독한다), 그 순간 렌더마다 훅 개수가 달라져 React 가
   * "Rendered fewer hooks than expected" 로 멈춘다.
   *
   * 그래서 반환을 그리기 직전으로 내리고, 여기서는 없을 수도 있는 값으로 둔다.
   * 이 값을 쓰는 effect 는 각자 없으면 물러난다.
   */
  const 지금축 = 축들.length > 0 ? 축들[Math.min(칸, 축들.length - 1)] : undefined;
  const 마지막인가 = 칸 >= 축들.length - 1;

  const 다음으로 = () => {
    set못들음(null);
    // 앞 축에 대한 되물음이 다음 축까지 따라오면 안 된다.
    set되물을것(null);
    if (마지막인가) {
      // 흐름이 끝났다. 이어 듣기도 여기서 끈다 — 안 끄면 이름 칸으로 넘어간
      // 뒤에도 마이크가 다시 열린다.
      이어서.current = false;
      onDone();
      return;
    }
    set칸((n) => n + 1);
    이어서예약();
  };

  /*
   * 앞 질문으로 되돌아간다.
   *
   * 여태 앞으로 가는 길만 있었다 — 말하기·건너뛰기뿐이라, 두 번째 칸에 잘못
   * 답하고 나면 되돌릴 방법이 없었다. 화면 뒤로가기는 흐름을 통째로 나가므로
   * 되돌리기가 아니라 포기다.
   *
   * 답은 지우지 않는다. 돌아간 칸에 이미 고른 값이 칩으로 눌려 있어야, 무엇을
   * 골랐었는지 보고 고칠 수 있다. 다시 답하면 그 값으로 덮인다(여러 개 고르는
   * 칸은 이어 붙는데, 그 칸에 머물러 있을 때와 같은 규칙이다).
   *
   * 듣던 녹음은 부르는 쪽에서 끊는다 — 단추로 왔으면 아직 듣는 중일 수 있고,
   * 말로 왔으면 이미 끝나 있다.
   */
  const 앞칸으로 = () => {
    set못들음(null);
    set되물을것(null);
    set칸((n) => Math.max(0, n - 1));
    // 되돌아온 질문도 다시 물어야 한다. 안 그러면 여기서 흐름이 멎는다.
    이어서예약();
  };

  const 앞칸단추 = () => {
    /*
     * 상태와 상관없이 부른다.
     *
     * 예전에는 '듣는 중일 때만' 껐다. 그런데 예약된 듣기는 아직 안 듣는
     * 상태에서 기다리고 있다 — 700ms 를 세고, 그다음 안내가 다 읽히기를
     * 최대 8초까지 기다린다. 그 동안 상태는 '쉬는중' 이라, 그때 손으로
     * 고르면 예약이 안 지워진 채 살아남았다.
     *
     * 그러면 사용자가 다음 칸으로 넘어간 뒤에 **옛 축으로** 마이크가 열리고,
     * 거기 대고 한 말이 앞 칸에 들어간다 — 고르지 않은 조건이 주문표에
     * 들어가는, 이 앱이 가장 막아야 하는 일이다.
     *
     * 듣기취소() 는 회차를 올려 예약을 무효로 만든다. 안 듣고 있을 때
     * 불러도 하는 일이 없다(상태를 쉬는중으로 두고 못들음을 지울 뿐).
     */
    듣기취소();
    앞칸으로();
  };

  // 고른 값을 넣고 다음 칸으로. 여러 개 고르는 칸은 이어 붙이고 그 자리에 머문다.
  const 넣기 = (고른것: string, 말로: boolean) => {
    // 축이 없으면 넣을 곳도 없다. 화면은 이미 접혀 있고, 늦게 도착한 답이
    // 여기로 올 수 있다(서버를 한 번 오가는 사이에 스위치가 꺼진 경우).
    if (!지금축) return;
    // 값이 정해졌으면 되물을 것도 없다. 여러 개 고르는 칸은 다음으로() 를
    // 안 지나가므로 여기서도 지운다.
    set되물을것(null);
    const 이전 = 값[지금축.label] ?? [];
    on고르기(지금축.label, 지금축.multi ? [...new Set([...이전, 고른것])] : [고른것], 말로);
    if (지금축.multi) {
      set못들음(null);
      // 여러 개 고르는 칸은 그 자리에 머문다. 더 말할 수 있게 다시 연다 —
      // 안 열면 이어 듣기가 이 칸에서만 멎는다.
      이어서예약();
    } else 다음으로();
  };

  /*
   * 다음 듣기를 예약한다. 이어 듣기가 켜져 있을 때만 움직인다.
   *
   * 바로 안 연다. 칸이 바뀌면 화면 글이 바뀌고, 소리 안내가 그 새 글을 읽기
   * 시작한다(App 의 감시가 조금 늦게 잡는다). 그 읽기가 끝나기 전에 마이크를
   * 열면 두 가지가 어긋난다 — 듣기시작() 이 읽던 것을 끊어서 무엇을 묻는지
   * 못 듣게 되고, 안 끊더라도 스피커 소리가 녹음에 실린다.
   *
   * 그래서 감시가 읽기를 걸 시간을 잠깐 주고, 그 읽기가 다 끝나기를 기다린다.
   *
   * ── 여기서 setTimeout 을 직접 걸면 안 된다 ─────────────────────────────────
   *
   * 이 함수는 **어느 한 렌더의 함수**다. 여기서 건 타이머의 콜백은 그 렌더의
   * 듣기시작·지금축·칸 을 그대로 쥔다. 그런데 이 함수를 부르는 자리는 방금
   * set칸 을 올린 자리다 — 700ms 뒤 깨어난 콜백은 **바뀌기 전 축**으로 듣기를
   * 시작한다.
   *
   * 그러면 화면은 k+1 번째를 묻는데 사용자의 답은 k 번째 축에 들어간다.
   * 회차 가드도 이걸 못 막는다. 듣기시작() 이 스스로 회차를 올리고 그 값으로
   * 시작하기() 를 부르므로 언제나 같기 때문이다.
   *
   * 이 앱이 가장 피해야 할 결함이다 — 사용자가 고르지 않은 조건이 주문표에
   * 들어간다. 그래서 예약은 표시만 남기고, 실제로 거는 일은 칸이 새로 그려진
   * 뒤 아래 useEffect 가 한다.
   */
  const 이어서예약 = () => {
    if (!이어서.current) return;
    set예약번호((n) => n + 1);
  };

  /*
   * 예약이 걸려 있으면, **칸이 새로 그려진 뒤에** 다음 듣기를 시작한다.
   *
   * 칸을 의존성에 둔다. 그래야 이 effect 안의 듣기시작 이 새 렌더의 것이고,
   * 새 축으로 듣는다. 정리 함수가 타이머도 걷어 간다 — 화면을 떠나거나 칸이
   * 또 바뀌면 지난 예약은 사라진다.
   */
  useEffect(() => {
    if (예약번호 === 0) return;
    const 내회차 = 회차.current;
    // 새 예약이 걸렸다. 앞 예약이 기다리다 깨어나도 이 값으로 걸러진다.
    const 내세대 = ++예약세대.current;
    const 표 = setTimeout(() => {
      if (!살아있나.current || !이어서.current) return;
      // 그새 사람이 손을 댔다(손으로 고르기·건너뛰기·앞 질문). 그쪽이 새 회차를
      // 만들었으므로 이 예약은 지난 것이다.
      if (내회차 !== 회차.current) return;
      /*
       * 안내가 아직 시작도 안 했을 수 있다. 시작기다림 을 줘서, 그 동안에는
       * '다 읽었다' 로 접지 않는다 — 안 그러면 마이크가 안내보다 먼저 열린다.
       */
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

  /*
   * `손으로` — 사람이 '말하기' 를 눌러 새로 시작한 것인가.
   *
   * 자동 재시도와 갈라야 한다. 잇단실패 는 "자리를 뜬 사람 때문에 마이크가
   * 끝없이 도는 것" 을 막는 그물인데, 자동 재시도에서 세지 않으면 그물이
   * 없어지고, 사람이 다시 누른 자리에서 안 지우면 **한 번만 못 알아들어도
   * 곧바로 이어 듣기가 다시 꺼진다.** 다시 누른 것은 새로 시작하겠다는 뜻이다.
   */
  const 듣기시작 = ({ 손으로 = false } = {}) => {
    if (손으로) 잇단실패.current = 0;
    /*
     * 듣기 시작하는 순간 스피커부터 조용히 시킨다.
     *
     * voiceGuide 를 켜 둔 사람은 화면 안내를 계속 듣고 있다. 안 끊으면 읽던
     * 안내가 마이크가 켜진 뒤에도 계속 흘러나오고, 그 소리를 마이크가 그대로
     * 주워듣는다 — 스피커와 마이크가 가까운 기기에서는 특히 그렇다.
     */
    그만읽기();
    set못들음(null);
    set되물을것(null);
    set상태("듣는중");
    회차.current += 1;
    /*
     * 여기서부터 이어 듣기가 켜진다.
     *
     * 한 번 '말하기' 를 누른 사람은 말로 답할 뜻이 있는 것이다. 그 뒤로는
     * 말이 끝나면 알아서 보내고 다음 질문으로 이어 간다 — 칸마다 두 번씩
     * 단추를 찾아 누르지 않아도 된다.
     */
    if (!지금축) return;
    이어서.current = true;
    // 단추를 누른 바로 이 자리에서 듣기 시작한다 — 브라우저는 사람이 누른 자리가
    // 아니면 마이크를 안 열어 준다.
    시작하기(회차.current, 지금축);
  };

  const 시작하기 = (내회차: number, 이축: DetailOption) => {
    /*
     * 이어 듣기 중이면 말이 끝나는 것을 기기 안에서 지켜보다가 알아서 보낸다
     * (api/vad.ts). 처음 한 번은 사람이 '말하기' 를 눌러 여기 오지만, 그 뒤로는
     * 이 값이 켜져 있어 손을 안 대도 이어진다.
     */
    듣던것.current = 들어보기(언어, (r) => {
      if (내회차 !== 회차.current) return;
      듣던것.current = null;
      set상태("쉬는중");
      if (!("들은말" in r)) {
        set못들음(r.못들은이유);
        /*
         * 못 들었다. 이어 듣기 중이면 한 번 더 열어 준다 — 말을 더듬거나
         * 주위가 시끄러웠을 뿐인데 거기서 멈추면, 화면을 못 보는 분은 다시
         * 시작할 단추를 찾아야 한다.
         *
         * 다만 마이크가 막혔으면(권한없음) 몇 번을 열어도 같다. 그때는 바로
         * 접고, 화면이 "손으로 골라 주세요" 라고 말한다.
         */
        잇단실패.current += 1;
        if (r.못들은이유 === "권한없음" || 잇단실패.current >= 2) { 이어서.current = false; return; }
        이어서예약();
        return;
      }
      잇단실패.current = 0;

      /*
       * 무엇보다 먼저 — 앞 질문으로 가 달라는 말인가.
       *
       * 답으로 읽기 전에 본다. 뒤에 두면 "뒤로" 가 어느 보기와 우연히 겹칠 때
       * 되돌아가는 대신 값이 들어간다. 화면을 못 보는 분에게는 이 말이 앞 칸을
       * 고칠 유일한 길이라, 그 길이 답 맞추기보다 뒤에 있으면 안 된다.
       *
       * 첫 칸에서는 갈 곳이 없다. 그때는 못 알아들은 것으로 두지 않고 그렇게
       * 말해 준다 — 아무 일도 안 일어나면 사용자는 앱이 못 들었다고 여긴다.
       */
      if (뒤로가자고했나(r.들은말, 언어 === "en-US")) {
        if (칸 === 0) { set못들음("첫질문이에요"); 이어서예약(); return; }
        앞칸으로();
        return;
      }

      /*
       * 다음으로 가 달라는 말인가. 이것도 답보다 먼저 본다.
       *
       * 여러 개 고르는 칸(카페의 시럽)에서는 이 말이 없으면 나갈 길이 없다 —
       * 값을 넣어도 그 자리에 머무는 칸이라, 손을 안 쓰는 분은 같은 질문만
       * 되풀이해 듣다가 이어 듣기가 꺼진다. 화면의 '건너뛰기' 는 그분들에게
       * 없는 단추다.
       */
      if (다음가자고했나(r.들은말, 언어 === "en-US")) { 다음으로(); return; }

      // 첫째 길 — 보기 이름을 그대로 말했나. 기존 맞추기를 그대로 쓴다.
      const 고른값 = 말에서고르기(r.들은말, place, 언어 === "en-US").고른값[이축.label];
      if (고른값 && 고른값.length > 0) { 넣기(고른값[0], true); return; }

      /*
       * 둘째 길 — 예/아니오. 화면이 첫 보기를 물어보고 있으므로 '네' 는 그 보기다.
       *
       * 보기가 셋 이상일 때 '아니오' 로는 아무것도 안 고른다. 아니라는 말만으로는
       * 무엇을 고를지 알 수 없고, 짐작해서 넣으면 안 고른 것이 골라진다.
       */
      const 답 = 예아니오(r.들은말, 언어 === "en-US");
      if (답 === true) { 넣기(이축.choices[0], true); return; }
      if (답 === false) {
        if (이축.choices.length === 2) { 넣기(이축.choices[1], true); return; }
        /*
         * 보기가 셋 이상이면 '아니오' 로는 아무것도 안 고른다 — 아니라는 말만으로는
         * 무엇을 고를지 알 수 없다. 값을 안 넣는 것은 그대로 두고, **넘어간다는
         * 사실만 알린다.**
         *
         * 예전에는 말없이 다음 칸으로 갔다. 다음으로() 가 안내까지 지워서, 화면을
         * 못 보는 분은 자기 답이 반영됐는지도 왜 다음 질문이 나왔는지도 몰랐다.
         * 이 함수의 다른 실패 경로는 모두 이유를 말해 준다.
         *
         * 앞 질문으로 되돌아왔을 때는 앞서 고른 값이 남아 있다(앞칸으로 는 답을
         * 지우지 않는다). 그대로 넘어가면 화면은 "비워 두고 넘어간다" 고 하는데
         * 주문표에는 방금 아니라고 한 값이 그대로 있다. 말한 대로 비운다.
         */
        if ((값[이축.label] ?? []).length > 0) on고르기(이축.label, [], true);
        다음으로();
        set못들음("비우고넘어감");
        return;
      }

      /*
       * 셋째 길 — 보기에 없는 말이면 서버에 물어본다(팀 #133).
       *
       * 여기까지 온 것은 화면 보기와도, 예/아니오와도 안 맞았다는 뜻이다.
       * "불닭맛" 같은 말이 그렇다. 서버는 앵커 표현과의 유사도로 고르므로
       * 우리 표에 없는 말도 잡는다.
       *
       * 맵기만 물어본다. 다른 축은 아직 서버에 그 경로가 없다.
       *
       * 늦게 오는 답을 회차로 막는다 — 서버를 한 번 오가는 사이에 사용자가
       * 그만두거나 다음 축으로 갔을 수 있고, 그때 도착한 답을 넣으면 사용자가
       * 보고 있지도 않은 축이 채워진다.
       */
      if (이축.label === "맵기") {
        set상태("처리중");
        void 맵기물어보기(r.들은말).then((결과) => {
          if (내회차 !== 회차.current) return;
          set상태("쉬는중");
          if ("고른값" in 결과 && 이축.choices.includes(결과.고른값)) { 넣기(결과.고른값, true); return; }
          if ("되물을것" in 결과) {
            const 있는것 = 결과.되물을것.filter((v) => 이축.choices.includes(v));
            if (있는것.length > 0) { set되물을것(있는것); 이어서예약(); return; }
          }
          set못들음("못골랐어요");
          이어서예약();
        });
        return;
      }
      set못들음("못골랐어요");
      이어서예약();
    }, { 스스로끝내기: 이어서.current });
  };

  /*
   * '그만 듣기' 단추 — 지금까지 녹음한 것을 서버로 보내 인식을 끝낸다.
   *
   * 회차를 여기서 올리면 안 된다. 시작하기() 콜백은 회차가 그때와 같을 때만
   * 결과를 받아 준다(#118 이후의 경쟁 상태 방지 장치) — 그런데 서버 응답은
   * 네트워크를 한 번 오가야 와서, 이 함수가 끝난 한참 뒤에야 도착한다. 예전
   * 브라우저 인식 시절에는 그만 듣기가 "포기" 버튼이라 결과를 일부러 버렸지만,
   * 지금은 그만 듣기가 결과를 만드는 유일한 길이라 여기서 회차를 올리면 스스로
   * 만든 결과를 스스로 버리는 셈이 된다(직접 겪은 버그 — 눌러도 아무 일도 안
   * 일어나는 것처럼 보였다).
   *
   * 대신 '처리중' 으로만 바꿔 둔다. 실제 정리(회차 소비, 상태를 쉬는중으로)는
   * 결과가 도착했을 때 시작하기() 콜백이 한다.
   */
  const 그만듣기 = () => {
    set상태("처리중");
    듣던것.current?.그만두기(true);
  };

  /*
   * 손으로 고르거나 건너뛸 때는 듣던 녹음을 버린다(보내지 않는다).
   *
   * 안 끊으면 녹음이 계속 돌다가 늦게 서버 응답이 온다. 그 콜백이 쥔 이축은
   * 지금 축이 아니라 말하기를 누르던 때의 축이라, 방금 건너뛴 축에 값이
   * 들어가고 손으로 고른 칸은 말한 적 없는 값으로 덮인다 — 게다가 이미 손으로
   * 골랐으니 그 녹음의 인식 결과 자체가 필요 없다. 그래서 그만듣기() 가 아니라
   * false 로 직접 끊는다.
   *
   * 칸도 한 번 더 넘어간다. 콜백이 부르는 다음으로() 는 옛 칸으로 만들어진
   * 마지막인가 를 보고 있어서, 이미 넘어간 자리에서 set칸 이 또 올라간다 —
   * 물어본 적 없는 축이 그대로 지나간다.
   */
  const 듣기취소 = () => {
    회차.current += 1;
    듣던것.current?.그만두기(false);
    듣던것.current = null;
    set상태("쉬는중");
    set못들음(null);
  };

  const 손으로고르기 = (고른값: string) => {
    // 상태와 상관없이 — 이유는 앞칸단추 의 같은 자리 주석에 있다.
    듣기취소();
    넣기(고른값, false);
  };

  const 건너뛰기 = () => {
    // 상태와 상관없이 — 예약된 듣기까지 무효로 만든다.
    듣기취소();
    다음으로();
  };

  // 그릴 것이 없으면 여기서 접는다. 훅은 위에서 모두 지났다(지금축 주석).
  if (!소리로주고받나() || !지금축) return null;
  const 고른것 = 값[지금축.label] ?? [];
  const 지금축label = 지금축.label;
  return (
    <>
    {/*
      되묻기 창. 카드 **밖에** 둔다.

      안에 두면 data-소리중요 안이 되어, 창이 떠 있는 동안 읽을 것을 고를 때
      카드와 창이 한 덩이로 묶인다. 창은 스스로 읽는다(그 안의 읽어주기).

      absolute inset-0 은 이 스크롤 영역이 아니라 폰 틀을 덮는다 — 스크롤 영역은
      position 을 안 주므로 이 창의 기준이 되지 못하고, 기준이 스크롤 밖에 있으면
      overflow 도 자르지 않는다. 순살제안시트가 같은 방식이다.
    */}
    {되물을것 && 되물을것.length > 0 && (
      <되묻기시트
        축이름={지금축label}
        값들={되물을것}
        onPick={(v) => { 듣기취소(); 넣기(v, true); }}
        /*
         * 그만두면 값은 안 넣고 창만 닫는다. 듣기는 다시 연다 — 여기서 안 열면
         * 이어 듣기가 이 칸에서 멎어서, 손을 안 쓰는 분이 갇힌다.
         */
        onCancel={() => { set되물을것(null); 이어서예약(); }}
      />
    )}
    {/*
      소리로 읽을 때는 이 카드 안만 읽는다(speech.ts 의 화면글).

      화면을 통째로 읽으면 질문 사이마다 화면 제목, 순번, 아래 단추까지 되풀이된다.
      지금 답해야 하는 것은 이 안에 다 있다 — 무엇을 묻는지, 물음, 고를 보기.
    */}
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
      <h3 style={{ fontSize: 19, fontWeight: 800, color: TEXT_1, margin: "8px 0 4px" }}>{t(지금축.label)}</h3>
      {/* 첫 보기를 물어본다. 그래야 '네' 가 무엇을 뜻하는지 화면과 소리가 같아진다. */}
      <p style={{ ...TYPE.caption, color: TEXT_2, lineHeight: 1.7 }}>
        {tf("{보기} — 이것으로 할까요? 그렇게 말씀하셔도 되고, 다른 것을 말씀하셔도 돼요.", { 보기: t(지금축.choices[0]) })}
      </p>

      {/*
        보기 칩도 읽지 않는다(data-소리조용).

        바로 위 안내가 이미 무엇을 답하면 되는지 말하고 있다. 칩까지 읽으면
        "…말씀해 주세요. 켜기. 끄기." 처럼 같은 말을 두 번 듣게 되고, 답할
        차례에 소리가 아직 안 끝나 있다. 손으로 고르는 사람에게는 화면에
        그대로 보인다.
      */}
      <div data-소리조용 className="flex flex-wrap" style={{ gap: 8, marginTop: 14 }}>
        {지금축.choices.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={고른것.includes(c)}
            onClick={() => 손으로고르기(c)}
            style={{
              minHeight: 44, padding: "10px 14px", borderRadius: 999, fontFamily: FONT, fontSize: 15,
              cursor: "pointer", border: `1px solid ${고른것.includes(c) ? TEXT_1 : BORDER}`,
              backgroundColor: 고른것.includes(c) ? TEXT_1 : "transparent",
              color: 고른것.includes(c) ? PAPER : TEXT_1,
            }}
          >
            {t(c)}
          </button>
        ))}
      </div>


      {/*
       * data-소리조용 — 이 안의 글은 '새로 붙은 줄' 읽기에서 빠진다(speech.ts).
       *
       * 못들음 문구, 받는중 문구, 말하기/그만 듣기 단추 이름이 모두 상태를 따라
       * 바뀐다. 안 막으면 voiceGuide 를 켠 사람이 단추를 누를 때마다 "그만듣기"
       * 를 스피커로 듣고, 그 소리를 마이크가 다시 주워듣는다 — 듣기시작() 에서
       * 그만읽기() 로 그 순간 것은 끊지만, 여기서 막지 않으면 350ms 뒤 감시가
       * 바뀐 단추 이름을 새로 읽을 것을 또 예약한다.
       */}
      <div data-소리조용>
        {못들음 !== null && (
          <p role="alert" style={{ fontSize: 13, color: FAIL, marginTop: 12, lineHeight: 1.7 }}>
            {못들음 === "권한없음"
              ? "마이크를 쓸 수 없어요. 위에서 손으로 골라 주세요."
              : 못들음 === "첫질문이에요"
                // 아무 일도 안 일어나면 못 들은 줄 안다. 들었고 갈 곳이 없다고 말해 준다.
                ? "여기가 첫 질문이라 더 앞으로는 갈 수 없어요."
                : 못들음 === "비우고넘어감"
                  ? "그 칸은 비워 두고 다음으로 넘어갈게요. 나중에 위에서 고르셔도 돼요."
                  : 못들음 === "못골랐어요"
                  ? "말씀은 들었는데 어느 쪽인지 못 골랐어요. 다시 말씀해 주시거나 위에서 골라 주세요."
                  : "잘 안 들렸어요. 다시 말씀해 주세요."}
          </p>
        )}

        {/*
         * 녹음은(브라우저 인식과 달리) 말이 끝난 걸 스스로 못 알아챈다. 눌러야
         * 끝난다는 걸 여기서 알려 준다 — data-소리조용 안이라 소리로는 안 읽힌다.
         * 듣기시작() 이 부르는 그만읽기() 와 같은 이유로, 녹음 중에 스피커가
         * 뭔가를 읽으면 그 소리가 녹음에 그대로 실려 인식을 망친다.
         */}
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

        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
          <OutlineBtn onClick={상태 === "듣는중" ? 그만듣기 : () => 듣기시작({ 손으로: true })} disabled={상태 === "처리중"}>
            {상태 === "듣는중" ? "그만 듣기" : 상태 === "처리중" ? "인식 중…" : "말하기"}
          </OutlineBtn>
          {/*
            앞 질문. 첫 칸에서는 갈 곳이 없어 아예 안 내민다 — 눌러도 아무 일이
            없는 단추를 두면 눌러 본 사람이 앱이 멎었다고 여긴다.

            말로도 갈 수 있다("뒤로"·"이전"). 손을 안 쓰는 분에게는 그쪽이
            유일한 길이고, 이 단추는 눈으로 보고 누르는 분을 위한 같은 문이다.
          */}
          {칸 > 0 && (
            <OutlineBtn onClick={앞칸단추} disabled={상태 === "처리중"}>앞 질문</OutlineBtn>
          )}
          {/* 건너뛰기를 늘 둔다. 답하고 싶지 않은 칸에서 갇히면 안 된다. */}
          <OutlineBtn onClick={건너뛰기} disabled={상태 === "처리중"}>{마지막인가 ? "끝내기" : "건너뛰기"}</OutlineBtn>
        </div>
      </div>
    </div>
    </>
  );
}

/**
 * 말로만 채우는 주문표 만들기 화면.
 *
 * 터치 주문표(OrderSheetScreen)에 음성 카드가 끼어 있던 것을 화면으로 분리했다.
 * 터치로 만들 사람에게는 음성 카드가 소음이고, 말로 만들 사람에게는 긴 터치
 * 화면이 소음이다 — 들어오는 문에서 갈라 준다.
 *
 * 채우는 값은 터치와 완전히 같다(한칸씩말하기 → selections). 메뉴 이름만
 * 손으로 적는다 — 자유 발화를 저장하지 않는 규칙은 여기서도 그대로다.
 */

export function VoiceSheetScreen({ 언어, onNext, onBack, 주문할수있나 = false }: {
  언어: string;
  onNext: (p: OrderSheet, 이어서주문할까?: boolean) => void;
  onBack: () => void;
  /** 지금 키오스크에 붙어 있는가. 뜻은 OrderSheetScreen 의 같은 이름 주석에 있다. */
  주문할수있나?: boolean;
}) {
  const place: PlaceType = "음식점";
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [menuName, setMenuName] = useState("");
  const 이름칸id = useId();
  // 끝내기를 누르면 여기로 포커스를 옮긴다(아래 onDone). ref 로 잡아 둔다.
  const 이름칸ref = useRef<HTMLInputElement | null>(null);
  // 순살 제안 시트가 떠 있는가. OrderSheetScreen 과 같은 규칙이다(그 화면의 주석 참고).
  const [순살배너, set순살배너] = useState(false);
  // 저장은 모든 축이 채워져야 열린다 — 터치 화면과 같은 규칙(catalog.tsx 의 못채운축).
  const 빠진것 = 못채운축(place, selections);
  const 형태만빠짐 = 빠진것.length === 1 && 빠진것[0] === "형태";
  const 접근성값 = 접근성설정.읽기();
  const 순살제안대상 = 형태만빠짐 && 순살제안신호있나(접근성값);
  // 어느 단추로 왔는지. 뜻은 OrderSheetScreen 의 같은 이름 주석에 있다.
  const 시작까지갈까 = useRef(false);
  const 못저장하는가 = 개인정보같은글(menuName) || (빠진것.length > 0 && !순살제안대상);

  const 저장하기 = (형태값?: "순살" | "상관없음", 이어서주문할까 = false) => {
    // OrderSheetScreen 의 저장하기와 같은 규칙 — 답한 형태만 얹고 나머지는 그대로 둔다.
    const 최종선택 = 형태값 ? { ...selections, 형태: [형태값] } : selections;
    onNext({
      id: newSheetId(),
      menuName: menuName.trim() || "이름 없는 주문표",
      place, selections: 최종선택, memo: "",
    }, 이어서주문할까);
  };

  /*
   * 다 채워지면 '저장하고 시작하기' 까지 저절로 간다.
   *
   * ── 왜 ────────────────────────────────────────────────────────────────────
   *
   * 여기까지 말로 온 분은 화면을 못 보고 계실 수 있다. 마지막 칸에 답하고 나서
   * 단추를 찾아 누르라고 하면, 말로 다 채워 놓고 마지막 한 번에서 막힌다 —
   * 이 흐름에서 없애려던 바로 그 문턱이다.
   *
   * ── 왜 onDone 이 아니라 여기서 보나 ───────────────────────────────────────
   *
   * 마지막 답이 들어가는 순간 한칸씩말하기가 onDone 을 부르는데, 그때 이 쪽의
   * selections 는 **아직 안 바뀌었다**(setSelections 는 다음 그림에 반영된다).
   * 거기서 못채운축() 을 세면 방금 답한 칸이 여전히 빠진 것으로 나온다.
   * 값이 실제로 다 찬 것을 보고 움직여야 한다.
   *
   * ── 말로 채웠는지는 안 가린다 ─────────────────────────────────────────────
   *
   * 이 화면은 보기 칩을 눌러 고를 수도 있는데, 그때도 넘어간다.
   *
   * 갈림길은 첫 화면의 스위치다. 이 화면 자체가 '소리로 듣고 답하기' 를 켠
   * 사람에게만 열린다(목록의 '말로 주문표 만들기'). 스위치를 안 켠 분은
   * OrderSheetScreen 을 보고, 그 화면에는 이 자동 저장이 아예 없다 — 그분의
   * 화면은 저절로 안 바뀐다.
   *
   * 그러니 여기까지 온 사람은 이미 알아서 넘어가는 쪽을 고른 것이다. 그 안에서
   * 말로 했는지 칩을 눌렀는지로 다시 가르면, 말이 잘 안 들려 손으로 누른 분에게만
   * 마지막에 단추가 하나 더 생긴다.
   *
   * 맞바꾸는 것이 있다 — 주문표 이름을 적으려던 사람은 마지막 칸을 채우는 순간
   * 화면을 떠난다. 이름은 비워 두면 '이름 없는 주문표' 가 되고 목록에서 고쳐
   * 적을 수 있다.
   *
   * ── 안 넘어가는 자리 ──────────────────────────────────────────────────────
   *
   * 형태를 건너뛰어 순살 제안이 뜰 자리(순살제안대상)는 그대로 둔다. 그건
   * 팀에서 따로 물어보기로 한 물음이라 우리가 대신 지나가지 않는다.
   */
  const 이미저장했나 = useRef(false);
  useEffect(() => {
    if (이미저장했나.current) return;
    if (!소리로주고받나()) return;
    if (빠진것.length > 0 || 개인정보같은글(menuName)) return;
    이미저장했나.current = true;
    /*
     * 손으로 눌렀다면 어느 단추를 눌렀을 자리인가 — 그것과 같이 간다.
     *
     * 키오스크에 붙어 있으면 '시작하기'(저장까지 겸한다), 아니면 '저장하기'.
     * 붙어 있지도 않은데 주문으로 밀면 갈 곳이 없다.
     */
    저장하기(undefined, 주문할수있나);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, menuName]);
  return (
    <div className="flex flex-col h-full kb-paper">
      {/*
        머리를 스크롤 영역 안에 둔다 — 이유는 Saved.tsx 의 같은 자리 주석에 있다.
        큰 글씨에서 제목이 여러 줄이 되면 머리와 아래 단추만으로 틀보다 커져서,
        가운데가 0 까지 줄어도 저장·시작 단추가 화면 밖으로 밀려 잘렸다.
      */}
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight: 0, paddingLeft: GAP.screenX, paddingRight: GAP.screenX }}>
        <div style={{ paddingTop: 12 }}>
          <BackButton onClick={onBack} />
          <h1 style={{ ...TYPE.display, color: TEXT_1, marginTop: 28 }}>말로 만드는 주문표</h1>
          <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8, marginBottom: 24 }}>
            한 칸씩 여쭤볼게요. 말씀하셔도 되고, 보기를 눌러 고르셔도 돼요
          </p>
        </div>
        {소리로주고받나() ? (
          <한칸씩말하기
            place={place}
            언어={언어}
            값={selections}
            on고르기={(축, 고른것, 말로) => {
              // 고른 값만 넣는다. 들은 말은 저장하지 않는다(한칸씩말하기 주석).
              //
              // 빈 것이 오면 넣지 않고 지운다 — 그 축을 비우겠다는 뜻이다(되돌아와
              // '아니오' 라고 한 경우). 빈 배열을 남겨 두면 고르지 않은 축이
              // 주문표에 키로 남는다.
              setSelections((prev) => {
                if (고른것.length === 0) {
                  const { [축]: _버릴것, ...나머지 } = prev;
                  return 나머지;
                }
                return { ...prev, [축]: 고른것 };
              });
              // 말로 고른 것만 음성 입력으로 적는다. 이 화면에서도 보기 칩을 눌러
              // 고를 수 있는데, 그것까지 적으면 손으로 고른 사람이 계약에
              // '음성으로 넣는 사람'(preferredInput: VOICE) 으로 나간다(#106 리뷰).
              if (말로) 입력출처.말로채움();
            }}
            /*
             * 마지막 질문의 '끝내기'. 다음 할 일(이름 적기 또는 저장)로 포커스를
             * 옮긴다 — 빈 함수면 키보드·스크린리더 사용자가 눌러도 아무 일이
             * 없어서, 끝난 건지 고장 난 건지 알 수 없다(#106 리뷰).
             *
             * 말로 다 채운 경우에는 위 자동 저장이 먼저 움직여 이 화면을 떠난다.
             * 여기로 오는 것은 건너뛰어서 아직 빈 칸이 남았을 때다 — 그때는
             * 이름 칸으로 옮겨 주는 것이 맞다.
             */
            onDone={() => 이름칸ref.current?.focus()}
          />
        ) : (
          // 여기까지 들어왔는데 못 듣는 기기다(문 앞의 단추는 들을수있나 로 가리지만,
          // 새로고침 복원 등으로 올 수 있다). 막다른 화면을 만들지 않는다.
          <InfoBox>이 기기에서는 말로 채울 수 없어요. 뒤로 가서 터치로 만들어 주세요.</InfoBox>
        )}

        <div style={{ marginBottom: 28 }}>
          <SectionLabel text="주문표 이름" 칸id={이름칸id} />
          <input
            ref={이름칸ref}
            id={이름칸id}
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            maxLength={MENU_NAME_MAX}
            placeholder="비워 두면 '이름 없는 주문표' 로 저장돼요"
            style={{
              width: "100%", ...TYPE.body, color: TEXT_1, fontFamily: FONT,
              padding: "15px 16px", borderRadius: RADIUS.input,
              border: "none", outline: "none", backgroundColor: CANVAS, boxSizing: "border-box",
            }}
          />
          {/* 메뉴 이름 검사는 터치 화면과 같다(#101 리뷰). 말로 온 사람이라고 예외가 아니다. */}
          {개인정보같은글(menuName) && (
            <p role="alert" style={{ ...TYPE.caption, color: FAIL, marginTop: 8 }}>
              이름에 전화번호·주민등록번호·주소처럼 보이는 것이 있어요. 지워 주시면 저장할 수 있어요.
            </p>
          )}
        </div>
      </div>

      <StickyFooter>
        {빠진것.length > 0 && !순살제안대상 && (
          <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2, marginBottom: 2 }}>
            {tf("아직 안 고른 것 — {빠진것}. 모두 골라야 저장할 수 있어요", { 빠진것: 빠진것.map(t).join(", ") })}
          </p>
        )}
        {!주문할수있나 && !(빠진것.length > 0 && !순살제안대상) && (
          <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2, marginBottom: 2 }}>
            QR을 찍으면 저장과 함께 바로 시작할 수 있어요
          </p>
        )}
        {/* 저장과 시작을 가른 이유는 OrderSheetScreen 의 같은 자리 주석에 있다. */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <OutlineBtn
              onClick={() => {
                시작까지갈까.current = false;
                if (순살제안대상) { set순살배너(true); return; }
                저장하기();
              }}
              disabled={못저장하는가}
            >
              저장하기
            </OutlineBtn>
          </div>
          <div style={{ flex: 1 }}>
            <PrimaryBtn
              onClick={() => {
                시작까지갈까.current = true;
                if (순살제안대상) { set순살배너(true); return; }
                저장하기(undefined, true);
              }}
              disabled={못저장하는가 || !주문할수있나}
            >
              시작하기
            </PrimaryBtn>
          </div>
        </div>
      </StickyFooter>
      {순살배너 && (
        <순살제안시트
          onAnswer={(형태값) => { set순살배너(false); 저장하기(형태값, 시작까지갈까.current); }}
          onCancel={() => set순살배너(false)}
        />
      )}
    </div>
  );
}

export function SaveChoiceScreen({ 이름, onChoose, onBack }: {
  이름: string;
  onChoose: (남길까: boolean) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full kb-paper" style={{ overflowY: "auto" }}>
      <div className="shrink-0 flex items-center" style={{ padding: `12px ${GAP.screenX}px 0` }}>
        <BackButton onClick={onBack} />
      </div>
      <div style={{ flex: "1 0 auto", padding: `24px ${GAP.screenX}px 24px` }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT_1, marginBottom: 16 }}>저장할까요?</h2>
        <p style={{ fontSize: 17, fontWeight: 700, color: TEXT_1, lineHeight: 1.6 }}>
          {/* 사용자가 적은 이름이다. 옮기지 않는다. */}
          <span data-원문>{이름}</span>
        </p>
        <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 12, lineHeight: 1.7 }}>
          지금 바로 주문하는 데는 저장하지 않아도 됩니다. 저장해 두면 다음에 올 때
          이 기기에서 다시 꺼내 쓸 수 있어요.
        </p>
      </div>
      <StickyFooter>
        <PrimaryBtn onClick={() => onChoose(false)}>이번만 쓰기</PrimaryBtn>
        <div style={{ marginTop: 10 }}>
          <OutlineBtn onClick={() => onChoose(true)}>이 기기에 저장하기</OutlineBtn>
        </div>
      </StickyFooter>
    </div>
  );
}

export function OrderSheetScreen({ onNext, onBack, 로그인함 = false, 예산, on예산, 영어인가, 고칠것 = null, 주문할수있나 = false }: {
  onNext: (p: OrderSheet, 이어서주문할까?: boolean) => void;
  onBack: () => void;
  /**
   * 지금 키오스크에 붙어 있는가(QR 을 찍었고 연결이 살아 있는가).
   *
   * 이 값이 '시작하기' 를 열고 닫는다. 안 붙어 있으면 저장까지만 할 수 있다 —
   * 붙은 키오스크가 없으면 시작할 자리가 없고, 눌러 봐야 갈 곳이 없는 단추다.
   */
  주문할수있나?: boolean;
  /**
   * 고치러 들어온 주문표. null 이면 새로 만드는 것이다.
   *
   * 예전에는 한 번 만든 주문표를 여는 길이 없었다. 조건 하나가 틀리면 지우고
   * 처음부터 다시 적어야 했다 — 맵기만 바꾸려 해도 이름·장소·메모를 전부 다시
   * 적는 일이다. 저장해 둔 것을 다시 쓰자고 만든 앱에서 그건 앞뒤가 안 맞는다.
   */
  고칠것?: OrderSheet | null;
  /** 이번 이용의 가격 한도. 주문표에는 안 담긴다 — 한도고르기 의 주석을 보라. */
  예산: number | null;
  on예산: (원: number | null) => void;
  /** 금액 표기가 언어마다 다르다. 한도고르기 까지 내려간다. */
  영어인가: boolean;
  /**
   * 로그인한 사람인가. 저장한 주문표가 서버에도 올라가는지가 달라지므로 화면이 말해 준다.
   * 로그인하지 않았으면 서버 이야기를 꺼내지 않는다 — 하지 않는 일을 설명할 이유가 없다.
   */
  로그인함?: boolean;
}) {
  const [menuName, setMenuName] = useState(고칠것?.menuName ?? "");
  /*
   * 장소는 음식점(닭강정집) 고정이다. 묻지 않는다.
   *
   * 이번 시나리오의 키오스크가 닭강정집 하나뿐이라 고를 것이 없는데도 묻고
   * 있었고, 안 고른 사람은 목록 화면에서 "장소를 아직 안 고르셨어요" 에 막혔다 —
   * 답이 하나뿐인 질문으로 주문을 막은 셈이다. 저장된 옛 주문표(병원 등)를
   * 고칠 때만 그 장소를 그대로 둔다. 장소 고르기가 돌아와야 하면 git 에서
   * handlePlaceChange(장소별선택 되돌리기 포함)를 되살리면 된다.
   */
  const place: PlaceType = 고칠것?.place ?? "음식점";
  // 고른 값을 그대로 물려받되 **새 객체로** 담는다. 저장된 주문표의 selections 를
  // 그대로 쥐고 고치면, 저장을 안 누르고 나가도 목록의 주문표가 이미 바뀌어 있다.
  const [selections, setSelections] = useState<Record<string, string[]>>(
    () => Object.fromEntries(Object.entries(고칠것?.selections ?? {}).map(([축, 값]) => [축, [...값]])),
  );
  const [memo, setMemo] = useState(고칠것?.memo ?? "");
  // 순살 제안 시트가 떠 있는가. 형태만 비어 있고 접근성 신호가 있을 때만 연다
  // (아래 순살제안대상, 순살제안시트 주석).
  const [순살배너, set순살배너] = useState(false);

  // 이름·메모 칸의 id. 라벨을 칸에 묶는 데 쓴다(SectionLabel 주석).
  const 이름칸id = useId();
  const 메모칸id = useId();

  const options = place ? DETAIL_OPTIONS[place] : [];

  /*
   * 형태만 비어 있고, 순살제안신호있나 가 참이면(시각 신호 또는 손 관련 신호)
   * "저장하고 시작하기" 를 눌렀을 때 곧장 막는 대신 순살 제안 시트를 연다.
   *
   * 형태 칩을 그리는 시점(화면을 여는 순간)이 아니라 저장을 누르는 시점에
   * 판단한다 — 미리 배너부터 띄우면 아직 다른 축도 안 골랐는데 형태 얘기부터
   * 듣게 된다. 형태 말고 다른 축도 비어 있으면(순살만 물어서 해결되는 게
   * 아니면) 평소처럼 "아직 안 고른 것" 안내로 막는다.
   */
  const 빠진축 = 못채운축(place, selections);
  const 형태만빠짐 = 빠진축.length === 1 && 빠진축[0] === "형태";
  const 접근성값 = 접근성설정.읽기();
  const 순살제안대상 = 형태만빠짐 && 순살제안신호있나(접근성값);

  /*
   * 저장 자체가 막히는 조건. 두 단추가 같이 본다 — '시작하기' 는 저장을 겸하므로
   * 저장이 막히는 자리에서는 시작도 막힌다.
   */
  const 못저장하는가 =
    개인정보같은글(memo) || 개인정보같은글(menuName) || (빠진축.length > 0 && !순살제안대상);

  /*
   * 저장한다. 이어서 주문까지 갈지는 어느 단추로 왔느냐가 정한다.
   *
   * '시작하기' 는 저장을 겸한다 — 저장해 두지 않은 주문표로는 주문할 수 없고,
   * 저장을 따로 누르게 하면 시작하려던 사람이 두 번 누른다.
   */
  /*
   * 순살 제안 시트를 거쳐 갈 때, 어느 단추로 왔는지를 들고 간다.
   *
   * 시트가 뜨면 저장이 한 박자 미뤄진다. 그 사이에 '저장하기' 로 왔는지
   * '시작하기' 로 왔는지를 잊으면, 시작하려던 사람이 목록으로 떨어진다.
   */
  const 시작까지갈까 = useRef(false);

  const 저장하기 = (형태값?: "순살" | "상관없음", 이어서주문할까 = false) => {
    // 답한 형태만 얹는다 — 나머지 selections 는 그대로다(사용자 요청: 기존
    // 선호는 건드리지 않고 형태만 추가로 채워서 보낸다).
    const 최종선택 = 형태값 ? { ...selections, 형태: [형태값] } : selections;
    onNext({
      id: 고칠것?.id ?? newSheetId(),
      menuName: menuName.trim() || "이름 없는 주문표",
      place, selections: 최종선택, memo,
    }, 이어서주문할까);
  };

  const toggleChip = (sectionLabel: string, choice: string, multi: boolean) => {
    const 배타 = options.find((o) => o.label === sectionLabel)?.exclusive ?? [];
    setSelections((prev) => {
      const current = prev[sectionLabel] ?? [];
      /*
       * 다 끄면 축 자체를 뺀다. 빈 배열을 남기면 안 된다.
       *
       * 빈 배열과 '축이 없는 것' 은 같은 뜻인데 모양만 다르다. 그런데 서버는
       * 그 둘을 다르게 본다 - selections 의 값에 @NotEmpty 가 걸려 있어서
       * 빈 배열이 섞이면 저장이 400 으로 막힌다(팀 #79).
       *
       * 그 400 은 스프링 기본 응답이라 code 도 message 도 없다. 화면은
       * "적어 주신 내용을 다시 확인해 주세요" 만 띄우고 **무엇이 문제인지
       * 말해 주지 못한다.** 맵기를 눌렀다 다시 눌러 끈 것뿐인데 주문표가
       * 통째로 안 올라가고, 사용자는 이유를 알 길이 없다.
       */
      const 넣기 = (값: string[]): Record<string, string[]> => {
        if (값.length > 0) return { ...prev, [sectionLabel]: 값 };
        const { [sectionLabel]: _버림, ...나머지 } = prev;
        return 나머지;
      };
      if (multi) {
        if (current.includes(choice)) {
          return 넣기(current.filter((c) => c !== choice));
        }
        // '시럽 없음' 을 고르면 다른 시럽은 내린다. 반대로 시럽을 고르면 '없음'을 내린다.
        // 둘이 같이 켜져 있으면 앱도 사용자도 무엇을 시킨 건지 알 수 없다.
        const 남길 = 배타.includes(choice)
          ? []
          : current.filter((c) => !배타.includes(c));
        return 넣기([...남길, choice]);
      } else {
        return 넣기(current[0] === choice ? [] : [choice]);
      }
    });
  };

  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0" style={{ padding: `12px ${GAP.screenX}px 0` }}>
        {/*
         * 진행 표시를 두지 않는다.
         *
         * 예전에는 게스트가 아니면 "3단계 중 3단계" 를 보여 줬다. 그런데 이 화면은 가입
         * 흐름의 끝이 아니라 홈에서 '+ 새 주문표 추가' 로 들어오는 자리다. 로그인한 사람이
         * 다섯 번째 주문표를 만들 때도 "3단계 중 3단계" 가 떴고, role="progressbar" 라
         * 스크린리더는 그 틀린 단계를 그대로 읽었다.
         * 가입 흐름은 가입(1) → 호칭(2) 둘로 끝난다.
         */}
        <BackButton onClick={onBack} />
      </div>

      {/*
        머리를 스크롤 영역 안에 둔다 — 이유는 Saved.tsx 의 같은 자리 주석에 있다.
        큰 글씨에서 제목이 여러 줄이 되면 머리와 아래 단추만으로 틀보다 커져서,
        가운데가 0 까지 줄어도 저장·시작 단추가 화면 밖으로 밀려 잘렸다.
      */}
      <div className="flex-1 overflow-y-auto pb-4" style={{ minHeight: 0, paddingLeft: GAP.screenX, paddingRight: GAP.screenX }}>
        <div>
          <h1 style={{ ...TYPE.display, color: TEXT_1, marginTop: 28 }}>{고칠것 ? "주문표 고치기" : "메뉴 주문표"}</h1>
          <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8, marginBottom: 24 }}>
            {고칠것 ? "고치고 저장하면 이 주문표가 바뀌어요" : "자주 주문하는 메뉴를 저장해두세요"}
          </p>
        </div>
        {/*
          음성 카드는 뺐다. 말로 만드는 길은 별도 화면(VoiceSheetScreen)으로 갈랐다 —
          터치로 만들 사람에게 음성 카드는 소음이었다. 들은 말을 저장하지 않는 규칙과
          그 사연(#39 리뷰)은 그 화면과 한칸씩말하기 주석에 있다.
        */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel text="메뉴 이름" required 칸id={이름칸id} />
          <input
            id={이름칸id}
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            // 서버의 menuName 이 @Size(max = 100) 이다. 넘으면 저장은 되는데 서버에만
            // 못 올라가고, 사용자는 그 사실을 나중에 안다. 애초에 못 넘게 막는다.
            maxLength={MENU_NAME_MAX}
            placeholder="예) 아이스 아메리카노 둘"
            style={{
              width: "100%", ...TYPE.body, color: TEXT_1, fontFamily: FONT,
              padding: "15px 16px", borderRadius: RADIUS.input,
              border: "none", outline: "none", backgroundColor: CANVAS, boxSizing: "border-box",
            }}
          />
          {/*
            메모와 같은 검사를 여기에도 건다. 자유롭게 적는 칸이 둘인데 한쪽만
            막으면, 막힌 칸을 피해 다른 칸에 적는 것을 못 막는다(#101 리뷰).
            여기서도 지우지는 않는다 — 무엇을 지워야 하는지 말하고 사용자가 고친다.
          */}
          {개인정보같은글(menuName) && (
            <p role="alert" style={{ ...TYPE.caption, color: FAIL, marginTop: 8 }}>
              메뉴 이름에 전화번호·주민등록번호·주소처럼 보이는 것이 있어요. 지워 주시면 저장할 수 있어요.
            </p>
          )}
        </div>

        {/* 장소 고르기는 뺐다 — 위의 place 주석. 답이 하나뿐인 질문은 묻지 않는다. */}
        {options.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel text="세부 옵션" />
            <div>
              {options.map((opt, oi) => {
                const selected = selections[opt.label] ?? [];
                return (
                  <div key={opt.label} style={{ marginTop: oi > 0 ? 20 : 0 }}>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_1, letterSpacing: "-0.01em" }}>{opt.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 400, color: TEXT_2 }}>
                        {opt.multi ? "복수 선택" : "1개 선택"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={`${opt.label} — ${opt.multi ? "복수 선택" : "1개 선택"}`}>
                      {opt.choices.map((choice) => (
                        <Chip key={choice} label={choice} selected={selected.includes(choice)} onClick={() => toggleChip(opt.label, choice, opt.multi)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/*
          조건을 고르는 자리에서 얼마까지 쓸지도 같이 정한다. 맵기·형태와 함께
          '이 주문의 조건' 이라 여기가 맞다. 다만 값은 주문표가 아니라 이번
          이용에 담긴다(한도고르기 주석).
        */}
        <div style={{ marginBottom: 24 }}>
          <한도적기 예산={예산} on바꾸기={on예산} 영어인가={영어인가} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <SectionLabel text="메모" 칸id={메모칸id} />
          {/*
           * 메모는 자유 입력이라 사용자가 무엇이든 적을 수 있다.
           * "이 칸을 없애라" 는 지적도 있었지만, '얼음 적게 부탁드려요' 처럼
           * 자기 사정을 말하는 유일한 자리라 없애면 잃는 게 더 크다.
           * 대신 무엇을 적지 말아야 하는지 적을 자리 바로 옆에서 밝힌다.
           * placeholder 는 입력하면 사라지므로 안내는 밖에 따로 둔다.
           */}
          <textarea
            id={메모칸id}
            /* 무엇을 적지 말아야 하는지는 아래 memo-notice 가 읽어 준다. 라벨에
               또 적으면 칸에 들어갈 때마다 그 긴 문장을 한 번 더 듣는다. */
            aria-describedby="memo-notice"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            // 서버의 memo 가 @Size(max = 500) 이다. menuName 과 같은 이유로 여기서 막는다.
            maxLength={MEMO_MAX}
            placeholder="예: 얼음 적게 주세요"
            rows={3}
            style={{
              width: "100%", ...TYPE.body, color: TEXT_1, fontFamily: FONT,
              padding: "15px 16px", borderRadius: RADIUS.input, resize: "none",
              border: "none", outline: "none", backgroundColor: CANVAS, boxSizing: "border-box",
            }}
          />
          <p id="memo-notice" style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8 }}>
            주문에 필요한 내용만 적어 주세요. <strong style={{ fontWeight: 600, color: TEXT_1 }}>이름·전화번호·주민등록번호 같은 개인정보는 적지 마세요.</strong>
          </p>
          {/*
            안내 한 줄로는 안 지켜진다. 안내를 못 보거나 습관대로 적는 사람이 있고,
            이 앱은 실제 개인정보를 받지도 저장하지도 않겠다고 약속했다.
            모양으로 걸러낸다 — 완벽하진 않지만(이름은 못 가려낸다) 저장되면 가장
            곤란한 두 가지는 여기서 막힌다. 지우지는 않는다. 사용자가 적은 것을
            앱이 말없이 고치면 화면에 보이는 것과 저장되는 것이 달라진다.
          */}
          {개인정보같은글(memo) && (
            <p role="alert" style={{ ...TYPE.caption, color: FAIL, marginTop: 8 }}>
              전화번호·주민등록번호·주소처럼 보이는 것이 있어요. 지워 주시면 저장할 수 있어요.
            </p>
          )}
        </div>

        {/*
          왜 아직 저장할 수 없는지 알려 주는 줄들. **바닥이 아니라 여기 둔다.**

          바닥에 두었더니 큰 글씨에서 이 문장들이 여러 줄로 늘어나 바닥만 864px 이
          됐다 — 틀이 715px 인데. 그러면 저장·시작 단추가 화면 밖으로 밀려서, 다
          채워 놓고도 저장할 방법이 없었다.

          바닥에는 누를 것만 남긴다. 이 줄들은 읽는 것이라 본문과 함께 굴러가도
          된다. 무엇을 더 골라야 하는지는 바로 위 칸들을 보면서 읽는 편이 낫다.
        */}
        <div style={{ marginTop: 20 }}>
          {로그인함 && !place && (
            <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2, marginBottom: 2 }}>
              <span style={{ fontWeight: 600, color: TEXT_1 }}>장소</span>를 정해 두시면 다음에 로그인해도 불러올 수 있어요
            </p>
          )}
          {빠진축.length > 0 && !순살제안대상 && (
            <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2, marginBottom: 2 }}>
              {tf("아직 안 고른 것 — {빠진것}. 모두 골라야 저장할 수 있어요", {
                빠진것: 빠진축.map(t).join(", "),
              })}
            </p>
          )}
          {!주문할수있나 && !(빠진축.length > 0 && !순살제안대상) && (
            <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2, marginBottom: 2 }}>
              QR을 찍으면 저장과 함께 바로 시작할 수 있어요
            </p>
          )}
        </div>
      </div>

      <StickyFooter>
        {/*
          저장과 시작을 갈랐다.
          ─────────────────────────────────────────────────────────────────────
          예전에는 "저장하고 시작하기" 한 단추였는데, 이름과 하는 일이 어긋나
          있었다 — 눌러도 저장만 되고 목록에 내려놓았다. 시작은 QR 을 찍은
          사람에게만 목록에서 열렸다. 그래서 이름대로 갈라 놓는다.

          '저장하기' 는 늘 누를 수 있다. 키오스크 앞이 아니어도 미리 만들어
          두는 것이 이 앱이 하는 일이다.

          '시작하기' 는 붙어 있을 때만. 그리고 그 한 번에 저장까지 한다 —
          저장 안 된 주문표로는 주문할 수 없으니, 따로 누르게 하면 시작하려던
          사람이 두 번 누른다.

          고치는 중이면 '고친 내용 저장하기' 로 이름만 바뀐다. 하는 일은 같다.
        */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <OutlineBtn
              /*
               * 고치는 중이면 **같은 id 로** 돌려준다. 새 id 를 주면 고친 것이 아니라
               * 하나가 더 생기고, 서버에 올라간 주문표는 옛것이 그대로 남는다.
               *
               * 새로 만들 때만 id 를 짓는다. Date.now() 만 쓰면 같은 밀리초에 두 개를
               * 만들 때 겹치고, 겹치면 하나를 지울 때 다른 하나도 같이 사라진다.
               */
              /*
               * 이름을 안 적어도 저장한다.
               *
               * 예전에는 이름이 있어야만 저장할 수 있었다. 그런데 이름은 이 주문표를
               * 나중에 알아보려고 붙이는 이름표일 뿐이고, 주문을 만드는 데 필요한 것은
               * 장소와 고른 값들이다. 말로 채우고 바로 쓰려는 사람에게 이름부터
               * 적으라고 막을 이유가 없다.
               *
               * 비워 두면 목록에서 '이름 없는 주문표' 로 보인다 — 빈 줄로 두면 무엇이
               * 저장됐는지 알 수 없다.
               */
              onClick={() => {
                시작까지갈까.current = false;
                // 형태만 비어 있고 접근성 신호가 있으면, 곧장 저장하는 대신 먼저 묻는다.
                if (순살제안대상) { set순살배너(true); return; }
                저장하기();
              }}
              disabled={못저장하는가}
            >
              {고칠것 ? "고친 내용 저장하기" : "저장하기"}
            </OutlineBtn>
          </div>
          <div style={{ flex: 1 }}>
            <PrimaryBtn
              onClick={() => {
                시작까지갈까.current = true;
                if (순살제안대상) { set순살배너(true); return; }
                저장하기(undefined, true);
              }}
              disabled={못저장하는가 || !주문할수있나}
            >
              시작하기
            </PrimaryBtn>
          </div>
        </div>
      </StickyFooter>
      {순살배너 && (
        <순살제안시트
          onAnswer={(형태값) => { set순살배너(false); 저장하기(형태값, 시작까지갈까.current); }}
          onCancel={() => set순살배너(false)}
        />
      )}
    </div>
  );
}
