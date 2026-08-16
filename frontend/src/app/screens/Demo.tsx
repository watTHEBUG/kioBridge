import { useEffect, useState } from "react";
import { FONT, TEXT_1 } from "@/design/tokens";
import { type Scenario, getScenario, setScenario } from "@/api/client";
import { 연동기록 } from "@/api/devlog";

/**
 * 지금 목인지 실서버인지, 방금 무엇이 오갔는지 보여 준다.
 *
 * 화면만 봐서는 구분할 방법이 없다. 둘 다 그럴듯한 답을 돌려주기 때문이다.
 * 실제로 나간 요청을 그대로 띄워서 "진짜 붙었다" 를 눈으로 확인하게 한다.
 *
 * npm run dev:team 일 때만 나온다 — 개발 서버에서만이다.
 *
 * 예전에는 팀백엔드모드 하나로 가렸는데, 배포도 --mode team 으로 빌드하는 탓에
 * 운영 화면에 이 검은 상자가 그대로 떠 있었다. 지금은 개발패널보이나 가
 * import.meta.env.DEV 까지 함께 보므로 빌드본에서는 확실히 빠진다.
 */
export function 연동표시({ onOpenLog, onOpenSide }: { onOpenLog: () => void; onOpenSide: () => void }) {
  const [, 다시그리기] = useState(0);
  // 화면이 좁으면 접어 둔다. 펼친 채로 두면 휴대폰 틀의 아래 버튼을 덮어
  // 터치를 가로챈다. 200% 확대처럼 CSS 뷰포트가 작아질 때 실제로 그렇다.
  const [펼침, 펼치기] = useState(false);
  useEffect(() => 연동기록.구독(() => 다시그리기((n) => n + 1)), []);
  const 목록 = 연동기록.읽기();
  const 성공 = 목록.filter((x) => typeof x.상태 === "number" && x.상태 < 400).length;

  return (
    <div
      style={{
        position: "fixed", right: 12, bottom: 12, zIndex: 60,
        // 좁은 화면에서는 폭을 줄인다. 340px 고정이면 작은 뷰포트를 다 덮는다.
        width: "min(340px, calc(100vw - 24px))",
        maxHeight: 펼침 ? "60vh" : undefined,
        overflowY: 펼침 ? "auto" : undefined,
        background: "#0b0b0c", color: "#e8e8ea", borderRadius: 10,
        padding: 12, fontSize: 12, lineHeight: 1.5, fontFamily: "ui-monospace, monospace",
        boxShadow: "0 8px 28px rgba(0,0,0,.35)",
      }}
    >
      <button
        type="button"
        aria-expanded={펼침}
        onClick={() => 펼치기((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 펼침 ? 8 : 0,
          background: "none", border: "none", color: "inherit", font: "inherit",
          padding: 0, minHeight: 44, cursor: "pointer", width: "100%", textAlign: "left",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#37d67a", flexShrink: 0 }} />
        {/* 개발용 막대다. 사용자에게 하는 말이 아니다. */}
        <strong data-소리생략 style={{ fontSize: 13 }}>실서버에 붙어 있습니다</strong>
        <span style={{ marginLeft: "auto", color: "#9a9aa2" }}>{성공}/{목록.length} {펼침 ? "▾" : "▸"}</span>
      </button>
      {!펼침 ? null : (
      <>
      <div style={{ color: "#9a9aa2", marginBottom: 8 }}>
        목이 아니라 팀 백엔드로 보냅니다 · /api/bff → KIOBRIDGE_API_BASE
      </div>
      {/* 본문까지 펼쳐 보는 화면. 이 패널은 좁아서 한 줄 요약까지만 담는다. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          onClick={onOpenSide}
          style={{
            flex: 1, background: "none", border: "1px solid #232326",
            borderRadius: 6, color: "#e8e8ea", font: "inherit", padding: "5px 0", cursor: "pointer",
            // 심사 항목이 터치 영역 최소 44x44 다. 개발용 패널도 같은 화면 안에 있다.
            minHeight: 44,
          }}
        >
          앱 옆에 띄우기
        </button>
        <button
          type="button"
          onClick={onOpenLog}
          style={{
            flex: 1, background: "none", border: "1px solid #232326",
            borderRadius: 6, color: "#e8e8ea", font: "inherit", padding: "5px 0", cursor: "pointer",
            minHeight: 44,
          }}
        >
          크게 보기
        </button>
      </div>
      {목록.length === 0 ? (
        <div style={{ color: "#9a9aa2" }}>아직 오간 게 없습니다. QR 을 찍어 보세요.</div>
      ) : (
        <>
          <div style={{ color: "#9a9aa2", marginBottom: 6 }}>
            주고받은 요청 {목록.length}건 · 성공 {성공}건
          </div>
          {목록.map((x) => (
            <div key={x.시각 + x.경로} style={{ display: "flex", gap: 8, padding: "3px 0", borderTop: "1px solid #232326" }}>
              <span style={{
                color: x.상태 === "실패" ? "#ff6b6b" : (x.상태 as number) < 400 ? "#37d67a" : "#ffb020",
                width: 34, flexShrink: 0,
              }}>{x.상태}</span>
              <span style={{ flex: 1, wordBreak: "break-all" }}>{x.경로}</span>
              <span style={{ color: "#9a9aa2", flexShrink: 0 }}>{x.걸린시간}ms</span>
            </div>
          ))}
        </>
      )}
      </>
      )}
    </div>
  );
}

/**
 * 시연용 스위치를 보여 줄지.
 *
 * 이 패널은 실제 앱 화면이 아니라 시연·심사에서 예외 상태(애매·변경·안전 중단)를
 * 재현하려고 둔 것이다. 그냥 앱을 쓰는 사람에게는 무슨 물건인지 알 수 없고,
 * 배포본에 그대로 보이면 완성되지 않은 화면처럼 읽힌다.
 *
 * 그래서 기본은 감춘다. 필요할 때만 주소 뒤에 ?demo=1 을 붙인다.
 *   https://kiobridge-app.vercel.app/?demo=1
 *
 * 지우지 않고 남기는 이유는, 시연 영상에서 이 상태들을 보여 줘야 하는데
 * 실제로 그 상황을 만들려면 키오스크가 그렇게 답해 줘야 하기 때문이다.
 */

export function ScenarioPanel() {
  const [current, setCurrent] = useState<Scenario>(getScenario());
  const apply = (patch: Partial<Scenario>) => {
    setScenario(patch);
    setCurrent(getScenario());
  };

  const groups: { key: keyof Scenario; title: string; options: { value: string; label: string }[] }[] = [
    {
      key: "pairing", title: "QR 연결", options: [
        { value: "connected", label: "연결됨" },
        { value: "failed", label: "실패" },
        { value: "expired", label: "만료" },
      ],
    },
    {
      key: "mapping", title: "메뉴 매칭", options: [
        { value: "exact", label: "정확" },
        { value: "clarification", label: "애매" },
        { value: "not_found", label: "없음" },
        { value: "changed", label: "변경" },
        { value: "low_confidence", label: "불확실" },
      ],
    },
    {
      key: "execution", title: "실행", options: [
        { value: "cart_ready", label: "장바구니 담김" },
        { value: "aborted", label: "안전 중단" },
      ],
    },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col gap-5 self-start"
      aria-label="시연용 시나리오 설정"
      style={{ width: 220, padding: 20, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
    >
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "white" }}>시나리오</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginTop: 4 }}>
          다음 단계부터 적용돼요. 앱 화면에는 포함되지 않습니다.
        </p>
      </div>

      {groups.map(({ key, title, options }) => (
        <div key={key} className="flex flex-col gap-2">
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{title}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={title}>
            {options.map(({ value, label }) => {
              const active = current[key] === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => apply({ [key]: value } as Partial<Scenario>)}
                  style={{
                    display: "inline-flex", alignItems: "center", minHeight: 44,
                    padding: "7px 12px", borderRadius: 100, cursor: "pointer",
                    fontSize: 12, fontWeight: 600, fontFamily: FONT,
                    backgroundColor: active ? "white" : "rgba(255,255,255,0.10)",
                    color: active ? TEXT_1 : "rgba(255,255,255,0.7)",
                    // 색만으로 고른 것을 알리지 않는다 — 안 고른 것에도 테두리를 둔다.
                    border: active ? "none" : "1px solid rgba(255,255,255,0.45)",
                  }}
                >
                  {label}{active ? " (선택됨)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
