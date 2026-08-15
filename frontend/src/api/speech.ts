/**
 * 화면에 나온 안내를 소리로 읽어 준다.
 *
 * ── 왜 접근성 일곱 칸에 안 넣었나 ───────────────────────────────────────────
 *
 * 킷 계약의 `accessibility` 는 `additionalProperties: false` 이고 일곱 칸이 전부
 * required 다. 여덟 번째를 끼우면 제출이 스키마에서 막힌다.
 *
 * 대신 계약에 제자리가 따로 있다 — `interaction.preferredInput` 이다.
 *
 *   enum: TOUCH · VOICE · KEYBOARD · SWITCH · ASSISTED · MULTIMODAL
 *
 * 지금까지 "TOUCH" 로 박아 보내고 있었다. 소리로 듣기를 바라는 분이 켜면
 * "VOICE" 로 나간다. 로컬 백엔드로 직접 확인했다 — status VALID,
 * contractValidation.valid true.
 *
 * ── 이 앱이 원래 하던 약속과 어긋나지 않는다 ────────────────────────────────
 *
 * 접근성 화면은 "소리로만 알리는 것은 하나도 없어요" 라고 말한다. 그건 소리에만
 * 기대지 않는다는 뜻이고, 소리를 **더해 주는** 것은 그 약속과 다른 얘기다.
 * 화면 글은 그대로 두고 같은 내용을 소리로 한 번 더 읽는다.
 *
 * ── 되는지 먼저 보고 내민다 ─────────────────────────────────────────────────
 *
 * 브라우저에 speechSynthesis 가 없으면 스위치 자체를 안 보여 준다. 켰는데 아무
 * 소리도 안 나면 사용자는 앱이 고장 났다고 생각한다 — 이 앱은 못 하는 것을
 * 한다고 말하지 않는다.
 */

/**
 * 이 기기에 있는 목소리 중 더 자연스러운 것을 고른다. 없으면 null.
 *
 * 여태 아무것도 안 골라서 브라우저 기본이 나왔다. 윈도우·안드로이드의 한국어
 * 기본은 대개 오래된 합성음이라 말투가 딱딱하다 — 어르신께 읽어 드리는
 * 앱에서 그 소리로 안내가 나가면 듣기 힘들다는 말을 들었다.
 *
 * 이름으로 고른다. 표준이 정한 규칙은 아니지만, 실제 기기에서 신경망 목소리는
 * 이름에 Google · Natural · Neural · Siri 같은 말이 붙는다. 없으면 고르지
 * 않고 두어 브라우저 기본으로 간다 — 지금과 같아질 뿐 나빠지지 않는다.
 *
 * getVoices() 는 처음 몇 번 빈 배열을 준다(목록을 늦게 채우는 브라우저가 있다).
 * 그때도 그냥 null 이라 기본 목소리로 읽고, 다음 문장부터 좋은 목소리가 잡힌다.
 */
const 좋은이름 = /google|natural|neural|premium|enhanced|siri/i;
/*
 * 여자 목소리로 알려진 이름들.
 *
 * "하이톤 여자 목소리가 듣기 좋다" 는 말을 듣고 그쪽으로 맞춘다. 표준이 성별을
 * 알려 주지 않아서 이름으로 가릴 수밖에 없다 — 아래는 실제 기기에서 쓰이는
 * 한국어·영어 목소리 이름이다.
 *
 *   Heami   윈도우 한국어 기본 (이 프로젝트에서 실제로 확인한 목소리)
 *   Yuna    애플 한국어
 *   Sun-Hi  Azure 한국어 신경망
 *   Seoyeon AWS Polly 한국어
 *   Sora    삼성 한국어
 *
 * 이름으로 가리는 것이라 완벽하지 않다. 못 찾으면 아래에서 그냥 null 로 두고
 * 브라우저 기본으로 간다 — 지금과 같아질 뿐 나빠지지 않는다.
 */
const 여자이름 = /heami|yuna|sun-?hi|seoyeon|sora|jiwon|female|여성|zira|samantha|aria|jenny/i;

