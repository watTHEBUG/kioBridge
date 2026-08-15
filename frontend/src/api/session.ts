import type { MainTab, OrderSheet, PlaceType, Screen } from "@/domain/types";
import { 기본도움설정, 아는언어인가, 아는선호입력값인가, type 도움설정 } from "@/api/a11y";
import { 아는알레르기 } from "@/api/allergy";
import type { Account } from "@/api/account";

/**
 * 새로고침해도 이번 이용이 이어지도록.
 *
 * 예전에는 전부 메모리에만 있어서, 실수로 F5 를 누르거나 휴대폰이 탭을 잠깐 내렸다
 * 올리기만 해도 로그인이 풀리고 주문표가 사라지고 큰 글씨가 꺼졌다. 처음부터 다시
 * 하라는 뜻인데, 이 앱을 쓰는 사람에게 '처음부터 다시' 가 가장 어렵다.
 *
 * ── 저장소가 둘인 이유 ───────────────────────────────────────────────────────
 *
 *   localStorage      탭을 닫아도 남는다.   주문표만 여기 있다.
 *   sessionStorage    탭을 닫으면 사라진다. 나머지 전부.
 *
 * 예전에는 전부 sessionStorage 였다. "탭을 닫는 것이 곧 이용이 끝나는 것" 이라는
 * 이유를 여기 적어 두고, localStorage 로 옮기지 말라고 못을 박아 두었다.
 *
 * 그 전제가 틀렸다. 이 앱은 **자기 휴대폰에서 쓴다.** 탭을 닫는 것은 이용이
 * 끝나는 것이 아니라 잠깐 다른 것을 보는 것이고, 다음에 열었을 때 앞사람이
 * 아니라 같은 사람이다. 주문표는 그 사람이 시간을 들여 만든 것인데, 탭 하나
 * 닫혔다고 통째로 사라지면 이 앱을 쓸 이유가 없어진다 — 매번 처음부터 다시
 * 만들어야 한다면 키오스크 앞에서 직접 고르는 것과 다르지 않다.
 *
 * 그래서 주문표만 옮겼다. 나머지는 그대로 둔다. 특히 **동의는 절대 안 옮긴다** —
 * 앞선 동의가 다음에 그대로 이어지면 그건 동의가 아니고, 개인정보 화면도
 * "동의는 이번 이용에만 남고, 창을 닫으면 사라져요" 라고 말하고 있다.
 * 로그인도 안 남는다(토큰이 메모리뿐이라 되살려 봐야 못 쓴다).
 *
 * 이 변경은 계약에도 나타난다. canonical.ts 의 retentionPolicy 가
 * SESSION_ONLY 에서 UNTIL_USER_DELETES 로 바뀐 것이 같은 사실을 말한다.
 * 여기를 되돌리면 거기도 같이 되돌려야 한다.
 *
 * ── 담지 않는 것 ─────────────────────────────────────────────────────────────
 *
 *   비밀번호            어디에도 남기지 않는다. 목의 계정 Map 도 메모리에 그대로 둔다.
 *   pairingId·만료      키오스크를 움직일 수 있는 권한이다. 디스크에 적어 두고 되살리면
 *                      QR 한 번이 영구 실행 권한이 된다(P0-2). 다시 찍어야 한다.
 *   orderSheet·승인     승인은 살아 있는 연결 위에서만 뜻이 있다(P0-4).
 *   연동 기록           서버와 오간 본문이 들어 있다. 확인용 화면이라 메모리로 충분하다.
 *
 * planId 만 예외다. 이유는 아래 `planId` 주석에 적었다.
 */

/** 판을 바꾸면 이 번호를 올린다. 예전 판은 읽지 않고 버린다. */
const KEY = "kb.session.v3";

/**
 * 창을 닫아도 남는 자리. 주문표만 들어간다.
 *
 * 판 번호를 KEY 와 따로 매긴다. 둘이 담는 것이 다르고 수명도 달라서, 한쪽
 * 모양을 바꿨다고 다른 쪽까지 버리게 만들 이유가 없다.
 */
const 주문표KEY = "kb.sheets.v1";

/**
 * 새로고침 뒤에도 그대로 보여 줄 수 있는 화면.
 *
 * 여기 없는 화면은 되살리지 않는다. 되살릴 근거(연결·인증 절차)가 같이
 * 남아 있지 않아서, 화면만 띄우면 빈 껍데기가 된다.
 */
