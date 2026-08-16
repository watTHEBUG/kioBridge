import { useEffect, useState } from "react";
import { Pictogram } from "@/design/Pictogram";
import { BORDER, CANVAS, FAIL, FAIL_BG, GAP, NUM, P, PAPER, RADIUS, RULE, SERIF, SUCCESS, SURFACE, TEXT_1, TEXT_2, TEXT_3, TYPE, WARN, WARN_BG } from "@/design/tokens";
import { AbortInfo, CartResult, PlanStatus, StepStatus } from "@/domain/types";
import { STEPS } from "@/domain/catalog";
import { KioBridgeError, POLL_MS, api } from "@/api/client";
import { tf } from "@/i18n/t";
import { AppLogo, OutlineBtn, PrimaryBtn, SPIN, StatusHero } from "@/app/ui";

export function StepRow({ label, status }: { label: string; status: StepStatus }) {
  const isDone = status === "done";
  const isActive = status === "active";
  const isFailed = status === "failed";

  return (
    <div className="flex items-center gap-3.5" style={{ padding: "14px 0" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        // 끝난 단계는 검은 동그라미. 다섯 개가 초록으로 늘어서면 화면이 초록 목록이 된다.
        backgroundColor: isDone ? RULE : isActive ? PAPER : isFailed ? FAIL_BG : PAPER,
      }}>
        {isDone && (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 9.5L7.5 13L14 6" stroke={PAPER} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="7" stroke={BORDER} strokeWidth="2.5" />
            <path d="M10 3 A7 7 0 0 1 17 10" stroke={TEXT_1} strokeWidth="2.5" strokeLinecap="round" style={SPIN(10, 10)} />
          </svg>
        )}
        {isFailed && (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M5 5L13 13M13 5L5 13" stroke={FAIL} strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        )}
        {status === "waiting" && (
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: TEXT_3 }} />
        )}
      </div>

      <span style={{ fontSize: 16, letterSpacing: "-0.01em", fontWeight: isActive || isDone ? 600 : 400, color: isDone ? TEXT_1 : isActive ? TEXT_1 : isFailed ? FAIL : TEXT_2 }}>
        {label}
      </span>

      {isActive && (
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: RADIUS.pill, backgroundColor: RULE, color: PAPER }}>
          진행 중
        </span>
      )}
      {isFailed && (
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: RADIUS.pill, backgroundColor: FAIL, color: PAPER }}>
          중단
        </span>
      )}
    </div>
  );
}

export function StepCard({ statuses }: { statuses: StepStatus[] }) {
  return (
    <div style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, overflow: "hidden", padding: "6px 20px" }}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ borderBottom: i < STEPS.length - 1 ? `1px solid ${BORDER}` : "none" }}>
          <StepRow label={label} status={statuses[i]} />
        </div>
      ))}
    </div>
  );
}

/**
 * 키오스크가 실제로 한 일을 순서대로 보여 준다.
 *
 * 위의 StepCard 는 우리가 정해 둔 다섯 단계이고, 이건 서버가 정말 한 동작이다.
 * 둘은 개수가 다르다 - 다섯 칸에 열 동작이 들어간다. 그래서 다섯 단계를
 * 이걸로 바꾸지 않고 아래에 접어 둔다. 열 줄을 펼쳐 두면 화면이 길어지고,
 * 대개 사람이 알고 싶은 건 '담겼나' 한 가지다.
 *
 * 접어 두되 없애지는 않는다. 결과가 미심쩍을 때 무엇을 골랐는지 한 줄씩
 * 확인할 수 있어야 하고, 그게 대신 눌러 주는 앱이 갚아야 할 몫이다.
 *
 * 서버가 안 주면(#71 이전 백엔드, 목) 이 부품을 아예 그리지 않는다.
 */

