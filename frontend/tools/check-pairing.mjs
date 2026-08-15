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

const 초록 = (s) => `\x1b[32m${s}\x1b[0m`;
const 빨강 = (s) => `\x1b[31m${s}\x1b[0m`;
const 회색 = (s) => `\x1b[90m${s}\x1b[0m`;

let 실패 = 0;

const 알림 = (이름, 통과, 자세히) => {
  if (!통과) 실패++;
  console.log(`${통과 ? 초록("✓") : 빨강("✗")} ${이름}`);
  if (자세히) console.log(`    ${회색(자세히)}`);
};

/** 연결을 하나 새로 받는다. 실패하면 null — 부르는 쪽이 알아서 접는다. */
async function 연결하나() {
  const ac = new AbortController();
  const 시계 = setTimeout(() => ac.abort(), 20_000);
  try {
    const res = await fetch(`${BFF}/internal/simulation/session`, {
      method: "POST",
      signal: ac.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ environmentId: "chicken-store", claimCode: "kb_check" }),
    });
    const t = await res.text();
    return { status: res.status, body: t ? JSON.parse(t) : {} };
  } catch (e) {
    return { status: 0, body: null, 오류: e.name === "AbortError" ? "20초 안에 응답이 없습니다" : e.message };
  } finally {
    clearTimeout(시계);
  }
}

console.log(`\n대상: ${기준}\n`);

const A = await 연결하나();
if (A.status !== 200 || !A.body) {
  console.log(빨강(`✗ 연결을 못 받았습니다 — ${A.오류 ?? `HTTP ${A.status}`}`));
  console.log(회색("\n서버가 떠 있는지, 주소가 맞는지 먼저 보세요.\n"));
  process.exit(1);
}

// ① 진짜 세션 ID 가 브라우저로 나오면 안 된다.
//    이것 하나만 알면 누구나 남의 주문을 실행할 수 있었다 — 그 구멍을 닫은 것이 #108 이다.
{
  const 칸 = Object.keys(A.body);
  const 샜나 = "sessionId" in A.body || JSON.stringify(A.body).includes("SIM-");
  알림(
    "진짜 세션 ID 를 브라우저로 안 준다",
    !샜나 && typeof A.body.pairingId === "string",
    샜나 ? `응답에 sessionId 가 들어 있습니다: ${JSON.stringify(A.body).slice(0, 120)}`
         : `응답 칸: ${칸.join(" · ")}`,
  );
}

// ② 찍을 때마다 다른 연결이어야 한다.
//    같으면 뒷사람이 앞사람 자리에 들어간다.
{
  const B = await 연결하나();
  const 다른가 = B.status === 200 && B.body?.pairingId && B.body.pairingId !== A.body.pairingId;
  알림(
    "두 번 찍으면 서로 다른 연결이 나온다",
    Boolean(다른가),
    다른가 ? `A: ${A.body.pairingId.slice(0, 10)}…  B: ${B.body.pairingId.slice(0, 10)}…`
           : "같은 pairingId 가 두 번 나왔습니다 — 뒷사람이 앞사람 연결을 물려받습니다",
  );
}

// ③ pairingId 로 키오스크를 직접 못 움직여야 한다.
//    이 값이 곧 세션 ID 라면 감싼 뜻이 없다.
{
  const ac = new AbortController();
  const 시계 = setTimeout(() => ac.abort(), 20_000);
  let status = 0;
  try {
    const res = await fetch(`${BFF}/api/v1/sessions/${encodeURIComponent(A.body.pairingId)}/execute`, {
      method: "POST", signal: ac.signal,
      headers: { "content-type": "application/json" }, body: "{}",
    });
    status = res.status;
  } catch { /* 못 붙었으면 아래에서 실패로 잡힌다 */ } finally { clearTimeout(시계); }
  // 200 이면 그 값이 실제 세션 ID 라는 뜻이다. 나머지(404·403·400)는 다 막힌 것이다.
  알림(
    "pairingId 로 키오스크를 직접 못 움직인다",
    status !== 0 && status !== 200,
    status === 200 ? "실행이 그대로 됐습니다 — pairingId 가 진짜 세션 ID 입니다"
                   : `POST /api/v1/sessions/<pairingId>/execute → ${status || "연결 실패"}`,
  );
}

// ④ 만료를 서버가 정해서 줘야 한다.
//    클라이언트 시계로 가정하면 서버가 먼저 끝냈을 때 앱이 모른다.
{
  const 만료 = A.body.expiresAt;
  const 남은 = typeof 만료 === "number" ? 만료 - Date.now() : NaN;
  const 그럴듯한가 = Number.isFinite(남은) && 남은 > 0 && 남은 <= 20 * 60 * 1000;
  알림(
    "만료 시각을 서버가 정해서 준다",
    그럴듯한가,
    그럴듯한가
      ? `${Math.floor(남은 / 60000)}분 ${Math.floor((남은 % 60000) / 1000)}초 뒤 (클라이언트 시계 아님)`
      : `expiresAt 이 ${만료 === undefined ? "없습니다" : `이상합니다: ${만료}`} — 화면의 남은 시간이 NaN 으로 뜹니다`,
  );
}

console.log("");
if (실패 === 0) {
  console.log(초록("페어링이 제대로 잠겨 있습니다.\n"));
} else {
  console.log(빨강(`${실패}곳이 뚫려 있습니다. 위의 ✗ 를 보세요.\n`));
  console.log(회색("자주 있는 원인"));
  console.log(회색("  · 배포된 백엔드가 #108 이전 코드 — main 에 올라갔는지, CD 가 성공했는지 보세요"));
  console.log(회색("  · BFF 허용 목록에 경로가 빠짐 — 로컬은 되는데 배포본만 막힙니다\n"));
  process.exitCode = 1;
}