const 이어볼수있는화면 = new Set<Screen>([
  "welcome", "name", "setup", "greeting", "sheet", "saved", "a11y", "privacy", "execution",
]);

/**
 * 되살릴 수 없는 화면을 어디로 보낼지.
 *
 * 그냥 welcome 으로 몰면 로그인한 사람도 처음 화면으로 튕긴다. 무엇을 하다 말았는지에
 * 따라 갈 곳이 다르다.
 */
const 대신갈곳: Partial<Record<Screen, Screen>> = {
  // 아이디도 비밀번호도 남기지 않는다. 중간에 끊긴 절차라 처음으로 돌린다.
  login: "welcome",
  signup: "welcome",
  // 연결을 되살리지 않으므로 확인 카드는 보여 줄 내용이 없다. 목록으로 보낸다.
  "order-confirm": "saved",
  /*
   * 물어보던 주문표가 메모리에만 있었다. 새로고침하면 그 주문표가 없어서 물어볼
   * 것도 없다 — 목록으로 보낸다. 빈 화면에 '저장할까요' 만 띄우면 무엇을 저장하는
   * 건지 알 수 없다.
   */
  "save-choice": "saved",
  // 말로 채우던 값도 메모리에만 있었다. 빈 채로 되살리느니 목록에서 다시 시작한다.
  "voice-sheet": "saved",
};

const 장소들: PlaceType[] = ["카페", "음식점", "병원", "관공서", null];
const 탭들: MainTab[] = ["qr", "menu", "account"];

export interface 이어쓸것 {
  screen: Screen;
  tab: MainTab;
  /** 부르는 호칭. 화면에 띄우는 데만 쓰고 이 기기 밖으로 나가지 않는다. */
  name: string;
  /** 로그인한 계정. 토큰이 아니라 식별자다(account.ts 의 1번 주석). */
  account: Account | null;
  sheets: OrderSheet[];
  /** 서버에서 불러온 주문표의 id. 로그아웃할 때 이것만 목록에서 뺀다. */
  fromServer: string[];
  /** 도움 설정. 킷의 일곱 칸 + 소리 안내. */
  a11y: 도움설정;
  /**
   * 개인정보 수집·이용에 동의했는가. 안 했으면 앱에 들어갈 수 없다.
   *
   * 이번 이용에만 남는다. 창을 닫으면 사라져서 다음 사람은 다시 동의해야 한다 —
   * 앞사람의 동의가 다음 사람에게 이어지면 그건 동의가 아니다.
   */
  consent: boolean;
  /**
   * 이 사람이 늘 피해야 하는 것. 주문표의 알레르기와 합쳐서 서버로 나간다.
   *
   * 이번 이용에만 남는다. 알레르기는 그 사람에 대한 사실이라 오래 붙들고 싶어지지만,
   * 틀렸을 때의 대가가 다른 값과 다르다 — 화면에는 걸러지는 것처럼 보이는데
   * 실제로는 앞사람 것으로 걸러진다. 그래서 **주문표를 창 너머로 남기게 된
   * 뒤에도 이 값은 안 남긴다.** 로그인한 사람의 알레르기를 서버에 두는 것은
   * 별개의 일이다(feat/account-preferences) — 그건 누구 것인지가 분명하다.
   */
  allergies: string[];
  /**
   * 이번 이용의 가격 한도(원). 안 정했으면 null 이다.
   *
   * 오래 붙들 값이 아니라 "오늘은 얼마까지" 라서 이번 이용에만 둔다. 다만 새로고침
   * 한 번에 풀리면 안 된다 — 한도를 넘는 메뉴는 후보에서 빠지므로, 조용히 풀리면
   * 아까 안 보이던 메뉴가 갑자기 보이고 사용자는 이유를 알 수 없다.
   */
  budget: number | null;
  /**
   * 이번 이용에서 말로 채운 적이 있나.
   *
   * 계약의 preferredInput 으로 나가는 값이라(inputsource.ts) 새로고침에 풀리면
   * 안 된다. 말로 넣은 사람이 새로고침 한 번에 "손으로 넣는 사람" 이 되어
   * 키오스크에 전해진다.
   */
  voiceUsed: boolean;
  /**
   * 실행 중인 계획.
   *
   * 연결(pairingId)은 안 남기는데 이것만 남기는 이유는, 이 값으로 하는 일이
   * 읽기뿐이라서다. getPlanStatus 는 GET 이고, 계획을 새로 만들거나 실행하지
   * 않는다 — 그건 승인 버튼에서만 일어난다(P0-4). 되살린 값으로는 새 승인도
   * 못 한다. 연결이 없기 때문이다.
   *
   * 안 남기면 더 나쁘다. 키오스크는 계속 움직이는데 앱만 목록 화면으로 돌아가서,
   * 사용자는 자기 주문이 어떻게 됐는지 볼 방법이 없어진다. 지켜보라고 만든
   * 화면인데 지켜볼 수 없게 되는 것이다.
   */
  planId: string | null;
}