const 나은목소리 = (언어: string): SpeechSynthesisVoice | null => {
  try {
    const 목록 = globalThis.speechSynthesis?.getVoices?.() ?? [];
    // 언어가 먼저다. 한국어 문장을 영어 목소리로 읽으면 알아들을 수 없다.
    const 같은언어 = 목록.filter((v) => v.lang?.replace("_", "-").toLowerCase().startsWith(언어.slice(0, 2).toLowerCase()));
    if (같은언어.length === 0) return null;
    /*
     * 고르는 차례 — 여자 목소리를 성능보다 앞에 둔다.
     *
     * 사용자가 좋다고 한 것이 그 목소리라서다. 자연스러움은 그다음이다.
     */
    return 같은언어.find((v) => 여자이름.test(v.name) && 좋은이름.test(v.name))
      ?? 같은언어.find((v) => 여자이름.test(v.name))
      ?? 같은언어.find((v) => 좋은이름.test(v.name))
      ?? null;
  } catch {
    return null;
  }
};

/** 이 브라우저에서 소리 안내가 되는가. 화면이 스위치를 내밀지 말지 이걸로 정한다. */
export const 소리를낼수있나 = (): boolean => {
  try {
    return typeof globalThis.speechSynthesis?.speak === "function"
      && typeof globalThis.SpeechSynthesisUtterance === "function";
  } catch {
    return false;
  }
};

/**
 * 읽어 준다.
 *
 * `이어서` 가 아니면 읽던 것을 끊는다. 화면이 바뀌면 앞 화면 안내는 이미 지난
 * 얘기다. 쌓아 두면 세 화면을 지나온 뒤에도 첫 화면을 읽고 있고, 사용자는 지금
 * 어디인지 알 수 없게 된다.
 *
 * 반대로 **같은 화면에 새 내용이 붙었을 때는 끊지 않는다**(`이어서`). 제외 이유가
 * 늦게 도착했다고 읽던 후보 설명을 잘라 버리면, 듣는 사람은 문장 하나를 통째로
 * 잃는다. 그때는 뒤에 붙여 읽는다.
 *
 * 실패해도 던지지 않는다. 소리는 더해 주는 것이지 이 앱이 하는 일이 아니다.
 */
export const 읽어주기 = (
  글: string,
  { 언어 = "ko-KR", 이어서 = false }: { 언어?: string; 이어서?: boolean } = {},
): void => {
  const 말 = 글
    .replace(/\s+/g, " ")
    // 줄을 ". " 로 이어 붙이는데, 마침표로 끝나는 줄 뒤에서는 점이 둘이 된다.
    // ("...닫으면 처음으로 돌아가요.. 이 앱은") 버전 표기(1.0.0)는 점 사이에
    // 숫자가 있어 여기 안 걸린다.
    .replace(/\.\s*\./g, ".")
    .trim();
  if (!말 || !소리를낼수있나()) return;
  try {
    if (!이어서) globalThis.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(말);
    /*
     * 화면에 나온 글을 그대로 읽는 것이라, 목소리도 그 글의 언어여야 한다.
     *
     * 예전에는 늘 ko-KR 이었다. 그때는 화면이 언제나 한국어였기 때문이다. 지금은
     * 안내 언어를 영어로 두면 화면 글이 영어라, ko-KR 목소리에게 영어 문장을
     * 주면 알아들을 수 없는 소리가 난다. 반대도 마찬가지다.
     *
     * 그래서 부르는 쪽이 '지금 화면의 언어' 를 준다(a11y 의 language).
     */
    u.lang = 언어;
    // 이 기기에 더 자연스러운 목소리가 있으면 그걸 쓴다. 없으면 기본 그대로다.
    const 고른목소리 = 나은목소리(언어);
    if (고른목소리) u.voice = 고른목소리;
    // 기본 속도는 이 앱을 쓰는 분들에게 빠르다. 조금 늦춘다.
    u.rate = 0.95;
    // 기본 높이는 또박또박하지만 사무적으로 들린다. 아주 조금 올려 부드럽게.
    u.pitch = 1.05;
    globalThis.speechSynthesis.speak(u);
  } catch {
    /* 목소리가 없거나 브라우저가 막았다. 화면 글은 그대로 있다. */
  }
};

