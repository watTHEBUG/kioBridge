import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Pictogram } from "@/design/Pictogram";
import { BORDER, CANVAS, FAIL, FONT, GAP, PAPER, RADIUS, RULE, SERIF, SURFACE, TEXT_1, TEXT_2, TEXT_3, TYPE } from "@/design/tokens";
import { KioBridgeError } from "@/api/client";
import { type Account, LOGIN_ID_MAX, PASSWORD_MIN, account, 비밀번호검사, 아이디검사 } from "@/api/account";
import { PrivacyRows, AppLogo, BackButton, ConsentCheck, InfoBox, PrimaryBtn, ProgressBar, StickyFooter } from "@/app/ui";

/**
 * 계정 화면의 입력 한 줄.
 *
 * 라벨을 진짜 <label for> 로 둔다. 자리표시자로만 두면 값을 적는 순간 무엇을 적는 칸이었는지
 * 사라지고, 스크린리더는 칸 이름을 읽을 방법이 없다.
 *
 * 비밀번호 칸에는 보기/숨기기를 붙인다. 점으로만 가려 두면 오타를 확인할 길이 없어서
 * 손이 떨리거나 화면이 잘 안 보이는 분은 "맞지 않아요" 만 반복해서 만나게 된다.
 * 기본은 가려 둔 상태다 — 어깨 너머로 보이는 것도 막아야 한다.
 */