/**
 * 쓸 수 있는 저장소인지 실제로 써 보고 판단한다.
 *
 * Safari 사생활 모드는 sessionStorage 객체를 주고도 setItem 에서 던진다.
 * 있는지만 보면 통과하고 쓸 때 터진다. 저장은 있으면 좋은 것이지 없으면
 * 앱이 멈춰야 하는 것이 아니므로, 안 되면 조용히 없는 셈 친다.
 */
const 써보기 = (고르기: () => Storage | undefined, 이름: string): Storage | null => {
  try {
    const s = 고르기();
    // 브라우저가 아닌 데서 돌면 아예 없다. 없는 것은 못 쓰는 것과 같게 다룬다.
    if (!s) return null;
    const 시험 = `${이름}::probe`;
    s.setItem(시험, "1");
    s.removeItem(시험);
    return s;
  } catch {
    return null;
  }
};

/** 이번 방문에만 남는 자리. */
const 이번저장소 = () => 써보기(() => globalThis.sessionStorage, KEY);
/** 창을 닫아도 남는 자리. 주문표만. */
const 오래저장소 = () => 써보기(() => globalThis.localStorage, 주문표KEY);

/*
 * 자리별로 따로 지운다.
 *
 * 나눠 둔 이유는 하나다 — 한쪽이 깨졌을 때 **그 자리만** 지우기 위해서다.
 * 둘 다 지우는 것은 '이 기기에서 정보 지우기' 처럼 정말로 전부 지우겠다는
 * 자리에서만 한다(아래 비우기).
 */
const 이번지우기 = () => {
  try {
    globalThis.sessionStorage?.removeItem(KEY);
  } catch {
    /* 못 지웠으면 어차피 쓴 적도 없다. */
  }
};
const 오래지우기 = () => {
  try {
    globalThis.localStorage?.removeItem(주문표KEY);
  } catch {
    /* 위와 같다. */
  }
};

/**
 * 적어 둔 것을 객체로 읽는다.
 *
 * '없다' 와 '깨졌다' 를 나눠 돌려준다. 없는 것은 첫 방문이라 그냥 넘어가면
 * 되지만, 깨진 것은 남겨 두면 새로고침마다 또 터진다 — 부르는 쪽이 지운다.
 */
const 날것읽기 = (s: Storage | null, key: string): Record<string, unknown> | null | "깨짐" => {
  if (!s) return null;
  let v: unknown;
  try {
    const 글 = s.getItem(key);
    if (!글) return null;
    v = JSON.parse(글);
  } catch {
    return "깨짐";
  }
  if (typeof v !== "object" || v === null) return "깨짐";
  return v as Record<string, unknown>;
};

const 글자인가 = (v: unknown): v is string => typeof v === "string";

/**
 * 저장된 주문표가 우리가 아는 모양인지 본다.
 *
 * 저장소는 사용자가 개발자 도구로 고칠 수 있다. 고친 값을 그대로 믿으면
 * 화면이 알 수 없는 것을 그리거나, P0-1 이 금지한 상품 ID 같은 것이 주문표에
 * 섞여 들어온다. 우리가 아는 칸만 골라 새 객체를 만든다 — 모르는 칸은 버린다.
 *
 * 주문표가 창을 닫아도 남게 되면서 이 검사가 더 오래 살아 있는 값을 본다.
 * 한 번 손댄 값이 그 뒤로 계속 읽히므로, 걸러 내는 자리가 여기 하나여야 한다.
 */
