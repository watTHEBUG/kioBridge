import { Pictogram } from "@/design/Pictogram";
import { BORDER, GAP, PAPER, RADIUS, SURFACE, TEXT_1, TEXT_2, TYPE } from "@/design/tokens";
import { 언어목록, type 언어코드 } from "@/api/a11y";
import { 소리를낼수있나 } from "@/api/speech";
import { 들을수있나 } from "@/api/listen";
import { AppLogo, ConsentCheck, PrimaryBtn, RadioChip, ToggleRow } from "@/app/ui";

/**
 * 첫 화면.
 *
 * 규칙: 로그인하지 않아도 핵심 기능이 동작해야 한다.
 * 따라서 주 버튼은 "바로 시작하기"(익명)이고, 전화번호 로그인은 선택 경로다.
 * onStart  익명으로 바로 시작 — 저장은 이번 한 번만, 기기에 남기지 않는다
 * onLogin  선택적 로그인 — 다음에도 불러오고 싶은 사람만 고른다
 */
export function WelcomeScreen({ onStart, onLogin, 동의함, on동의, onPrivacy, 소리켜짐, on소리, 언어, on언어 }: {
  onStart: () => void;
  onLogin: () => void;
  /** 동의 전에는 어느 길로도 못 들어간다 — 게스트로 시작하는 것도 정보를 쓰는 일이다. */
  동의함: boolean;
  on동의: (v: boolean) => void;
  onPrivacy: () => void;
  소리켜짐: boolean;
  on소리: () => void;
  /** 안내 언어. 이 화면 글도 이 값을 따라 바뀐다. */
  언어: 언어코드;
  on언어: (v: 언어코드) => void;
}) {
  /*
   * 이 화면에서는 마이크를 안 연다.
   *
   * 한때 여기서 부르는 말("키오브릿지")을 기다리고 동의를 "네" 로 받았다.
   * 손을 한 번도 안 대고 시작하는 길이었는데, 걷어냈다.
   *
   * 들어오는 문은 스위치('소리로 듣고 답하기')와, 그다음 화면들의 '말하기'
   * 단추다. 말로 채우는 길 자체는 그대로 있다 — 한칸씩말하기와
   * 도움설정말로채우기가 사람이 단추를 누른 자리에서 듣기 시작한다.
   */

  return (
    <div className="flex flex-col h-full kb-paper" style={{ overflowY: "auto" }}>
      {/*
        flex: "1 0 auto" 다. 남으면 늘어나되(1) 줄지는 않고(0), 바탕 크기는 글의
        실제 높이(auto)다. 이 셋이 다 있어야 이 칸의 글이 자리 계산에 들어간다.
      */}
      <div
        className="flex flex-col items-center justify-center"
        style={{ flex: "1 0 auto", padding: `0 ${GAP.screenX}px 14px` }}
      >
        <Pictogram name="handPointing" size={54} color={TEXT_1} />
        <div style={{ marginTop: 18 }}>
          <AppLogo size={40} />
        </div>
        <p style={{ ...TYPE.caption, color: TEXT_2, textAlign: "center", marginTop: 14 }}>
          키오스크 앞에서 헤매지 않도록,<br />저장해 둔 주문을 대신 담아드려요
        </p>
      </div>

      {/* 누를 것이 있는 칸이라 줄이지 않는다. 자리가 모자라면 사진이 양보한다. */}
      <div style={{ padding: `0 ${GAP.screenX}px 32px`, flexShrink: 0 }} className="flex flex-col gap-3">
        {/*
          동의를 먼저 받는다. 게스트로 시작하는 것도 정보를 쓰는 일이라 같이 막는다 —
          로그인한 사람에게만 물으면, 정작 가장 많이 쓰일 길에서는 안 묻는 셈이 된다.
        */}
        {/*
          소리 안내를 여기서 켤 수 있게 둔다.
          지금까지는 도움 설정 화면에만 있었다. 그런데 그 화면까지 가려면 이 화면을
          읽고 눌러야 한다 — **읽어 줘야 읽을 수 있는 사람은 켜러 갈 수가 없었다.**
          첫 화면에 두어야 뜻이 있는 스위치다.
          동의 문구보다 위에 둔다. 아래 두면 동의문을 먼저 읽어야 하는데, 그게 바로
          못 읽는 그 글이다.
          소리를 못 내는 기기에서는 안 보인다 — 켜도 아무 일이 없는 스위치를 두면
          켠 사람은 켜졌다고 믿는다(도움 설정 화면과 같은 판단이다).
        */}
        {(소리를낼수있나() || 들을수있나()) && (
          <ToggleRow
            label="소리로 듣고 답하기"
            on={소리켜짐}
            onToggle={on소리}
          />
        )}
        <ConsentCheck 동의함={동의함} on바꾸기={on동의} onDetail={onPrivacy} />

        {/*
          동의 전에는 이 한 줄만 뜬다.

          한때 여기에 안내가 일곱 개까지 늘어 있었다(마이크 허락 · 마이크 막힘 ·
          동의 물음 · 부르는 말 기다림 …). 손 안 대고 들어오는 길을 걷어내면서
          그 갈래들도 같이 사라졌고, 남은 것은 처음 하나다.

          role="status" 를 유지한다. 스크린리더가 바뀐 줄을 읽고, 우리 소리
          안내도 이 글을 읽는다 — data-소리조용 을 안 붙이는 이유다.
        */}
        {!동의함 && (
          <p style={{ fontSize: 13, color: TEXT_2, textAlign: "center", margin: 0 }} role="status">
            확인하셔야 시작할 수 있어요
          </p>
        )}

        {/* 주 버튼 = 익명 시작. 가입도 로그인도 요구하지 않는다. */}
        <PrimaryBtn onClick={onStart} disabled={!동의함}>
          <span className="flex items-center justify-center gap-2">
            {/* 대표 버튼 안이라 버튼 면과 함께 뒤집혀야 한다. #fff 로 박으면 다크에서
                흰 알약 위에 흰 아이콘이 된다. 코드래빗이 잡은 셋과 같은 종류다. */}
            <Pictogram name="handPointing" size={18} color={PAPER} />
            바로 시작하기
          </span>
        </PrimaryBtn>
        {/*
          두 줄이던 것을 한 줄로. 둘 다 '안심하라' 는 같은 말이라 나눌 이유가 없다.

          **"저장하지 않은" 을 넣는다.** 그냥 "입력한 내용" 이라고 하면 사실이
          아니다 — 게스트도 '이 기기에 저장하기' 를 고를 수 있고, 그렇게 저장한
          주문표는 localStorage 에 남아 탭을 닫아도 안 지워진다(api/session.ts).
          지워지는 것은 저장 안 한 쪽이다.

          안심시키려고 적는 글이 사실보다 넓으면, 그건 안심이 아니라 거짓말이다.
        */}
        <p style={{ fontSize: 12, color: TEXT_2, textAlign: "center", lineHeight: 1.7, margin: 0 }}>
          가입 없이 바로 쓸 수 있고, 저장하지 않은 내용은 이번 한 번만 쓰고 지워집니다
        </p>

        {/* 선택 경로. 다음에도 불러오고 싶은 사람만 고른다. */}
        <button
          type="button"
          onClick={onLogin}
          disabled={!동의함}
          style={{
            marginTop: 4, minHeight: 56, borderRadius: RADIUS.button, background: SURFACE,
            border: `1px solid ${BORDER}`, color: TEXT_2, fontSize: 15, fontWeight: 600,
            cursor: 동의함 ? "pointer" : "not-allowed", opacity: 동의함 ? 1 : 0.55,
          }}
          className="flex items-center justify-center gap-2 w-full"
        >
          <Pictogram name="userCircle" size={18} color={TEXT_2} />
          로그인 (선택)
        </button>

        {/*
          안내 언어 — 화면 맨 아래, 왼쪽이 한국어 오른쪽이 영어.

          제목도 설명도 안 붙인다. 무엇을 고르는지는 글자 자체가 말한다 —
          "한국어" 와 "English" 는 그 언어를 읽는 사람에게 각각 자기 말이다.
          설명을 한국어로 붙이면 영어만 읽는 사람에게는 읽을 수 없는 안내가
          하나 더 늘 뿐이다.

          맨 아래에 두는 이유는 이것이 이 화면에서 **하는 일이 아니라 되돌리는
          길**이기 때문이다. 대부분은 안 건드리고 지나가고, 필요한 사람만
          끝에서 찾는다.
        */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}
          role="radiogroup"
          aria-label="안내 언어"
        >
          {언어목록.map(({ code, label }) => (
            <RadioChip
              key={code}
              name="첫 화면 안내 언어"
              label={label}
              lang={code}
              골랐나={언어 === code}
              onPick={() => on언어(code)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