export function AccountField({
  id, label, hint, value, onChange, secret = false, autoComplete, autoFocus = false, onEnter, invalid = false,
}: {
  id: string;
  label: string;
  /** 칸 아래 한 줄. 문제가 있으면 그 이유가, 없으면 안내가 들어온다. */
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  /** 비밀번호 칸인가. 보기/숨기기 버튼이 붙는다. */
  secret?: boolean;
  autoComplete: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  invalid?: boolean;
}) {
  const [보임, 보이기] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={id} style={{ ...TYPE.label, color: TEXT_1, display: "block", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={id}
          type={secret && !보임 ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // 칸이 둘·셋인 화면에서 Enter 로 넘어가지 못하면 키보드만 쓰는 사람은
          // 버튼까지 Tab 으로 내려가야 한다. 폼이 아니라 버튼이라 직접 잇는다.
          onKeyDown={(e) => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }}
          autoComplete={autoComplete}
          /*
           * 아이디만 글자 수로 자른다. 비밀번호는 서버가 UTF-8 '바이트' 로 재기 때문에
           * maxLength 로는 같은 규칙을 만들 수 없다 — 한글이면 24자에서 이미 72바이트다.
           * 비밀번호 길이는 비밀번호검사() 가 본다.
           */
          maxLength={secret ? undefined : LOGIN_ID_MAX}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-invalid={invalid || undefined}
          {...(autoFocus ? { "data-autofocus": true } : {})}
          style={{
            width: "100%", ...TYPE.body, color: TEXT_1, fontFamily: FONT,
            // 보기/숨기기 버튼이 글자를 덮지 않도록 오른쪽을 비워 둔다.
            padding: secret ? "15px 84px 15px 16px" : "15px 16px",
            borderRadius: RADIUS.input, boxSizing: "border-box",
            backgroundColor: CANVAS, outline: "none",
            // 빨간 테두리만으로 알리지 않는다. 아래 hint 가 같은 사실을 글로 말한다.
            border: invalid ? `2px solid ${FAIL}` : "none",
          }}
        />
        {secret && (
          <button
            type="button"
            onClick={() => 보이기((v) => !v)}
            aria-pressed={보임}
            aria-controls={id}
            aria-label={보임 ? "비밀번호 가리기" : "비밀번호 보기"}
            style={{
              position: "absolute", right: 6, minHeight: 44, minWidth: 44, padding: "0 12px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: TEXT_2, fontFamily: FONT,
            }}
          >
            {보임 ? "숨기기" : "보기"}
          </button>
        )}
      </div>
      {hint && (
        <p
          id={`${id}-hint`}
          style={{ fontSize: 13, lineHeight: 1.5, marginTop: 7, color: invalid ? FAIL : TEXT_2 }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * 로그인.
 *
 * 아이디가 없는 것과 비밀번호가 틀린 것을 구분해서 알리지 않는다. 구분해 주면 어떤 아이디가
 * 이미 있는지 하나씩 확인할 수 있다. 서버도 같은 예외(InvalidCredentialsException)를 쓴다.
 */

export function LoginScreen({ onDone, onBack, onGoSignup, 동의함, on동의, onPrivacy }: {
  onDone: (a: Account) => void;
  onBack: () => void;
  onGoSignup: () => void;
  동의함: boolean;
  on동의: (v: boolean) => void;
  onPrivacy: () => void;
}) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [오류, set오류] = useState<string | null>(null);
  // 보내는 중에 또 누르면 요청이 두 번 나간다. 로그인에서는 실패 횟수를 두 배로 쌓는 셈이다.
  const [보내는중, set보내는중] = useState(false);

  // 동의도 조건이다. 첫 화면에서 이미 체크했으면 켜진 채로 온다 —
  // 이번 이용에 한 번만 묻는 값이라 화면마다 다시 묻지 않는다.
  const 채워짐 = loginId.trim() !== "" && password !== "" && 동의함;

  const 보내기 = () => {
    if (!채워짐 || 보내는중) return;
    set보내는중(true);
    set오류(null);
    account.login(loginId, password)
      .then(onDone)
      // 성공하면 이 화면은 사라지므로 보내는중 을 되돌리지 않는다.
      // 언마운트된 컴포넌트에 상태를 쓰면 React 가 경고한다.
      .catch((e: KioBridgeError) => {
        set보내는중(false);
        set오류(e?.message ?? "로그인하지 못했어요");
      });
  };

  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0" style={{ padding: `12px ${GAP.screenX}px 0` }}>
        <BackButton onClick={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, padding: `24px ${GAP.screenX}px 0` }}>
        <h1 style={{ ...TYPE.display, color: TEXT_1 }}>로그인</h1>
        <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8, marginBottom: 28 }}>
          저장해 두신 주문표를 다시 불러와요
        </p>

        <AccountField
          id="login-id" label="아이디" value={loginId} onChange={setLoginId}
          autoComplete="username" autoFocus onEnter={보내기}
        />
        <AccountField
          id="login-pw" label="비밀번호" value={password} onChange={setPassword}
          secret autoComplete="current-password" onEnter={보내기}
        />

        {오류 && (
          <div role="alert" style={{ marginBottom: 12 }}>
            <InfoBox>{오류}</InfoBox>
          </div>
        )}
      </div>

      <StickyFooter>
        <ConsentCheck 동의함={동의함} on바꾸기={on동의} onDetail={onPrivacy} />
        {!채워짐 && (
          <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2, marginBottom: 2 }}>
            {동의함 ? "아이디와 비밀번호를 적으면 로그인할 수 있어요" : "확인하셔야 로그인할 수 있어요"}
          </p>
        )}
        <PrimaryBtn onClick={보내기} disabled={!채워짐 || 보내는중}>
          {보내는중 ? "확인하는 중" : "로그인"}
        </PrimaryBtn>
        <button
          type="button"
          onClick={onGoSignup}
          style={{
            minHeight: 48, background: "none", border: "none", cursor: "pointer",
            fontSize: 14, color: TEXT_2, fontFamily: FONT,
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          아이디가 없으신가요? 회원가입
        </button>
      </StickyFooter>
    </div>
  );
}

/**
 * 회원가입.
 *
 * 받는 것은 아이디와 비밀번호 둘뿐이다. 심사 규칙이 실제 개인정보 수집을 금지하고,
 * 개인정보 안내 화면도 "실제 이름·주소·주민등록번호는 받지도 저장하지도 않아요" 라고
 * 약속하고 있다. 아이디는 사용자가 지어내는 값이라 그 약속을 어기지 않는다.
 *
 * 비밀번호를 두 번 받는다. 서버는 한 번만 받지만, 가려진 칸에 오타가 나면 사용자는
 * 다음 로그인에서야 그 사실을 알게 되고 그때는 고칠 방법이 없다.
 */

export function SignupScreen({ onDone, onBack, onGoLogin, 동의함, on동의, onPrivacy }: {
  onDone: (a: Account) => void;
  onBack: () => void;
  onGoLogin: () => void;
  동의함: boolean;
  on동의: (v: boolean) => void;
  onPrivacy: () => void;
}) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [다시, set다시] = useState("");
  const [오류, set오류] = useState<string | null>(null);
  const [보내는중, set보내는중] = useState(false);
  const [안내펼침, set안내펼침] = useState(false);

  /*
   * 적기 시작한 칸만 검사한다.
   *
   * 빈 칸까지 검사하면 화면을 열자마자 "아이디를 적어 주세요" · "비밀번호를 적어 주세요" 가
   * 빨간 글씨로 둘 뜬다. 아직 아무것도 안 했는데 혼나는 화면이 된다.
   * 무엇을 채워야 하는지는 버튼 위 한 줄이 대신 말한다.
   */
  const 아이디문제 = loginId ? 아이디검사(loginId) : null;
  const 비번문제 = password ? 비밀번호검사(password) : null;
  const 다시문제 = 다시 && 다시 !== password ? "두 번 적은 비밀번호가 서로 달라요" : null;

  /*
   * 동의를 조건에 넣는다. 로그인 화면은 이미 넣고 있었는데(채워짐) 가입만
   * 빠져 있었다 — 칸을 다 채우면 동의를 안 눌러도 가입이 됐다. 동의는 건너뛸
   * 수 없는 관문이고, 계정을 만드는 자리가 그것을 가장 먼저 지켜야 한다.
   */
  const 보낼수있나 =
    loginId.trim() !== "" && password !== "" && 다시 !== "" && 동의함 &&
    !아이디문제 && !비번문제 && !다시문제;

  const 보내기 = () => {
    if (!보낼수있나 || 보내는중) return;
    set보내는중(true);
    set오류(null);
    account.signup(loginId, password)
      .then(onDone)
      .catch((e: KioBridgeError) => {
        set보내는중(false);
        set오류(e?.message ?? "가입하지 못했어요");
      });
  };

  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0 flex items-center" style={{ padding: `12px ${GAP.screenX}px 0` }}>
        <BackButton onClick={onBack} />
        <div className="flex-1 flex justify-center" style={{ marginRight: 34 }}>
          <ProgressBar step={1} total={3} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, padding: `24px ${GAP.screenX}px 0` }}>
        <h1 style={{ ...TYPE.display, color: TEXT_1 }}>회원가입</h1>
        <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 8, marginBottom: 28 }}>
          아이디와 비밀번호만 받아요
        </p>

        <AccountField
          id="signup-id" label="아이디" value={loginId} onChange={setLoginId}
          autoComplete="username" autoFocus onEnter={보내기}
          invalid={Boolean(아이디문제)}
          hint={아이디문제 ?? `${LOGIN_ID_MAX}자까지 쓸 수 있어요. 실제 이름이나 전화번호는 적지 마세요`}
        />
        <AccountField
          id="signup-pw" label="비밀번호" value={password} onChange={setPassword}
          secret autoComplete="new-password" onEnter={보내기}
          invalid={Boolean(비번문제)}
          hint={비번문제 ?? `${PASSWORD_MIN}자 이상 적어 주세요`}
        />
        <AccountField
          id="signup-pw2" label="비밀번호 다시 적기" value={다시} onChange={set다시}
          secret autoComplete="new-password" onEnter={보내기}
          invalid={Boolean(다시문제)}
          hint={다시문제 ?? "같은 비밀번호를 한 번 더 적어 주세요"}
        />

        {오류 && (
          <div role="alert" style={{ marginBottom: 12 }}>
            <InfoBox>{오류}</InfoBox>
          </div>
        )}

        {/*
          * 안내를 이 화면 안에서 펼친다. 다른 화면으로 보내지 않는다.
          *
          * 예전에는 개인정보 화면으로 넘어갔는데, 그 화면의 뒤로가기는 늘 홈으로
          * 간다. 가입 화면으로 돌아올 길이 없어서 적어 둔 아이디와 비밀번호가
          * 둘 다 사라졌다. 무엇을 저장하는지 확인하고 가입하려는 사람이 가장
          * 먼저 밟는 길인데, 확인하면 처음부터 다시 적어야 했다.
          */}
        <p style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.7, marginBottom: 8 }}>
          실제 이름·주소·주민등록번호는 받지 않아요. 무엇을 저장하고 무엇을 저장하지 않는지는{" "}
          <button
            type="button"
            onClick={() => set안내펼침((v) => !v)}
            aria-expanded={안내펼침}
            aria-controls="signup-privacy"
            style={{
              color: TEXT_2, textDecoration: "underline", textUnderlineOffset: 3,
              background: "none", border: "none", padding: "6px 2px", minHeight: 44,
              cursor: "pointer", fontFamily: FONT, fontSize: 13,
            }}
          >
            {안내펼침 ? "개인정보 안내 접기" : "개인정보 안내"}
          </button>
          에 적어 두었어요.
        </p>

        {안내펼침 && (
          <div id="signup-privacy" style={{ marginBottom: 8 }}>
            <PrivacyRows guest />
          </div>
        )}
      </div>

      <StickyFooter>
        <ConsentCheck 동의함={동의함} on바꾸기={on동의} onDetail={onPrivacy} />
        {!보낼수있나 && (
          <p style={{ textAlign: "center", fontSize: 13, color: TEXT_2, marginBottom: 2 }}>
            {아이디문제 ?? 비번문제 ?? 다시문제
              ?? (동의함 ? "아이디와 비밀번호를 적으면 가입할 수 있어요" : "확인하셔야 가입할 수 있어요")}
          </p>
        )}
        <PrimaryBtn onClick={보내기} disabled={!보낼수있나 || 보내는중}>
          {보내는중 ? "가입하는 중" : "가입하고 시작하기"}
        </PrimaryBtn>
        <button
          type="button"
          onClick={onGoLogin}
          style={{
            minHeight: 48, background: "none", border: "none", cursor: "pointer",
            fontSize: 14, color: TEXT_2, fontFamily: FONT,
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          이미 아이디가 있으신가요? 로그인
        </button>
      </StickyFooter>
    </div>
  );
}