const 주문표읽기 = (v: unknown): OrderSheet | null => {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!글자인가(o.id) || o.id === "") return null;
  if (!글자인가(o.menuName)) return null;
  if (!장소들.includes(o.place as PlaceType)) return null;
  if (!글자인가(o.memo)) return null;
  if (typeof o.selections !== "object" || o.selections === null) return null;
  const selections: Record<string, string[]> = {};
  for (const [축, 값] of Object.entries(o.selections as Record<string, unknown>)) {
    if (!Array.isArray(값) || !값.every(글자인가)) return null;
    selections[축] = [...(값 as string[])];
  }
  return { id: o.id, menuName: o.menuName, place: o.place as PlaceType, selections, memo: o.memo };
};

const 계정읽기 = (v: unknown): Account | null => {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  // userId 는 경로에 들어가는 값이다. 정수가 아니면 요청 자체를 만들지 않는다.
  if (typeof o.userId !== "number" || !Number.isInteger(o.userId) || o.userId <= 0) return null;
  if (!글자인가(o.loginId) || o.loginId === "") return null;
  return { userId: o.userId, loginId: o.loginId };
};

/** 여덟 칸을 하나씩 본다. boolean 이 아닌 칸은 기본값으로 둔다. */
/**
 * 화면에서 뺀 도움 항목.
 *
 * 켜도 이 앱은 아무것도 안 하고, 이번 환경(chicken-store)의 결과도 달라지지 않는다.
 * **받는 쪽이 없어서가 아니라, 이번 환경이 안 쓰기 때문이다** — 킷의
 * simulation-driver 는 두 값을 uiState.accessibilityMode 로 받지만, chicken-store
 * 환경 데이터(candidates·option-groups·screens·transitions)에는 이 값을 보는 곳이
 * 없다(킷 5.1.6 확인). **hospital 은 다르다**: environments/hospital/candidates.json
 * 의 supports 에 hearingSupport 를 가진 후보가 있어서, 병원 환경까지 내보내게 되면
 * 화면에 두 스위치를 되살리고 이 목록에서 빼야 한다.
 *
 * 화면 쪽은 '키오스크에 전해 드려요' 무리를 통째로 뺐다(App.tsx). 빈 무리 위에
 * 제목만 남아 있었기 때문이다. 화면이 다시 묻기 시작하면 여기서도 빼야 한다 —
 * 안 빼면 되살린 값이 여기서 도로 false 가 된다.
 */
const 이제안묻는칸 = ["visualGuidance", "hearingSupport"] as const;

const 접근성읽기 = (v: unknown): 도움설정 => {
  const o = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  const 값 = { ...기본도움설정 };
  for (const 칸 of Object.keys(기본도움설정) as (keyof 도움설정)[]) {
    if (칸 !== "language" && 칸 !== "preferredInputHint" && typeof o[칸] === "boolean") 값[칸] = o[칸];
  }
  // 언어만 boolean 이 아니다. 아는 값일 때만 받는다 — 손대서 아무 문자열이나
  // 넣어 두면 서버의 BCP 47 검사에 걸려 주문 자체가 안 된다.
  if (아는언어인가(o.language)) 값.language = o.language;
  // preferredInputHint 도 boolean 이 아니다 — 같은 이유로 아는 값일 때만 받는다.
  if (아는선호입력값인가(o.preferredInputHint)) 값.preferredInputHint = o.preferredInputHint;
  /*
   * 이제 안 묻는 칸은 되살리지 않는다.
   *
   * '그림 안내' 와 '소리 대신 화면' 을 화면에서 뺐다(이번 키오스크가 둘 다 안 한다).
   * 그런데 그 전에 켜 둔 사람의 저장소에는 true 가 남아 있다. 그대로 되살리면 화면
   * 어디에도 없는 값이 계약 payload 에 실려 나가고, **끌 방법이 없다.** 사용자가
   * 고르지도 않은 조건을 우리가 대신 말하는 셈이다.
   *
   * 계약의 일곱 칸은 그대로 나간다(canonical.ts 의 일곱칸만). 안 묻는 칸은 false 다.
   * 다시 묻게 되면 이 목록에서 빼면 된다.
   */
  for (const 칸 of 이제안묻는칸) 값[칸] = false;
  return 값;
};

/**
 * 이 사람에 대해 남길 것이 하나라도 있는가.
 *
 * screen·tab 은 세지 않는다. 그 둘만 남은 것은 '아무것도 안 한 사람이 어느 화면에
 * 있었다' 는 뜻이라, 다음에 되살릴 값어치가 없다.
 */
