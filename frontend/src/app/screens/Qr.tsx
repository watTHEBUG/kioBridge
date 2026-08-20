import { useEffect, useRef, useState } from "react";
import { Pictogram } from "@/design/Pictogram";
import { BORDER, FAIL, FONT, GAP, NUM, ON_DARK, P, PAPER, RADIUS, RULE, SERIF, SURFACE, TEXT_1, TEXT_2, TYPE, WARN } from "@/design/tokens";
import { PairingResult, PairingState } from "@/domain/types";
import { KioBridgeError, api } from "@/api/client";
import { tf } from "@/i18n/t";
import { AppLogo, PrimaryBtn, SpinnerIcon, StatusHero, 포커스가두기 } from "@/app/ui";

export function PairingConnecting() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center" style={{ paddingLeft: GAP.screenX, paddingRight: GAP.screenX }}>
      <StatusHero mark={<SpinnerIcon />} title="키오스크에 연결하는 중" desc="잠시만 기다려 주세요" />
    </div>
  );
}

export function PairingConnected({
  kioskName, expiresAt, onExpire, onSelectSheet,
}: {
  kioskName: string;
  expiresAt: number;
  onExpire: () => void;
  onSelectSheet: () => void;
}) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  const expire = useRef(onExpire);
  // 렌더 본문에서 ref 를 건드리지 않는다. React 는 렌더를 버리거나 다시 돌릴 수 있어서,
  // 커밋되지 않은 렌더의 값이 ref 에 남을 수 있다.
  useEffect(() => { expire.current = onExpire; }, [onExpire]);

  // P0-2: claim 세션은 단명한다. 만료되면 화면도 같이 끊겨야 한다.
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecs(left);
      if (left === 0) expire.current();
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="flex flex-col flex-1" style={{ padding: `32px ${GAP.screenX}px 24px` }}>
      <StatusHero
        mark={<Pictogram name="checkCircle" size={64} color={P} />}
        kicker="connected"
        /*
         * 가게 이름을 문장 안에 넣는다. 이름을 따로 떼어 두면 "연결되었습니다" 만
         * 읽고 무엇에 연결됐는지는 못 들은 채 넘어가는 사람이 생긴다 — 소리로
         * 듣는 사람에게는 두 줄이 아니라 한 문장이어야 한다.
         *
         * 이름은 키트가 준 것이고 옮기지 않는다(data-원문). 키오스크 화면에 적힌
         * 글자와 같아야 사용자가 맞는 가게인지 확인할 수 있다.
         */
        title={<span data-원문>{tf("{이름} 키오스크에 연결되었습니다", { 이름: kioskName })}</span>}
      />

      {/* 면 대신 줄로 가른다. 굵은 줄이 머리와 내용을 나누고, 아래 헤어라인이 끝을 맺는다. */}
      <div style={{ marginTop: 32, borderTop: `2px solid ${RULE}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between gap-4" style={{ padding: "18px 0" }}>
          <div>
            <p style={{ ...TYPE.label, color: TEXT_1, marginBottom: 5 }}>세션 유효시간</p>
            <p style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.5 }}>만료되면 QR을 다시 스캔해 주세요</p>
          </div>
          {/*
            1초마다 바뀐다. **aria-live 에서 빼낸다.**

            이 화면 전체가 role="status" aria-live="polite" 그릇 안에 있다(아래
            QrScreen). 그러면 브라우저가 이 숫자가 바뀔 때마다 낭독한다 — 화면을
            못 보는 분은 다음에 무엇을 눌러야 하는지 대신 초 세는 소리만 듣고,
            '주문표 선택하기' 가 있다는 것을 들을 틈이 없다.

            data-소리조용 은 이 앱의 자체 읽어주기만 거른다. 브라우저의 aria-live
            처리와는 상관이 없어서, 그 표만으로는 못 막았다.

            aria-hidden 으로 낭독에서 빼고, 남은 시간은 화면으로 본다. 만료는
            숫자를 세지 않아도 알 수 있게 별도 화면이 말해 준다(PairingExpired).
          */}
          <span
            aria-hidden="true"
            data-소리조용
            style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1, color: TEXT_1, ...NUM }}
          >{mm}:{ss}</span>
        </div>
      </div>

      <div className="mt-auto" style={{ paddingTop: 24 }}>
        <PrimaryBtn onClick={onSelectSheet}>주문표 선택하기</PrimaryBtn>
      </div>
    </div>
  );
}

export function QrScanButton({ onScan }: { onScan: () => void }) {
  return (
    <PrimaryBtn onClick={onScan}>
      <span className="flex items-center justify-center gap-2">
        {/*
          단추 글자와 같은 색을 쓴다. PrimaryBtn 은 바탕이 RULE, 글자가 PAPER 이고
          둘 다 팔레트를 따라 뒤집힌다. 여기만 "white" 로 박아 두면 어두운 판에서
          밝은 단추 위에 흰 아이콘이 되어 묻힌다.
        */}
        <Pictogram name="qrCode" size={21} color={PAPER} />
        QR 다시 스캔하기
      </span>
    </PrimaryBtn>
  );
}

export function PairingFailed({ reason = "유효하지 않은 QR입니다", onScan }: { reason?: string; onScan: () => void }) {
  return (
    <div className="flex flex-col flex-1" style={{ padding: `32px ${GAP.screenX}px 24px` }}>
      <StatusHero
        mark={<Pictogram name="xCircle" size={64} color={FAIL} />}
        title="연결할 수 없습니다"
        desc={reason}
      />

      <div style={{ borderRadius: RADIUS.card, padding: 20, backgroundColor: SURFACE, marginTop: 32 }}>
        <p style={{ ...TYPE.caption, color: TEXT_1 }}>
          키오스크에 부착된 QR 코드를 <strong style={{ fontWeight: 600 }}>다시 스캔해 주세요</strong>
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3" style={{ paddingTop: 24 }}>
        <QrScanButton onScan={onScan} />
        <p style={{ fontSize: 13, color: TEXT_2, textAlign: "center" }}>문제가 반복되면 매장 직원에게 도움을 요청하세요</p>
      </div>
    </div>
  );
}

/**
 * 연결이 끝난 화면.
 *
 * 끝나는 길이 둘이라 말을 나눈다 — 시간이 지난 것과, 한 번 써서 끝난 것.
 * 취소하고 나온 사람에게 "연결 시간이 만료되었습니다" 라고 하면 사실이 아니고,
 * 사용자는 자기가 무엇을 오래 붙잡고 있었나 되짚게 된다(팀 #146).
 *
 * 어느 쪽이든 할 일은 같다(다시 찍기). 다른 것은 그 앞에 무슨 말이 적히느냐
 * 뿐이고, 그게 맞는 말이어야 한다 — listen.ts 의 못들은이유 와 같은 판단이다.
 */

export function PairingExpired({ onScan, 이유 = "만료" }: { onScan: () => void; 이유?: "만료" | "다썼음" }) {
  return (
    <div className="flex flex-col flex-1" style={{ padding: `32px ${GAP.screenX}px 24px` }}>
      <StatusHero
        mark={<Pictogram name="clockCountdown" size={64} color={WARN} />}
        title={이유 === "다썼음" ? <>이 연결은<br />다 쓰셨어요</> : <>연결 시간이<br />만료되었습니다</>}
        desc={이유 === "다썼음"
          ? "한 번 연결하면 한 번 주문할 수 있어요"
          : "안전을 위해 연결이 종료되었어요"}
      />

      <div style={{ borderRadius: RADIUS.card, padding: 20, backgroundColor: SURFACE, marginTop: 32 }}>
        <p style={{ ...TYPE.caption, color: TEXT_1 }}>
          키오스크에 부착된 QR 코드를 <strong style={{ fontWeight: 600 }}>다시 스캔해 주세요</strong>
        </p>
      </div>

      <div className="mt-auto" style={{ paddingTop: 24 }}>
        <QrScanButton onScan={onScan} />
      </div>
    </div>
  );
}

export function QrScannerModal({ onClose, onDetected }: { onClose: () => void; onDetected: () => void }) {
  const [scanning, setScanning] = useState(true);

  // 검은 화면을 덮어 놓기만 하고 role 도 포커스 가둠도 없었다.
  // 스크린리더로는 뒤에 있는 주문표 목록과 하단 탭이 그대로 읽히고,
  // Tab 을 누르면 보이지도 않는 곳으로 포커스가 나간다.
  const 모달 = useRef<HTMLDivElement>(null);
  useEffect(() => { 모달.current?.focus(); }, []);
  const 가두기 = 포커스가두기(모달, onClose);

  /*
   * 타이머가 둘이므로 둘 다 걷어야 한다.
   *
   * 스캐너가 떠 있는 동안에도 하단 탭은 눌린다 — 모달은 화면 영역만 덮고
   * 하단 탭은 그 바깥에 있다. 스캔이 끝난 뒤(2.5초) 800ms 안에 사용자가
   * 다른 탭으로 옮기면, 안쪽 타이머만 살아남아 언마운트된 뒤에 onDetected 가
   * 실행된다. 그러면 사용자가 QR 화면을 떠난 뒤에 claimPairing 이 나간다.
   * 화면에는 아무 표시도 안 되는데 키오스크에는 연결 요청이 남는다.
   */
  useEffect(() => {
    let detect: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      setScanning(false);
      detect = setTimeout(onDetected, 800);
    }, 2500);
    return () => {
      clearTimeout(t);
      if (detect) clearTimeout(detect);
    };
    // onDetected 는 인라인 화살표로 넘어와 매 렌더 새 함수가 된다.
    // 의존 항목에 두면 타이머가 계속 리셋되어 스캔이 끝나지 않을 수 있다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={모달}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="QR 코드 스캔"
      onKeyDown={가두기}
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "#000", outline: "none" }}
    >
      <div className="flex items-center justify-between shrink-0" style={{ padding: `20px ${GAP.screenX}px 12px` }}>
        <AppLogo light size={24} />
        <button
          type="button"
          aria-label="QR 스캔 닫기"
          onClick={onClose}
          style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4L14 14M14 4L4 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backgroundColor: "#1C1C1E" }}>
            <div className="w-full h-full opacity-40" style={{ background: "repeating-linear-gradient(0deg,#141416 0px,#141416 2px,#232326 2px,#232326 8px)" }} />
          </div>

          {([
            { cls: "top-0 left-0",     bt: true,  br: false, bb: false, bl: true  },
            { cls: "top-0 right-0",    bt: true,  br: true,  bb: false, bl: false },
            { cls: "bottom-0 left-0",  bt: false, br: false, bb: true,  bl: true  },
            { cls: "bottom-0 right-0", bt: false, br: true,  bb: true,  bl: false },
          ] as const).map(({ cls, bt, br, bb, bl }, i) => {
            // 검은 배경 위라 P(#111) 는 보이지 않는다. 스캔 중엔 반투명 흰선, 인식되면 완전한 흰선.
            const c = scanning ? "rgba(255,255,255,0.55)" : "#FFFFFF";
            return (
              <div key={i} className={`absolute ${cls} w-8 h-8`} style={{
                borderTopWidth: bt ? 3 : 0, borderTopStyle: bt ? "solid" : "none", borderTopColor: c,
                borderRightWidth: br ? 3 : 0, borderRightStyle: br ? "solid" : "none", borderRightColor: c,
                borderBottomWidth: bb ? 3 : 0, borderBottomStyle: bb ? "solid" : "none", borderBottomColor: c,
                borderLeftWidth: bl ? 3 : 0, borderLeftStyle: bl ? "solid" : "none", borderLeftColor: c,
                borderRadius: i === 0 ? "8px 0 0 0" : i === 1 ? "0 8px 0 0" : i === 2 ? "0 0 0 8px" : "0 0 8px 0",
              }} />
            );
          })}

          {scanning && (
            <div className="absolute left-2 right-2 h-0.5 rounded-full"
              style={{ backgroundColor: "#FFFFFF", boxShadow: "0 0 10px rgba(255,255,255,0.8)", animation: "scanline 1.6s ease-in-out infinite" }} />
          )}

          {!scanning && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.10)" }}>
              {/*
                이 모달의 배경은 팔레트와 무관하게 늘 #000 이다. 여기에 PAPER.TEXT_1
                을 쓰면 다크에서 검은 배경에 검은 원(1.07:1)이 되어 묻힌다.
                고정 쌍(ON_DARK 면 + 검은 체크)을 쓴다. 로고는 고쳤는데 같은 모달
                안의 이 아이콘을 빠뜨렸다.
              */}
              <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: ON_DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <path d="M7 17L13 23L25 11" stroke="#111111" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/*
          스캐너 화면의 제목. 여기도 제목 요소가 하나도 없던 화면이라, 크기는
          그대로 두고 태그만 h1 로 바꾼다(preflight 가 크기·굵기를 inherit 으로
          되돌리므로 보이는 것은 그대로다).

          글이 상태에 따라 바뀌는데 그래도 된다 — 지금 무엇을 하는 중인지가
          곧 이 화면의 제목이다.
        */}
        <h1 style={{ color: "white", ...TYPE.body, fontWeight: 500, textAlign: "center", fontFamily: FONT, whiteSpace: "pre-line" }}>
          {scanning ? "키오스크의 QR 코드를\n카메라에 맞춰주세요" : "QR 코드를 인식했어요"}
        </h1>
      </div>

      <div className="shrink-0 text-center" style={{ padding: `0 ${GAP.screenX}px 40px` }}>
        {/*
         * 42% 흰색은 검은 바탕에서 3.95:1 이라 13px 글자 기준(4.5:1)에 못 미쳤다.
         * 조명을 조절하라는 안내는 화면이 어두워서 안 보일 때 읽어야 하는 문장이라
         * 특히 흐리면 안 된다. 62% 는 7.8:1 이고, 위쪽 흰 안내문(21:1)보다는 여전히 조용하다.
         */}
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", fontFamily: FONT }}>
          QR 코드가 잘 보이지 않으면 조명을 조절해 주세요
        </p>
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: 8px; }
          50% { top: calc(100% - 10px); }
          100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}

// 스캔을 그만뒀을 때 돌아오는 자리. 예전에는 이 화면이 없어서 스캔 창에
// 닫기 버튼을 숨겨 두었고(hideClose), 한번 들어가면 하단 탭으로 빠져나가는 것 말고는
// 나올 방법이 없었다. 그만두는 것도 사용자가 할 수 있어야 하는 선택이다.

export function PairingIdle({ onScan }: { onScan: () => void }) {
  return (
    <div className="flex flex-col flex-1" style={{ padding: `32px ${GAP.screenX}px 24px` }}>
      <StatusHero
        mark={<Pictogram name="qrCode" size={64} color={TEXT_2} />}
        title={<>QR 코드를<br />찍어 주세요</>}
        desc="키오스크 화면이나 기계에 붙어 있어요"
      />

      <div style={{ borderRadius: RADIUS.card, padding: 20, backgroundColor: SURFACE, marginTop: 32 }}>
        <p style={{ ...TYPE.caption, color: TEXT_1 }}>
          찍지 않아도 <strong style={{ fontWeight: 600 }}>내 주문표</strong>에서 저장한 조건을 먼저 확인할 수 있어요
        </p>
      </div>

      <div className="mt-auto" style={{ paddingTop: 24 }}>
        <QrScanButton onScan={onScan} />
      </div>
    </div>
  );
}

export function QrScreen({ onPaired, initialPhase = "scan", 끝난이유 = "만료", connected = null }: {
  onPaired: (pairingId: string, expiresAt: number, kioskName: string) => void;
  // 연결이 만료돼서 되돌아온 경우에는 스캐너가 아니라 만료 안내부터 보여 준다.
  // 스캐너로 바로 보내면 사용자는 자기가 왜 여기 왔는지 알 수 없다.
  initialPhase?: "scan" | "expired";
  /** 연결이 왜 끝났는지. 만료 화면의 문구가 이걸 따라 갈린다(팀 #146). */
  끝난이유?: "만료" | "다썼음";
  // 이미 연결돼 있으면 그 상태를 그대로 보여 준다. 다시 찍으라고 하지 않는다.
  connected?: { pairingId: string; expiresAt: number; kioskName: string } | null;
}) {
  const [phase, setPhase] = useState<"scan" | "idle" | PairingState>(connected ? "connected" : initialPhase);
  const [pairing, setPairing] = useState<PairingResult | null>(
    connected ? { pairingId: connected.pairingId, expiresAt: connected.expiresAt, kioskName: connected.kioskName } : null,
  );

  // 서버가 왜 실패했는지 알려 줬으면 그걸 그대로 보여 준다.
  // 예전에는 버리고 늘 "유효하지 않은 QR입니다" 라고 했다. 서버가 죽었을 때도 그랬다.
  const [failReason, setFailReason] = useState<string | undefined>(undefined);
  const handleScanned = () => {
    setPhase("connecting");
    setFailReason(undefined);
    api.claimPairing("kb_demo")
      .then((r) => { setPairing(r); setPhase("connected"); })
      .catch((e: KioBridgeError) => {
        if (e?.code === "CLAIM_EXPIRED") { setPhase("expired"); return; }
        setFailReason(e?.message);
        setPhase("failed");
      });
  };
  const handleRescan = () => setPhase("scan");

  /*
   * 단계가 바뀌면 그 패널의 제목으로 포커스를 옮긴다.
   *
   * App 의 화면 전환 효과는 screen·tab 이 바뀔 때만 돈다. 여기서 일어나는 것은
   * **같은 화면 안의 단계 변화**라 그 효과가 안 닿는다. 그래서 스캐너가 사라지는
   * 순간 포커스가 <body> 로 떨어졌고, QR 을 막 찍어 연결에 성공한 사람이
   * '주문표 선택하기' 까지 문서 맨 위에서부터 Tab 을 눌러 내려와야 했다.
   *
   * 읽어 주는 일은 아래 그릇의 aria-live 가 이미 한다. 여기는 포커스만 옮긴다.
   * 제목이 없는 단계에서는 아무것도 하지 않는다 — 엉뚱한 곳을 잡느니 그대로 둔다.
   */
  const 패널 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 스캐너는 제 포커스를 스스로 잡는다(QrScannerModal).
    if (phase === "scan") return;
    const 제목 = 패널.current?.querySelector<HTMLElement>("h1, h2");
    if (!제목) return;
    if (!제목.hasAttribute("tabindex")) 제목.setAttribute("tabindex", "-1");
    /*
     * 보이게 한 다음에 포커스를 준다.
     *
     * 이 패널은 overflow-y-auto 다(바로 아래 주석). 앞 단계에서 아래로 내려가
     * 있었다면 스크롤 위치가 그대로 남아, 포커스만 옮기면 **화면 밖에 있는
     * 제목에 포커스가 가 있는** 상태가 된다. 키보드로 쓰는 사람은 자기가 어디에
     * 있는지 보이지 않고, 다음 Tab 이 어디서 이어질지도 알 수 없다.
     *
     * 그 패널이 넘치는 것은 글씨를 더 키운 사람에게서 실제로 일어난다 —
     * 이 PR 이 돕는 바로 그 사람이다.
     *
     * nearest 로 최소한만 굴린다. 화면이 통째로 튀지 않고, 이미 보이면
     * 아무것도 안 한다. 굴린 뒤라 focus 의 preventScroll 은 그대로 둔다.
     */
    제목.scrollIntoView({ block: "nearest", inline: "nearest" });
    제목.focus({ preventScroll: true });
  }, [phase]);

  if (phase === "scan") {
    return <QrScannerModal onClose={() => setPhase("idle")} onDetected={handleScanned} />;
  }

  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0" style={{ padding: `20px ${GAP.screenX}px 0` }}>
        <AppLogo size={26} />
      </div>

      {/*
       * overflow-hidden 이 아니라 overflow-y-auto 다.
       * 이 안의 패널들(연결중·연결됨·실패·만료)은 아래 버튼을 mt-auto 로 바닥에 붙인다.
       * 그릇이 hidden 이면 내용이 커졌을 때 그 버튼이 잘려 나가고, 스크롤도 안 되니
       * 손으로는 닿을 방법이 없어진다. 앱이 주는 큰 글씨(1.18배)까지는 넘치지 않지만
       * 사용자가 브라우저·OS 글씨 크기를 더 키우면 1.6배 근처부터 넘친다(측정값 102px).
       * auto 로 두면 넘칠 때만 스크롤이 생기고, 넘치지 않으면 지금과 똑같이 보인다.
       */}
      <div ref={패널} className="flex-1 flex flex-col overflow-y-auto" style={{ minHeight: 0 }} role="status" aria-live="polite">
        {phase === "idle" && <PairingIdle onScan={handleRescan} />}
        {phase === "connecting" && <PairingConnecting />}
        {phase === "connected" && pairing && (
          <PairingConnected
            kioskName={pairing.kioskName}
            expiresAt={pairing.expiresAt}
            onExpire={() => setPhase("expired")}
            onSelectSheet={() => onPaired(pairing.pairingId, pairing.expiresAt, pairing.kioskName)}
          />
        )}
        {phase === "failed" && <PairingFailed reason={failReason} onScan={handleRescan} />}
        {phase === "expired" && <PairingExpired onScan={handleRescan} 이유={끝난이유} />}
      </div>
    </div>
  );
}
