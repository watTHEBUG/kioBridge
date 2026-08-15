/**
 * QR 페어링이 제대로 잠겨 있는지 서버에 직접 물어본다.
 *
 *   npm run check:pairing
 *
 * 배포한 것을 확인하려면 주소를 넘긴다:
 *   node tools/check-pairing.mjs https://kio-bridge.vercel.app
 *
 * ── 왜 이 도구가 있나 ───────────────────────────────────────────────────────
 *
 * 페어링의 핵심은 "브라우저가 진짜 세션 ID 를 모른다" 는 것이다(팀 #108). 그런데
 * 그게 지켜지는지는 **서버에 물어봐야만** 알 수 있다 — 코드를 아무리 봐도, 배포된
 * 서버가 옛 코드로 돌고 있으면 소용이 없다.
 *
 * 실제로 그런 일이 있었다. 2026-08-14 에 프론트는 새 계약으로 올라갔는데 EC2 는
 * 옛 코드였고, 화면을 열어 남은 시간이 "NaN:NaN" 으로 뜨는 것을 보고서야 알았다.
 * 이 도구가 있었으면 한 줄로 알았을 일이다.
 *
 * ── 모르는 것을 안다고 하지 않는다 ──────────────────────────────────────────
 *
 * 결과는 셋이다. ✓ 통과 · ✗ 뚫림 · **⚠ 확인 불가**.
 *
 * 세 번째가 있는 이유는, 서버가 답을 못 준 것과 서버가 거절한 것이 전혀 다른
 * 얘기이기 때문이다. BFF 는 연결 실패를 502, 시간 초과를 504 로 바꾸고 백엔드
 * 상태는 그대로 넘긴다(api/bff.ts). 이것들을 "막혔다" 로 세면, 정작 확인해야 할
 * 때 초록불이 뜬다 — 확인 도구가 그러면 없느니만 못하다.
 *
 * ⚠ 도 초록이 아니다. 하나라도 있으면 종료코드는 1 이다.
 *
 * ── 여기서 확인하지 않는 것 ─────────────────────────────────────────────────
 *
 * "한 번 쓰면 끝난다"(일회용) 는 뺐다. 확인하려면 승인을 실제로 한 번 해야 하고,
 * 그러면 시뮬레이터 키오스크가 진짜로 움직인다 — 확인용 도구가 부작용을 만들면
 * 안 된다. 그 항목은 테스트로 잠가 뒀다:
 *
 *   src/api/backend.test.ts
 *     "한 번 쓴 연결로 다시 승인하면 QR 부터 다시 찍으라고 한다"
 *     "정보 지우기 뒤에는 다 쓴 연결 목록도 남지 않는다"
 *
 * 그래서 이 도구는 **서버에 물어봐야만 아는 것**만 본다.
 */

const 기준 = (process.argv[2] ?? "http://localhost:5199").replace(/\/$/, "");
const BFF = `${기준}/api/bff`;

/** 한 번 요청에 이만큼 기다린다. 배포본은 처음 깨어날 때가 있어 넉넉히 둔다. */
const 기다릴시간 = 20_000;

/**
 * 연결 수명이 이보다 길면 서버가 준 값이 아니라고 본다.
 *
 * 지금 서버 정책은 5분이다. 여기서 20분을 쓰는 것은 정책이 조금 바뀌어도 이
 * 도구가 헛되이 빨간불을 내지 않게 여유를 둔 것이다. 상한을 두는 이유는 따로
 * 있다 — expiresAt 이 엉뚱한 값(며칠 뒤, 혹은 클라이언트 시계에서 온 값)일 때도
 * 걸러야 하기 때문이다. 서버 정책이 20분을 넘기게 바뀌면 이 값도 같이 올린다.
 */
const 만료상한 = 20 * 60 * 1000;

const 초록 = (s) => `\x1b[32m${s}\x1b[0m`;
const 빨강 = (s) => `\x1b[31m${s}\x1b[0m`;
const 노랑 = (s) => `\x1b[33m${s}\x1b[0m`;
const 회색 = (s) => `\x1b[90m${s}\x1b[0m`;