const 남길것이있나 = (v: 이어쓸것): boolean =>
  v.account !== null
  || v.name !== ""
  || v.sheets.length > 0
  || v.planId !== null
  || v.budget !== null
  || v.voiceUsed
  || v.consent
  || v.allergies.length > 0
  || 도움설정을건드렸나(v.a11y);

/**
 * 도움 설정을 하나라도 기본값에서 바꿨는가.
 *
 * Object.values(...).some(Boolean) 로 훑던 것을 칸별로 본다. language 가 들어오면서
 * 그 방식이 깨졌다 — 기본값 "ko-KR" 이 truthy 라, 아무것도 안 건드린 사람도
 * '남길 것이 있다' 가 되어 빈 이용이 전부 저장됐다.
 *
 * 켠 것과 고른 것을 나눠 본다. 켜는 값은 true 인지, 고르는 값은 기본과 다른지.
 */
const 도움설정을건드렸나 = (a: 도움설정): boolean =>
  (Object.keys(기본도움설정) as (keyof 도움설정)[]).some((칸) =>
    칸 === "language" ? a.language !== 기본도움설정.language : a[칸] === true);

export const 이어쓰기 = {
  /**
   * 저장해 둔 이용을 읽는다. 없거나 모양이 다르면 null 이다.
   *
   * 버리는 기준이 칸마다 다르다.
   *
   * **주문표가 이상하면 통째로 버린다.** 반쯤 살린 주문표가 가장 다루기 어렵다 —
   * 조건 하나가 조용히 빠진 주문표를 사용자는 화면만 보고 알아챌 수 없고,
   * 그대로 승인하면 안 걸러졌어야 할 것이 걸러지거나 그 반대가 된다.
   *
   * **나머지 칸은 그 칸만 안전한 쪽으로 되돌린다.** 다들 "안 정한 상태" 라는
   * 정직한 기본값이 있다 — 게스트, 동의 안 함, 한도 없음, 알레르기 없음,
   * 처음 화면. 이상한 값 하나 때문에 멀쩡한 주문표까지 날리는 것보다 낫다.
   * (동의처럼 있는 쪽이 위험한 값은 기본이 '안 함' 이라 손대도 얻을 게 없다.)
   */
  읽기(): 이어쓸것 | null {
    const 이번날것 = 날것읽기(이번저장소(), KEY);
    const 오래날것 = 날것읽기(오래저장소(), 주문표KEY);

    /*
     * 깨진 쪽만 지운다.
     *
     * 처음에는 한쪽이라도 깨지면 비우기() 로 둘 다 지웠다. 저장소가 하나일 때는
     * 그게 맞았지만, 나누고 나서는 **이 변경이 지키려던 주문표를 잃는 길**이
     * 된다 — 이번 방문 자리(KEY)만 손상돼도 멀쩡한 주문표가 사용자가 지운 적도
     * 없이 사라진다. 판 번호를 올리거나 누가 개발자 도구로 한 줄 건드리면 바로
     * 그렇게 된다.
     *
     * 깨진 것을 남겨 두면 새로고침마다 또 터지므로 지우기는 한다. 다만 지우는
     * 것은 깨진 그 자리뿐이고, 멀쩡한 쪽은 그대로 읽어 이어 쓴다.
     */
    if (이번날것 === "깨짐") 이번지우기();
    if (오래날것 === "깨짐") 오래지우기();
    const 이번 = 이번날것 === "깨짐" ? null : 이번날것;
    const 오래 = 오래날것 === "깨짐" ? null : 오래날것;

    if (!이번 && !오래) return null;
    const o = 이번 ?? {};

    /*
     * 주문표를 옛 자리에서 한 번 옮긴다.
     *
     * 이 변경 전에 쓰던 사람의 주문표는 sessionStorage 에 들어 있다. 새 자리만
     * 보면 그 사람들은 만들어 둔 것을 통째로 잃는다 — 옮기는 김에 잃게 만드는
     * 것은 이 변경이 없애려던 바로 그 일이다.
     *
     * 새 자리가 비어 있을 때만 옛 자리를 본다. 옮기고 나면 아래에서 쓰기() 를
     * 한 번 불러 옛 자리를 비우므로, 이 길은 사람마다 한 번만 지나간다.
     */
    const 옮기는중 = 오래 === null;
    const 주문표날것 = 오래 ? 오래.sheets : o.sheets;

    const account = 계정읽기(o.account);
    const 읽은주문표: OrderSheet[] = [];
    if (Array.isArray(주문표날것)) {
      for (const 하나 of 주문표날것) {
        const p = 주문표읽기(하나);
        if (!p) { this.비우기(); return null; }
        읽은주문표.push(p);
      }
    }
    const 읽은id = new Set(읽은주문표.map((p) => p.id));
    const 서버것날것 = 오래 ? 오래.fromServer : o.fromServer;
    const 서버에서온것 = new Set(
      Array.isArray(서버것날것)
        // 목록에 없는 id 는 버린다. 남겨 두면 로그아웃이 있지도 않은 것을 빼려 든다.
        ? 서버것날것.filter((x): x is string => 글자인가(x) && 읽은id.has(x))
        : [],
    );

    /*
     * 로그인해서 불러왔던 주문표는 로그인이 끊기면 같이 사라진다.
     *
     * 주문표는 이제 창을 닫아도 남지만 로그인은 안 남는다. 그대로 두면 다음에
     * 이 기기를 열었을 때, 로그아웃된 화면에 서버 계정에서 받아 온 주문표가
     * 그대로 보인다 — 지울 방법도 마땅치 않다. '이 기기에서 정보 지우기' 는
     * 계정 화면에 있는데 그 화면은 로그인한 사람의 것이기 때문이다.
     *
     * 잃는 것은 없다. 서버에서 온 것은 서버에 있고, 다시 로그인하면 다시 온다.
     */
    const sheets = account ? 읽은주문표 : 읽은주문표.filter((p) => !서버에서온것.has(p.id));
    const fromServer = account ? [...서버에서온것] : [];

    const 적힌화면 = 글자인가(o.screen) ? (o.screen as Screen) : "welcome";
    const planId = 글자인가(o.planId) && o.planId !== "" ? o.planId : null;
    // 계획이 없으면 실행 화면을 되살릴 수 없다. 띄워 봐야 물어볼 곳이 없다.
    const 실행못함 = 적힌화면 === "execution" && !planId;
    /*
     * 대신갈곳 은 객체 리터럴이라 Object.prototype 을 물려받는다. 저장소에
     * screen: "constructor" 가 적혀 있으면 대신갈곳["constructor"] 가 Object
     * 생성자 함수를 돌려주고, 그 함수가 truthy 라 ?? 를 그냥 통과한다.
     * screen 에 함수가 담기면 어느 화면 분기도 안 맞아 빈 화면이 뜨고,
     * 그 값이 다시 저장돼서 새로고침해도 계속 빈 화면이다.
     *
     * 우리가 직접 적어 둔 칸일 때만 본다. 사용자가 개발자 도구로 고칠 수 있는
     * 값을 키로 쓰는 조회라 이 검사가 필요하다.
     */
    const 대신 = Object.hasOwn(대신갈곳, 적힌화면) ? 대신갈곳[적힌화면] : undefined;
    const screen: Screen = !실행못함 && 이어볼수있는화면.has(적힌화면)
      ? 적힌화면
      : (대신 ?? (실행못함 ? "saved" : "welcome"));

    const 값: 이어쓸것 = {
      screen,
      tab: 탭들.includes(o.tab as MainTab) ? (o.tab as MainTab) : "menu",
      name: 글자인가(o.name) ? o.name : "",
      account,
      sheets,
      fromServer,
      a11y: 접근성읽기(o.a11y),
      // boolean 이 아니면 동의하지 않은 것으로 본다. 손댄 값으로 동의를 만들지 않는다.
      consent: o.consent === true,
      // 아는 여섯만 받는다. 모르는 값이 섞이면 서버가 UNKNOWN 으로 읽고 주문을 막는다.
      allergies: Array.isArray(o.allergies) ? o.allergies.filter(아는알레르기) : [],
      // 계약이 minimum: 0 인 number 다. 양의 정수가 아니면 안 정한 것으로 본다 —
      // 손대서 음수를 넣어 두면 서버가 400 으로 되돌려서 주문 자체가 안 된다.
      budget: typeof o.budget === "number" && Number.isInteger(o.budget) && o.budget > 0
        ? o.budget : null,
      // boolean 이 아니면 안 쓴 것으로 본다. 손댄 값으로 입력 방식을 만들지 않는다.
      voiceUsed: o.voiceUsed === true,
      // 실행 화면으로 돌아가지 못하면 계획도 들고 있을 이유가 없다.
      planId: screen === "execution" ? planId : null,
    };
    // 옛 자리에서 가져온 주문표를 새 자리에 적고, 옛 자리를 비운다.
    // 쓰기() 가 두 저장소를 각자 다시 쓰므로 여기서 따로 지울 것이 없다.
    if (옮기는중) this.쓰기(값);
    return 값;
  },

  /**
   * 이번 이용을 적어 둔다.
   *
   * 남길 것이 하나도 없으면 아예 지운다. '이 기기에서 정보 지우기' 를 누른 직후에도
   * 이 함수가 한 번 더 불리는데, 그때 빈 껍데기를 새로 써 두면 화면은 "모두 지워요"
   * 라고 말해 놓고 저장소에는 우리가 쓴 항목이 남는다. 안에 아무것도 없더라도
   * 지웠다고 한 뒤에 다시 쓰는 것은 앞뒤가 안 맞는다.
   *
   * 실패해도 던지지 않는다. 저장 공간이 꽉 찼다고 주문이 멈추면 안 된다 —
   * 이어 쓰기는 편의지 이 앱이 하는 일이 아니다.
   */
  쓰기(값: 이어쓸것): void {
    /*
     * '이번만 쓰기' 로 만든 주문표는 적지 않는다.
     *
     * 로그인하지 않은 사람의 기본값이다(types.ts 의 임시). 남기지 않겠다고 고른
     * 것을 적어 두면 그 선택이 거짓이 된다 — 화면에서는 지웠다고 하고 저장소에는
     * 남는 상태가 제일 나쁘다.
     *
     * 이 걸러 내기가 전보다 더 중요해졌다. 전에는 잘못 남겨도 탭을 닫으면
     * 사라졌지만, 이제 주문표는 창을 닫아도 남는다.
     */
    const 남길주문표 = 값.sheets.filter((p) => p.임시 !== true);
    const 남길id = new Set(남길주문표.map((p) => p.id));

    // ① 창을 닫아도 남는 자리 — 주문표만.
    const 오래 = 오래저장소();
    if (오래) {
      try {
        if (남길주문표.length === 0) 오래.removeItem(주문표KEY);
        else {
          오래.setItem(주문표KEY, JSON.stringify({
            sheets: 남길주문표,
            fromServer: 값.fromServer.filter((id) => 남길id.has(id)),
          }));
        }
      } catch {
        /* 꽉 찼거나 막혔다. 이번 이용은 메모리로만 간다. */
      }
    }

    /*
     * ② 이번 방문에만 남는 자리 — 나머지.
     *
     * 주문표는 여기 적지 않는다. 적으면 두 벌이 생기고, 다음에 열었을 때 어느
     * 쪽이 맞는지 알 수 없다. 칸을 하나씩 적어 두는 것은 그 실수를 막기 위해서다 —
     * `...남길값` 으로 퍼뜨리면 나중에 칸이 하나 늘 때 조용히 따라 들어온다.
     */
    const s = 이번저장소();
    if (!s) return;
    // 남길 것이 있나는 주문표까지 세서 본다. 주문표만 있는 사람도 어느 화면에
    // 있었는지는 되살릴 값어치가 있다.
    if (!남길것이있나({ ...값, sheets: 남길주문표 })) { this.비우기(); return; }
    try {
      s.setItem(KEY, JSON.stringify({
        screen: 값.screen,
        tab: 값.tab,
        name: 값.name,
        account: 값.account,
        a11y: 값.a11y,
        consent: 값.consent,
        allergies: 값.allergies,
        budget: 값.budget,
        voiceUsed: 값.voiceUsed,
        planId: 값.planId,
      }));
    } catch {
      /* 꽉 찼거나 막혔다. 이번 이용은 메모리로만 간다. */
    }
  },

  /**
   * 로그아웃·정보 지우기가 부른다. 화면이 "지웠어요" 라고 말한 것에 이것도 들어간다.
   *
   * 두 자리를 다 지운다. 한쪽만 지우면 '지웠어요' 를 본 사람의 주문표가 다음에
   * 창을 열었을 때 되살아난다 — 지웠다는 말이 거짓이 되는 자리다.
   */
  비우기(): void {
    이번지우기();
    오래지우기();
  },
};
