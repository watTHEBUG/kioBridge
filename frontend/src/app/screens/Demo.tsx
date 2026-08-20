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
 * --mode team 으로 빌드한 것에는 **배포본에도 그대로 나온다.** 그렇게 두기로
 * 했다 — 시연에서 "지금 보는 것이 목이 아니라 실서버다" 를 화면으로 보이는 것이
 * 이 패널의 쓸모라서, 배포본에서 빠지면 정작 보여야 할 자리에서 없어진다.
 *
 * 여기 예전 주석에는 개발패널보이나 가 import.meta.env.DEV 까지 봐서 빌드본에서
 * 빠진다고 적혀 있었다. 그런 값은 없었다 — 주석만 있고 구현이 없었다. 실제 조건은
 * App.tsx 의 팀백엔드모드 하나뿐이라, 적힌 대로 믿고 지나가면 배포본에 뜨는 것을
 * 못 보고 넘어간다.
 *
 * **떠 있지 않고 자리를 차지한다.** 아래를 보라(스타일 주석).
 */
export function 연동표시({ onOpenLog, onOpenSide }: { onOpenLog: () => void; onOpenSide: () => void }) {
  const [, 다시그리기] = useState(0);
  // 처음에는 접어 둔다. 펼치면 기록이 길어져 화면을 많이 먹는다.
  const [펼침, 펼치기] = useState(false);
  useEffect(() => 연동기록.구독(() => 다시그리기((n) => n + 1)), []);
  const 목록 = 연동기록.읽기();
  const 성공 = 목록.filter((x) => typeof x.상태 === "number" && x.상태 < 400).length;

  return (
    <div
      /*
       * **틀 안에 자리를 차지하고 앉는다. 떠 있지 않는다.**
       *
       * 예전에는 position: fixed 로 오른쪽 아래에 띄웠다. 그러면 폭이 340px 이라
       * 휴대폰 폭(390)을 거의 다 덮고, 화면 아래쪽 띠에 있는 것을 전부 가로챘다.
       * 접어 둬도 마찬가지였다 — 접힌 막대 자체가 44px 짜리 버튼이라 그 아래
       * 있는 것을 그대로 먹었다. 390x844 에서 재 보니 첫 화면의 언어 고르기,
       * 도움 설정의 '계속하기', 목록·QR·계정의 하단 탭 셋, 주문표 만들기의
       * '저장하기'·'시작하기' 가 전부 가운데를 눌러도 이 패널이 받았다.
       *
       * 위로 옮겨도 안 된다. 340px 은 위쪽 띠도 다 덮어서 이번엔 뒤로가기가
       * 막힌다. 떠 있는 한 어느 띠에 놓아도 무언가와 부딪힌다.
       *
       * 그래서 띄우지 않는다. 틀의 마지막 칸으로 들어가면 flex 가 자리를
       * 잡아 주므로, 어떤 화면에서도 무엇도 가리지 않는다. 보이는 것은 그대로다.
       */
      style={{
        flexShrink: 0,
        maxHeight: 펼침 ? "60vh" : undefined,
        overflowY: 펼침 ? "auto" : undefined,
        background: "#0b0b0c", color: "#e8e8ea",
        padding: 12, fontSize: 12, lineHeight: 1.5, fontFamily: "ui-monospace, monospace",
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