/**
 * 화면에서 읽어 줄 글을 줄 단위로 모은다.
 *
 * 눈으로 보이는 것만 모은다 — 안 보이는 것을 읽으면 화면과 소리가 어긋난다.
 * 빼는 것은 넷이다.
 *
 *   - `data-devlog`  개발용 연동 기록. 사용자에게 하는 말이 아니다.
 *   - `aria-hidden`  장식이라고 우리가 표시해 둔 것. 스크린리더도 안 읽는다.
 *   - `inert`        겹 아래에 덮인 화면. 스크린리더가 못 읽도록 막아 둔 자리다.
 *   - `data-소리생략` 읽을 값어치가 없는 자리(앱 이름·개발 막대·하단 탭).
 *                    소리 안내만 그 약속을 깨면 안 된다(#36 리뷰).
 *   - 자리를 차지하지 않는 것(getClientRects 가 빈 것). 접힌 목록·가려진 화면이다.
 *
 * `바뀌는것빼고` 를 켜면 `data-소리조용` 안쪽도 뺀다. 사용자가 적는 동안 따라
 * 바뀌는 글(가격 한도 안내)과 1초마다 바뀌는 글(남은 시간)이 거기 든다.
 * 화면에 처음 왔을 때는 읽어야 하지만 **바뀔 때마다 읽으면 안 된다** — 한 글자
 * 칠 때마다 "8원보다 비싼 메뉴는", "80원보다 비싼 메뉴는" 을 듣게 되고, 연결
 * 화면에서는 1초에 한 번씩 남은 시간을 듣는다.
 *
 * 줄 단위로 돌려주는 이유는, 같은 화면에서 **새로 붙은 줄만** 골라 읽기 위해서다.
 * 통째로 비교하면 글자 하나만 달라져도 화면 전체를 다시 읽는다.
 */
export const 화면글 = (뿌리: HTMLElement, { 바뀌는것빼고 = false } = {}): string[] => {
  const 줄: string[] = [];
  const 훑기 = document.createTreeWalker(뿌리, NodeFilter.SHOW_TEXT);
  for (let n = 훑기.nextNode(); n; n = 훑기.nextNode()) {
    const 말 = (n.nodeValue ?? "").replace(/\s+/g, " ").trim();
    if (!말) continue;
    const el = n.parentElement;
    if (!el) continue;
    if (el.closest("[data-devlog]")) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.closest("[inert]")) continue;
    /*
     * 읽을 값어치가 없는 자리. 앱 이름, 개발용 연동 막대, 화면마다 똑같은 하단 탭.
     *
     * 눈으로는 어디에 왔는지 알려 주는 표시지만, 귀로는 화면이 바뀔 때마다
     * "kio bridge ... QR 찍기 내 주문표 계정" 을 다시 듣게 된다. 매번 같은 말이라
     * 알려 주는 것이 없고, 정작 알아야 할 말이 그 사이에 묻힌다.
     */
    if (el.closest("[data-소리생략]")) continue;
    if (바뀌는것빼고 && el.closest("[data-소리조용]")) continue;
    if (el.getClientRects().length === 0) continue;
    줄.push(말);
  }
  return 줄;
};