export function DoneSteps({ done }: { done: { text: string; ok: boolean }[] }) {
  const [펼침, set펼침] = useState(false);
  const 실패 = done.filter((d) => !d.ok).length;

  return (
    <div>
      <button
        type="button"
        onClick={() => set펼침((v) => !v)}
        aria-expanded={펼침}
        style={{
          width: "100%", minHeight: 44, textAlign: "left", background: "none", border: "none",
          padding: "6px 2px", display: "flex", alignItems: "center", gap: 8,
        }}
      >
        {/* 키오스크가 대신 눌러 준 일이라 handPointing 을 쓴다. 새 아이콘은 두지 않는다. */}
        <Pictogram name="handPointing" size={17} color={TEXT_2} />
        <span style={{ ...TYPE.caption, color: TEXT_2 }}>
          {/* 조각으로 나누면 어순이 깨진다("What the kiosk did 10steps"). 한 문장으로 만든다. */}
          {tf("키오스크가 한 일 {n}가지", { n: done.length })}
          {/* 숫자가 끼는 문장이라 조각으로 쪼개진다. tf() 로 통째로 옮긴다(#98 리뷰). */}
          {실패 > 0 && <b style={{ fontWeight: 700, color: WARN }}> · {tf("{n}가지 실패", { n: 실패 })}</b>}
          <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{" "}{펼침 ? "접기" : "보기"}</span>
        </span>
      </button>

      {펼침 && (
        <ol style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, padding: "10px 16px", marginTop: 4 }}>
          {done.map((d, i) => (
            <li
              key={`${i}-${d.text}`}
              style={{
                display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 0",
                borderBottom: i < done.length - 1 ? `1px solid ${BORDER}` : "none",
              }}
            >
              {/*
                번호에 TEXT_3 를 썼었다. tokens.ts 에 "글자 금지" 라고 적어 둔
                값이라 흰 배경 1.74:1 이고, 이 목록의 면(SURFACE) 위에서는 더
                낮다. 몇 번째 줄인지 세라고 붙여 둔 숫자가 안 보이면 없느니만
                못하다. 낮춰 보이는 것은 색이 아니라 크기로 만든다.
              */}
              <span style={{ ...TYPE.caption, color: TEXT_2, ...NUM, minWidth: 18 }}>{i + 1}</span>
              <Pictogram name={d.ok ? "checkCircle" : "xCircle"} size={16} color={d.ok ? TEXT_1 : FAIL} style={{ marginTop: 2 }} />
              {/*
                Pictogram 은 aria-hidden 이라 이 줄이 됐는지 안 됐는지가 색과
                모양으로만 남아 있었다. 스크린리더에는 "종이컵 골랐어요" 만
                들리고 성공.실패가 통째로 빠진다. 이 앱이 화면에 "상태는 색뿐
                아니라 그림과 글씨로도 알린다" 고 적어 두고 여기서 어긴 셈이다.
                실패한 줄은 눈으로도 바로 읽히도록 글씨색까지 바꾼다.
              */}
              <span style={{ ...TYPE.caption, color: d.ok ? TEXT_1 : FAIL, flex: 1 }}>
                <b style={{ fontWeight: 700 }}>{d.ok ? "됨" : "실패"}</b>
                {" · "}{d.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ExecInProgress({ statuses }: { statuses: StepStatus[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 style={{ ...TYPE.display, color: TEXT_1 }}>키오스크에 담고 있어요</h2>
        <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8 }}>잠시만 기다려 주세요. 화면을 닫지 마세요.</p>
      </div>
      <StepCard statuses={statuses} />
    </div>
  );
}

export function ExecSuccess({ cart, steps, done, note, serverStatus, onHome }: {
  cart: CartResult; steps: StepStatus[];
  /** 키오스크가 실제로 한 일. 서버가 안 주면 없다. */
  done?: { text: string; ok: boolean }[];
  /** 서버가 증거를 읽어 만든 한 문장. 없으면 이 줄을 그리지 않는다. */
  note?: string;
  /** 서버가 매긴 상태 문장. 그대로 인용한다. */
  serverStatus?: string;
  onHome: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <StatusHero
        mark={<Pictogram name="checkCircle" size={64} color={P} />}
        kicker="in the cart"
        title="장바구니에 담았어요"
      />

      <div style={{ borderRadius: RADIUS.card, padding: 20, backgroundColor: SURFACE, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="flex items-center justify-between">
          <p style={{ ...TYPE.label, color: TEXT_2, display: "flex", alignItems: "center", gap: 6 }}>
            <Pictogram name="receipt" size={17} color={TEXT_2} />
            담긴 내역
          </p>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: RADIUS.pill, backgroundColor: PAPER, color: TEXT_2 }}>
            {cart.evidenceLabel}
          </span>
        </div>
        <span style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 1.15, color: TEXT_1, ...NUM }}>
          {cart.itemCountText} · {cart.totalText}
        </span>
      </div>

      {/*
        왜 이 메뉴였는지를 마지막에 한 번 더 말해 준다.
        확인 화면에서 읽고 승인했더라도, 담기고 나서 "무엇을 담았더라" 를
        되짚을 자리가 있어야 한다. 서버가 만든 문장이라 화면이 지어내지 않는다.
      */}
      {note && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", paddingLeft: 2 }}>
          <Pictogram name="checkCircle" size={17} color={TEXT_2} />
          <p style={{ ...TYPE.caption, color: TEXT_2, flex: 1 }}>{note}</p>
        </div>
      )}

      {/*
        서버가 매긴 상태를 그대로 인용한다.
        문체가 다르다('~되었습니다'). 앱 문구로 옮기지 않는 이유는, 이 줄의 쓸모가
        "이 결과가 키오스크 쪽에서 온 것이다" 를 보이는 데 있어서다. 우리 말로 바꾸면
        서버가 준 것인지 앱이 지어낸 것인지 다시 구분할 수 없어진다.
        인용이라고 밝혀서 문체 차이를 푼다 — 앱이 하는 말이 아니라 옮겨 적은 말이다.
      */}
      {serverStatus && (
        <div style={{ borderRadius: RADIUS.card, padding: "14px 16px", backgroundColor: CANVAS }}>
          <p style={{ ...TYPE.label, color: TEXT_2, marginBottom: 4 }}>키오스크가 보내온 결과</p>
          <p style={{ ...TYPE.caption, color: TEXT_1 }}>“{serverStatus}”</p>
        </div>
      )}

      <StepCard statuses={steps} />

      {done && <DoneSteps done={done} />}

      <div style={{ display: "flex", gap: 11, alignItems: "flex-start", paddingLeft: 2 }}>
        <Pictogram name="shoppingCartSimple" size={20} color={TEXT_2} style={{ marginTop: 1 }} />
        <p style={{ fontSize: 14, color: TEXT_2, lineHeight: 1.6 }}>{cart.handoff}</p>
      </div>

      <OutlineBtn onClick={onHome}>처음으로</OutlineBtn>
    </div>
  );
}

export function ExecFailed({ abort, steps, done, serverStatus, onHome }: {
  abort: AbortInfo; steps: StepStatus[];
  /** 키오스크가 실제로 한 일. 어디까지 갔는지가 중단됐을 때 더 궁금하다. */
  done?: { text: string; ok: boolean }[];
  /** 서버가 매긴 상태 문장. 성공 화면과 같은 방식으로 인용한다. */
  serverStatus?: string;
  onHome: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <StatusHero
        mark={<Pictogram name="xCircle" size={64} color={FAIL} />}
        title={abort.title}
      />

      <div style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, padding: 20 }}>
        <p style={{ ...TYPE.bodyBold, color: TEXT_1, marginBottom: 6 }}>{abort.userAction}</p>
        <p style={{ ...TYPE.caption, color: TEXT_2, marginBottom: 10 }}>{abort.message}</p>
        <p style={{ fontSize: 12, color: TEXT_2, ...NUM }}>오류 코드: {abort.code}</p>
      </div>

      {/*
        서버가 매긴 상태를 그대로 인용한다. 성공 화면과 같은 방식이다.
        멈춘 경우에는 화면에 개수.금액이 없어서 "키오스크가 뭐라고 했는지" 말고는
        확인할 방법이 없다 - 오히려 여기가 이 줄이 가장 필요한 자리다.
      */}
      {serverStatus && (
        <div style={{ borderRadius: RADIUS.card, padding: "14px 16px", backgroundColor: CANVAS }}>
          <p style={{ ...TYPE.label, color: TEXT_2, marginBottom: 4 }}>키오스크가 보내온 결과</p>
          <p style={{ ...TYPE.caption, color: TEXT_1 }}>“{serverStatus}”</p>
        </div>
      )}

      <StepCard statuses={steps} />

      {done && <DoneSteps done={done} />}

      <OutlineBtn onClick={onHome}>처음으로</OutlineBtn>
      <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2 }}>이 화면을 직원에게 보여주시면 빨라요</p>
    </div>
  );
}