/**
 * 계정 화면.
 *
 * 게스트(로그인 없이 시작)일 때도 모든 기능이 그대로 열려 있어야 한다.
 * 이 화면이 하는 일은 두 가지뿐이다 — 저장된 것을 지우는 길과, 원하면 로그인하는 길.
 */
export function AccountScreen({
  name, guest, onLogout, onLogin, onClearLocal, onSheets, onA11y, onPrivacy,
}: {
  name: string; guest: boolean;
  onLogout: () => void; onLogin: () => void; onClearLocal: () => void;
  onSheets: () => void; onA11y: () => void; onPrivacy: () => void;
}) {
  // 목록에 올린 항목은 전부 실제로 열린다. 눌러도 아무 일이 없는 줄은 두지 않는다.
  const items = guest
    ? [
        // 주문표는 이제 창을 닫아도 남는다(api/session.ts). 여기가 "이번 이용에만
        // 쓰는" 이라고 말하고 있으면 화면이 사실이 아닌 것을 말하는 것이 된다.
        { label: "저장된 주문표 관리", sub: "지우실 때까지 이 휴대폰에 남는 메뉴 주문표예요", action: onSheets, danger: false },
        { label: "접근성 설정", sub: "큰 글씨", action: onA11y, danger: false },
        { label: "개인정보 안내", sub: "무엇을 저장하고 무엇을 저장하지 않는지", action: onPrivacy, danger: false },
        /*
         * 게스트에게는 '프로필 삭제' 다. 지워지는 것이 이 기기에 적어 둔 프로필
         * (주문표·호칭·도움 설정·알레르기)뿐이라서다. 로그인 쪽의 '계정 삭제' 와
         * 이름을 갈라 두면 무엇이 지워지는지 이름만 보고도 다르다는 것을 안다.
         */
        { label: "프로필 삭제", sub: "이 기기에 입력한 내용을 모두 지우고 처음으로 돌아가요", action: onClearLocal, danger: true },
      ]
    : [
        { label: "저장된 주문표 관리", sub: "내 메뉴 주문표를 확인하고 수정해요", action: onSheets, danger: false },
        { label: "접근성 설정", sub: "큰 글씨", action: onA11y, danger: false },
        { label: "개인정보 안내", sub: "무엇을 저장하고 무엇을 저장하지 않는지", action: onPrivacy, danger: false },
        { label: "계정 삭제", sub: "계정과 저장해 둔 내용을 모두 지우고 처음으로 돌아가요", action: onClearLocal, danger: true },
        { label: "로그아웃", sub: "", action: onLogout, danger: true },
      ];
  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0" style={{ padding: `20px ${GAP.screenX}px 24px` }}>
        <AppLogo size={26} />
        <div className="flex items-center gap-4" style={{ marginTop: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", backgroundColor: guest ? SURFACE : RULE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {guest
              ? <Pictogram name="handPointing" size={24} color={TEXT_2} />
              : <span style={{ fontFamily: SERIF, fontSize: 24, color: PAPER }}>{name ? name[0] : "?"}</span>}
          </div>
          <div>
            {/*
              이 화면의 제목이다. p 였는데 h1 으로 바꿨다.

              화면이 바뀌면 포커스를 제목으로 옮기는 효과가 h1·h2·[data-screen-title]
              을 찾는다(아래 '화면이 바뀌면 포커스가' 효과). 계정 화면에는 그 셋이
              하나도 없어서 대상을 못 찾고 그냥 돌아갔고, 포커스는 사라진 버튼과
              함께 <body> 로 떨어졌다 — 키보드 사용자는 탭 탐색을 문서 처음부터
              다시 해야 했고, 스크린리더 사용자는 화면이 바뀐 것도 듣지 못했다.
              개인정보 겹을 닫고 이 화면으로 돌아올 때도 같았다.

              보이는 모양은 그대로다(TYPE.title). 바뀐 것은 이 글이 제목이라고
              말해 주는 것뿐이다.
            */}
            <h1 style={{ ...TYPE.title, color: TEXT_1 }}>{guest ? "게스트로 이용 중" : `${name || "사용자"}님`}</h1>
            <p style={{ fontSize: 14, color: TEXT_2, marginTop: 2 }}>
              {guest ? "로그인 없이 모든 기능을 쓰고 있어요" : "키오브릿지 회원"}
            </p>
          </div>
        </div>

        {/* 로그인은 끝까지 선택이다. 안내만 하고 막지 않는다. */}
        {guest && (
          <button
            type="button"
            onClick={onLogin}
            style={{
              marginTop: 20, width: "100%", minHeight: 52, borderRadius: RADIUS.button,
              background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_2,
              fontSize: 15, fontWeight: 600, fontFamily: FONT, cursor: "pointer",
            }}
            className="flex items-center justify-center gap-2"
          >
            <Pictogram name="userCircle" size={18} color={TEXT_2} />
            다음에도 불러오려면 로그인 (선택)
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, paddingLeft: GAP.screenX, paddingRight: GAP.screenX }}>
        <div style={{ borderRadius: RADIUS.card, backgroundColor: SURFACE, overflow: "hidden" }}>
          {items.map(({ label, sub, action, danger }, idx) => (
            <button
              key={label}
              type="button"
              onClick={action}
              style={{
                width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "17px 20px", textAlign: "left", cursor: "pointer", fontFamily: FONT,
                backgroundColor: "transparent", border: "none",
                borderTop: idx > 0 ? `1px solid ${BORDER}` : "none",
              }}
            >
              <div>
                <p style={{ fontSize: 16, fontWeight: 500, color: danger ? FAIL : TEXT_1, letterSpacing: "-0.01em" }}>{label}</p>
                {sub && <p style={{ fontSize: 13, color: TEXT_2, marginTop: 3 }}>{sub}</p>}
              </div>
              {!danger && <ChevronLeft size={16} aria-hidden="true" style={{ color: TEXT_3, transform: "rotate(180deg)" }} />}
            </button>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: TEXT_2, marginTop: 24, marginBottom: 16 }}>버전 1.0.0</p>
      </div>
    </div>
  );
}