/**
 * 읽고 있는 것이 다 끝날 때까지 기다린다.
 *
 * 다음 질문을 스스로 시작할 때 꼭 필요하다. 안 기다리면 마이크가 안내를 읽는
 * 도중에 열리고, 두 가지가 한꺼번에 어긋난다.
 *
 *   ① 듣기시작() 이 그만읽기() 를 부르므로 안내가 중간에서 잘린다. 화면을 못
 *      보는 분은 무엇을 묻는지 못 들은 채 답해야 한다.
 *   ② 자르지 않더라도 스피커 소리를 마이크가 그대로 주워듣는다. 그 소리가
 *      녹음에 실려 인식을 망친다(읽어주기 주석의 같은 얘기).
 *
 * 최대 기다릴 시간을 둔다. 읽기가 끝났는데 speaking 이 안 내려가는 브라우저가
 * 있고, 거기서 영원히 멈추면 사용자는 아무 일도 안 일어나는 화면을 본다.
 *
 * ── '아직 안 읽음' 과 '다 읽음' 은 겉보기가 같다 ────────────────────────────
 *
 * 둘 다 speaking·pending 이 false 다. 그래서 읽기가 걸리기 **전에** 물어보면
 * 곧바로 "다 읽었다" 고 답해 버린다 — 부르는 쪽은 마이크를 열고, 그 직후 안내
 * 읽기가 시작됐다가 듣기시작() 의 그만읽기() 에 잘린다. 화면을 못 보는 분은
 * 무엇을 묻는지 못 들은 채 답해야 한다.
 *
 * `시작기다림` 을 주면 그 동안은 접지 않는다. 한 번이라도 읽는 것을 본 뒤에는
 * 바로 끝난다 — 짧은 안내를 읽는 동안 헛되이 기다리지 않는다.
 */
export const 다읽을때까지 = (최대 = 8000, { 시작기다림 = 0 } = {}): Promise<void> =>
  new Promise((끝) => {
    if (!소리를낼수있나()) { 끝(); return; }
    const 시작 = Date.now();
    let 읽기를봤나 = false;
    let 시계: ReturnType<typeof setInterval>;
    const 보기 = () => {
      let 읽는중 = false;
      try {
        읽는중 = globalThis.speechSynthesis.speaking || globalThis.speechSynthesis.pending;
      } catch { /* 못 물어보면 안 읽는 것으로 본다 */ }
      if (읽는중) 읽기를봤나 = true;
      const 지난 = Date.now() - 시작;
      // 아직 시작도 안 했을 수 있다. 시작기다림 이 지나기 전에는 안 접는다.
      const 접어도되나 = 읽기를봤나 || 지난 >= 시작기다림;
      if ((!읽는중 && 접어도되나) || 지난 >= 최대) { clearInterval(시계); 끝(); }
    };
    시계 = setInterval(보기, 120);
    보기();
  });

/** 읽던 것을 멈춘다. 스위치를 끄거나 화면을 떠날 때 부른다. */
export const 그만읽기 = (): void => {
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    /* 읽고 있던 것이 없으면 할 일도 없다. */
  }
};

/*
 * 페이지를 떠나면 읽던 것도 끊는다.
 *
 * speechSynthesis 의 대기열은 **페이지가 아니라 브라우저에** 붙어 있다. 그래서
 * 탭을 닫거나 다른 곳으로 옮겨 가도, 넣어 둔 문장이 남아 있으면 계속 읽는다 —
 * 화면은 이미 없는데 소리만 나는 상태가 된다. 실제로 그랬다.
 *
 * 언제 끊나:
 *
 *   pagehide         탭을 닫거나 다른 주소로 갈 때. beforeunload 대신 이걸 쓴다 —
 *                    beforeunload 는 휴대폰에서 안 뜨는 일이 많고 bfcache 를 막는다.
 *   visibilitychange 다른 탭·다른 앱으로 넘어갈 때. 화면이 안 보이는데 그 화면을
 *                    읽고 있는 것은 안내가 아니라 소음이다.
 *
 * 돌아오면 다시 읽어 준다 — 화면이 새로 그려지면 App 의 감시가 새로 붙은 줄을
 * 읽는다. 끊어 두는 편이 안전하다: 끊긴 것은 다시 들을 수 있지만, 안 끊으면
 * 끄는 방법이 없다(그 탭이 이미 없다).
 */
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("pagehide", 그만읽기);
  globalThis.addEventListener("visibilitychange", () => {
    if (globalThis.document?.visibilityState === "hidden") 그만읽기();
  });
}