let 뚫림 = 0;
let 확인불가 = 0;

/** 상태는 "통과" · "실패" · "확인불가" 셋 중 하나다. */
const 알림 = (이름, 상태, 자세히) => {
  if (상태 === "실패") 뚫림++;
  if (상태 === "확인불가") 확인불가++;
  const 표 = 상태 === "통과" ? 초록("✓") : 상태 === "확인불가" ? 노랑("⚠") : 빨강("✗");
  console.log(`${표} ${이름}`);
  if (자세히) console.log(`    ${회색(자세히)}`);
};

/**
 * BFF 를 거쳐 한 번 요청한다.
 *
 * status 0 은 "답을 아예 못 받았다" 는 뜻이다(끊겼거나 시간이 다 됐다). 부르는
 * 쪽은 이것을 막혔다고 읽으면 안 된다 — 위의 '모르는 것을 안다고 하지 않는다'.
 */
async function 요청(경로, 본문) {
  const 시계 = new AbortController();
  const 타이머 = setTimeout(() => 시계.abort(), 기다릴시간);
  try {
    const res = await fetch(`${BFF}/${경로}`, {
      method: "POST",
      signal: 시계.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(본문),
    });
    const t = await res.text();
    // 본문이 JSON 이 아니어도 status 는 살려서 넘긴다. 상태가 곧 판정 근거다.
    let 몸 = null;
    try { 몸 = t ? JSON.parse(t) : {}; } catch { /* 몸은 null 로 둔다 */ }
    return { status: res.status, body: 몸 };
  } catch (e) {
    const 시간초과 = e.name === "AbortError";
    return {
      status: 0, body: null,
      오류: 시간초과 ? `${기다릴시간 / 1000}초 안에 응답이 없습니다` : e.message,
    };
  } finally {
    clearTimeout(타이머);
  }
}

const 연결하나 = () => 요청("internal/simulation/session", { environmentId: "chicken-store", claimCode: "kb_check" });

console.log(`\n대상: ${기준}\n`);

const A = await 연결하나();
if (A.status !== 200 || !A.body) {
  const 왜 = A.오류 ?? (A.body === null && A.status === 200 ? "응답이 JSON 이 아닙니다" : `HTTP ${A.status}`);
  console.log(빨강(`✗ 연결을 못 받았습니다 — ${왜}`));
  console.log(회색("\n서버가 떠 있는지, 주소가 맞는지 먼저 보세요.\n"));
  process.exit(1);
}

// ① 진짜 세션 ID 가 브라우저로 나오면 안 된다.
//    이것 하나만 알면 누구나 남의 주문을 실행할 수 있었다 — 그 구멍을 닫은 것이 #108 이다.
{
  const 칸 = Object.keys(A.body);
  const 샜나 = "sessionId" in A.body || JSON.stringify(A.body).includes("SIM-");
  const 모양맞나 = typeof A.body.pairingId === "string";
  알림(
    "진짜 세션 ID 를 브라우저로 안 준다",
    샜나 ? "실패" : 모양맞나 ? "통과" : "확인불가",
    샜나 ? `응답에 sessionId 가 들어 있습니다: ${JSON.stringify(A.body).slice(0, 120)}`
      : 모양맞나 ? `응답 칸: ${칸.join(" · ")}`
        : `pairingId 가 없어서 무엇이 오는지 모르겠습니다. 응답 칸: ${칸.join(" · ") || "(없음)"}`,
  );
}

// ② 찍을 때마다 다른 연결이어야 한다.
//    같으면 뒷사람이 앞사람 자리에 들어간다.
{
  const B = await 연결하나();
  const 못물어봄 = B.status === 0 || B.status >= 500;
  const 다른가 = B.status === 200 && typeof B.body?.pairingId === "string" && B.body.pairingId !== A.body.pairingId;
  알림(
    "두 번 찍으면 서로 다른 연결이 나온다",
    못물어봄 ? "확인불가" : 다른가 ? "통과" : "실패",
    못물어봄 ? `두 번째 요청이 ${B.오류 ?? `HTTP ${B.status}`} — 비교를 못 했습니다`
      : 다른가 ? `A: ${A.body.pairingId.slice(0, 10)}…  B: ${B.body.pairingId.slice(0, 10)}…`
        : "같은 pairingId 가 두 번 나왔습니다 — 뒷사람이 앞사람 연결을 물려받습니다",
  );
}