export function ExecutionScreen({ planId, onHome }: { planId: string; onHome: () => void }) {
  const [status, setStatus] = useState<PlanStatus>({
    state: "running",
    steps: STEPS.map(() => "waiting"),
  });

  // 폴링이 실패했을 때 사용자에게 보여 줄 말. null 이면 아직 문제가 없다는 뜻이다.
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (status.state !== "running" || pollError) return;
    let alive = true;
    // 한 번 삐끗한 것과 정말 끊긴 것은 다르다. 잠깐의 실패로 겁주지 않되,
    // 계속 실패하면 반드시 알린다. 예전에는 catch(() => {}) 로 전부 버려서
    // 상태가 영원히 running 에 머물고 "담고 있어요" 스피너가 끝나지 않았다.
    // 사용자는 실패한 줄도 모르고 빠져나갈 버튼도 없었다.
    let 연속실패 = 0;
    const 한계 = 5;
    // 응답 순서가 뒤바뀌면 진행 표시가 뒤로 간다. 폴링이 겹치지 않게 하고,
    // 늦게 도착한 답은 버린다.
    let 진행중 = false;
    let 차례 = 0;
    const poll = () => {
      if (진행중) return;
      진행중 = true;
      const 내차례 = ++차례;
      api.getPlanStatus(planId)
        .then((s) => { if (alive && 내차례 === 차례) { 연속실패 = 0; setStatus(s); } })
        .catch((e: KioBridgeError) => {
          if (!alive) return;
          연속실패 += 1;
          if (연속실패 >= 한계) {
            setPollError(e?.message || "진행 상황을 확인할 수 없어요");
          }
        })
        .finally(() => { 진행중 = false; });
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [planId, status.state, pollError]);

  // 서버가 계속 running 을 돌려주면 폴링은 성공이라 pollError 가 켜지지 않는다.
  // 키오스크가 멈췄는데 세션은 살아 있는 경우가 그렇다. 그러면 사용자는
  // "잠시만 기다려 주세요. 화면을 닫지 마세요." 앞에 영원히 갇힌다.
  // 실행 화면에는 하단 탭도 뒤로 가기도 없어서 나갈 방법이 아예 없다.
  // 5단계 × 1.4초면 7초면 끝나는 일이라, 90초를 넘기면 뭔가 잘못된 것이다.
  useEffect(() => {
    if (status.state !== "running" || pollError) return;
    const t = setTimeout(() => setPollError("시간이 오래 걸리고 있어요"), 90_000);
    return () => clearTimeout(t);
  }, [status.state, pollError]);

  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0" style={{ padding: `20px ${GAP.screenX}px 20px` }}>
        <AppLogo size={26} />
      </div>

      {/* 실행 상태는 사용자 조작 없이 바뀌므로 스크린리더에 알려야 한다. 중단은 assertive. */}
      <div
        className="flex-1 overflow-y-auto pb-6"
        style={{ minHeight: 0, paddingLeft: GAP.screenX, paddingRight: GAP.screenX }}
        role="status"
        aria-live={status.state === "aborted" ? "assertive" : "polite"}
      >
        {/*
         * 확인이 안 되는 것과 실패한 것은 다르다. 키오스크가 어떻게 됐는지 모르는
         * 상황이므로 "중단됐다"고 단정하지 않는다. 다만 사용자를 스피너 앞에
         * 세워 두지 않고, 지금 무슨 상황인지와 나갈 길을 준다.
         */}
        {status.state === "running" && pollError && (
          <div className="flex flex-col flex-1" style={{ padding: `32px 0 24px` }}>
            <StatusHero
              mark={<Pictogram name="warning" size={64} color={WARN} />}
              title={<>진행 상황을<br />확인할 수 없어요</>}
              desc={pollError}
            />
            <div style={{ borderRadius: RADIUS.card, padding: 20, backgroundColor: WARN_BG, marginTop: 32 }}>
              <p style={{ ...TYPE.caption, color: TEXT_1 }}>
                <strong style={{ fontWeight: 600 }}>키오스크 화면을 직접 확인해 주세요.</strong>{" "}
                담겼을 수도 있고 아닐 수도 있어요. 잘 모르겠으면 직원에게 이 화면을 보여 주세요.
              </p>
            </div>
            <div className="mt-auto" style={{ paddingTop: 24 }}>
              <PrimaryBtn onClick={onHome}>처음으로</PrimaryBtn>
            </div>
          </div>
        )}
        {status.state === "running" && !pollError && <ExecInProgress statuses={status.steps} />}
        {status.state === "cart_ready" && status.cart && (
          <ExecSuccess cart={status.cart} steps={status.steps} done={status.done} note={status.note} serverStatus={status.serverStatus} onHome={onHome} />
        )}
        {/*
         * 담기는 끝났는데 내역이 안 온 경우. cart 는 옵셔널이라 서버가 빠뜨릴 수 있다.
         * 예전에는 아무것도 안 그려서 흰 화면에 갇혔다. 이 화면에는 하단 탭이 없어
         * 나갈 방법도 없었다. 내역을 지어내지 않고, 끝났다는 사실과 나갈 길만 준다.
         */}
        {status.state === "cart_ready" && !status.cart && (
          <div className="flex flex-col flex-1" style={{ padding: `32px 0 24px` }}>
            <StatusHero
              mark={<Pictogram name="checkCircle" size={64} color={SUCCESS} />}
              title={<>장바구니에<br />담았어요</>}
              desc="담긴 내역을 불러오지 못했어요"
            />
            <div style={{ borderRadius: RADIUS.card, padding: 20, backgroundColor: SURFACE, marginTop: 32 }}>
              <p style={{ ...TYPE.caption, color: TEXT_1 }}>
                <strong style={{ fontWeight: 600 }}>키오스크 화면에서 장바구니를 확인해 주세요.</strong>{" "}
                결제는 키오스크에서 직접 하시면 돼요.
              </p>
            </div>
            {/*
              내역이 없다고 실행 내역까지 버리면 안 된다. done 은 cart 와 다른
              데서 온 값이라 cart 가 비어도 살아 있다. 오히려 여기가 - 무엇이
              담겼는지 못 보여 주는 자리가 - "무엇을 했는지" 가 가장 필요한 곳이다.
            */}
            {status.done && <div style={{ marginTop: 16 }}><DoneSteps done={status.done} /></div>}
            <div className="mt-auto" style={{ paddingTop: 24 }}>
              <PrimaryBtn onClick={onHome}>처음으로</PrimaryBtn>
            </div>
          </div>
        )}
        {status.state === "aborted" && !status.abort && (
          <div className="flex flex-col flex-1" style={{ padding: `32px 0 24px` }}>
            <StatusHero
              mark={<Pictogram name="warning" size={64} color={WARN} />}
              title={<>안전을 위해<br />중단되었습니다</>}
              desc="자세한 이유를 불러오지 못했어요"
            />
            <div style={{ borderRadius: RADIUS.card, padding: 20, backgroundColor: WARN_BG, marginTop: 32 }}>
              <p style={{ ...TYPE.caption, color: TEXT_1 }}>
                <strong style={{ fontWeight: 600 }}>키오스크는 건드리지 않아도 돼요.</strong>{" "}
                직원에게 이 화면을 보여 주세요.
              </p>
            </div>
            {/* 중단 사유를 못 받았어도 어디까지 갔는지는 알려 준다. */}
            {status.done && <div style={{ marginTop: 16 }}><DoneSteps done={status.done} /></div>}
            <div className="mt-auto" style={{ paddingTop: 24 }}>
              <PrimaryBtn onClick={onHome}>처음으로</PrimaryBtn>
            </div>
          </div>
        )}
        {status.state === "aborted" && status.abort && (
          <ExecFailed abort={status.abort} steps={status.steps} done={status.done} serverStatus={status.serverStatus} onHome={onHome} />
        )}
      </div>
    </div>
  );
}