// ③ pairingId 로 키오스크를 직접 못 움직여야 한다.
//    이 값이 곧 세션 ID 라면 감싼 뜻이 없다.
{
  const { status, 오류 } = await 요청(`api/v1/sessions/${encodeURIComponent(A.body.pairingId)}/execute`, {});
  /*
   * 판정은 서버가 **대답을 했는가** 부터 갈린다.
   *
   *   2xx      실행이 그대로 됐다 — pairingId 가 진짜 세션 ID 다.
   *   4xx      서버가 알아듣고 거절했다 — 막힌 것이 확인됐다.
   *   0 · 5xx  답을 못 받았다. BFF 가 연결 실패를 502, 시간 초과를 504 로 바꾸고
   *            백엔드 500 은 그대로 넘긴다. 이걸 '막혔다' 로 세면 서버가 앓는
   *            동안 초록불이 뜬다 — 확인이 가장 필요한 때에.
   */
  const 뚫렸나 = status >= 200 && status < 300;
  const 막혔나 = status >= 400 && status < 500;
  알림(
    "pairingId 로 키오스크를 직접 못 움직인다",
    뚫렸나 ? "실패" : 막혔나 ? "통과" : "확인불가",
    뚫렸나 ? `실행이 그대로 됐습니다(HTTP ${status}) — pairingId 가 진짜 세션 ID 입니다`
      : 막혔나 ? `POST /api/v1/sessions/<pairingId>/execute → ${status}`
        : `${오류 ?? `HTTP ${status}`} — 서버가 거절한 것이 아니라 답을 못 준 것입니다. 막혔는지는 아직 모릅니다`,
  );
}

// ④ 만료를 서버가 정해서 줘야 한다.
//    클라이언트 시계로 가정하면 서버가 먼저 끝냈을 때 앱이 모른다.
{
  const 만료 = A.body.expiresAt;
  const 남은 = typeof 만료 === "number" ? 만료 - Date.now() : NaN;
  const 그럴듯한가 = Number.isFinite(남은) && 남은 > 0 && 남은 <= 만료상한;
  알림(
    "만료 시각을 서버가 정해서 준다",
    그럴듯한가 ? "통과" : "실패",
    그럴듯한가
      ? `${Math.floor(남은 / 60000)}분 ${Math.floor((남은 % 60000) / 1000)}초 뒤 (클라이언트 시계 아님)`
      : `expiresAt 이 ${만료 === undefined ? "없습니다" : `이상합니다: ${만료}`} — 화면의 남은 시간이 NaN 으로 뜹니다`,
  );
}

console.log("");
if (뚫림 === 0 && 확인불가 === 0) {
  console.log(초록("페어링이 제대로 잠겨 있습니다.\n"));
} else {
  if (뚫림 > 0) console.log(빨강(`${뚫림}곳이 뚫려 있습니다. 위의 ✗ 를 보세요.`));
  if (확인불가 > 0) console.log(노랑(`${확인불가}곳은 확인하지 못했습니다(⚠). 통과가 아닙니다 — 서버를 살린 뒤 다시 돌리세요.`));
  console.log("");
  console.log(회색("자주 있는 원인"));
  console.log(회색("  · 배포된 백엔드가 #108 이전 코드 — main 에 올라갔는지, CD 가 성공했는지 보세요"));
  console.log(회색("  · BFF 허용 목록에 경로가 빠짐 — 로컬은 되는데 배포본만 막힙니다"));
  console.log(회색("  · 502·504 가 뜨면 BFF 위쪽이 아니라 백엔드가 안 뜬 것입니다\n"));
  process.exitCode = 1;
}
