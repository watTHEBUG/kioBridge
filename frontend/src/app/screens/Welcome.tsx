import { Pictogram } from "@/design/Pictogram";
import { BORDER, CANVAS, GAP, PAPER, RADIUS, SURFACE, TEXT_1, TEXT_2, TYPE } from "@/design/tokens";
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
        flex: "1 1 auto" 다. 남으면 늘어나고(1) 모자라면 줄어들며(1), 바탕 크기는
        글의 실제 높이(auto)다.

        예전에는 줄이는 쪽이 0 이었다. 바로 아래 주석이 "자리가 모자라면 사진이
        양보한다" 고 적어 두었는데, shrink: 0 은 **절대 안 양보한다**는 뜻이라
        적힌 것과 코드가 반대였다. 844px 틀 안에서는 티가 안 났지만, 틀보다 짧은
        화면이나 개발 표시줄이 자리를 가져갈 때는 아래 칸이 밀려 나갔다.

        minHeight: 0 이 함께 있어야 실제로 줄어든다 — flex 칸의 기본 최소 크기는
        내용 크기라, 이것이 없으면 shrink 를 켜도 안 줄어든다.

        **maxHeight 로 위를 막는다.** 안 막으면 이 칸이 남는 자리를 전부 가져간다.
        실제로 그림·이름·소개 다 합쳐 141px 인 내용이 341px 을 쓰고 있었고, 그
        바람에 아래 칸이 틀 밖으로 48px 밀려 났다. 260 은 141px 내용에 위아래
        숨 쉴 자리를 남기는 값이다. 남는 자리는 아래 칸이 다 쓴 뒤 바닥에 남는다.
      */}
      <div
        className="flex flex-col items-center justify-center"
        style={{ flex: "1 1 auto", minHeight: 0, maxHeight: 260, padding: `0 ${GAP.screenX}px 14px` }}
      >
        <Pictogram name="handPointing" size={54} color={TEXT_1} />
        <div style={{ marginTop: 18 }}>
          <AppLogo size={40} />
        </div>
        {/*
          이 화면의 제목이다. 크기는 caption 그대로 두고 **태그만** h1 이다.

          제목 요소가 하나도 없던 화면이었다. 스크린리더 사용자는 제목으로 화면을
          훑는데, 다른 화면(도움 설정·목록·계정·주문표 만들기)에는 다 있는 것이
          정작 모두가 반드시 지나는 입구에만 없었다.

          로고가 아니라 이 문장이 제목인 이유 — 로고는 앱 이름이라 어느 화면에서나
          같고(그래서 data-소리생략 이다), 여기가 어디이고 무엇을 해 주는 곳인지를
          말하는 것은 이 두 줄이다.

          tailwind preflight 가 h1 의 글자 크기·굵기를 inherit 으로 되돌려 놓아서
          (번들 CSS 에서 확인) 보이는 것은 p 였을 때와 똑같다.
        */}
        <h1 style={{ ...TYPE.caption, color: TEXT_2, textAlign: "center", marginTop: 14 }}>
          키오스크 앞에서 헤매지 않도록,<br />저장해 둔 주문을 대신 담아드려요
        </h1>
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
          안심 문구. **버튼 위**에 둔다.

          예전에는 버튼 아래에 12px 로 있었다. 그러면 '동의하고 시작할까' 를
          정하는 사람이 위(요구)와 아래(안심)를 번갈아 읽어야 하고, 정작
          안심시키는 말을 **정한 다음에** 읽게 된다. 높은 문턱 앞에서 필요한
          말이 문턱을 넘은 자리에 있었던 셈이다.

          동의 칸 바로 뒤로 올리면 읽는 순서가 '무엇에 동의하나 → 그래도
          괜찮은 이유 → 지금 상태 → 시작' 이 된다. 소리로 듣는 분에게도 같은
          순서다(화면글은 DOM 차례로 읽는다).

          크기도 12px 에서 caption(15px)으로 올린다. 이 화면에서 가장 작은
          글자였는데, 고령 사용자에게 가장 필요한 문장이 가장 안 읽히는 크기였다.
          tokens.ts 가 적어 둔 하한과 어긋나 있었다.

          **"저장하지 않은" 을 넣는다.** 그냥 "입력한 내용" 이라고 하면 사실이
          아니다 — 게스트도 '이 기기에 저장하기' 를 고를 수 있고, 그렇게 저장한
          주문표는 localStorage 에 남아 탭을 닫아도 안 지워진다(api/session.ts).
          지워지는 것은 저장 안 한 쪽이다.

          안심시키려고 적는 글이 사실보다 넓으면, 그건 안심이 아니라 거짓말이다.
        */}
        <p style={{ ...TYPE.caption, color: TEXT_2, textAlign: "center", margin: 0 }}>
          가입 없이 바로 쓸 수 있고, 저장하지 않은 내용은 이번 한 번만 쓰고 지워집니다
        </p>

        {/*
          동의 전후로 **글자만 바뀌는 한 줄.** 사라지지 않는다.

          한때 여기에 안내가 일곱 개까지 늘어 있었다(마이크 허락 · 마이크 막힘 ·
          동의 물음 · 부르는 말 기다림 …). 손 안 대고 들어오는 길을 걷어내면서
          그 갈래들도 같이 사라졌고, 남은 것은 처음 하나다.

          **동의하면 이 줄이 없어지게 두면 안 된다.** 예전에는 그랬는데, 그러면
          소리로 쓰는 분이 체크한 순간 아무 말도 못 듣는다. 우리 소리 안내는
          화면글(api/speech.ts)로 읽을 줄을 모으는데, 그것은 글자 노드만 훑으므로
          체크됨 은 애초에 읽을 거리에 없다. 그리고 App.tsx 의 DOM 감시는 **새로
          붙은 줄**만 읽는다 — 줄이 빠지기만 하면 붙은 것이 없어서 한마디도 안 나온다.
          입구에서 반드시 해야 하는 그 한 번의 동작이, 소리 스위치를 켠 바로 그
          사람에게만 아무 대꾸가 없었다.

          글자를 바꾸면 빠진 줄 하나와 붙은 줄 하나가 되어 붙은 쪽이 읽힌다.
          같은 이유로 스크린리더도 이제야 읽는다 — role="status" 는 처음부터 있던
          글을 읽지 않고 **바뀔 때** 읽으므로, 사라지기만 하던 예전에는 조용했다.
          data-소리조용 을 안 붙이는 이유도 같다.
        */}
        <p style={{ fontSize: 13, color: TEXT_2, textAlign: "center", margin: 0 }} role="status">
          {동의함 ? "확인하셨어요. 이제 시작하실 수 있어요" : "확인하셔야 시작할 수 있어요"}
        </p>

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
          선택 경로. 다음에도 불러오고 싶은 사람만 고른다.

          **opacity 로 흐리지 않는다.** 예전에는 동의 전에 opacity: 0.55 였고,
          그 상태에서 글자 대비가 2.10:1 이었다(재서 확인). disabled 라 WCAG
          위반은 아니지만, 저장한 주문표를 다음에 다시 꺼낼 수 있다는 사실이
          이 버튼에만 적혀 있는데 **모두가 처음 보는 상태**에서 안 보였다.

          PrimaryBtn 이 이미 같은 판단을 해 뒀다 — 흐리는 대신 면으로만 비활성을
          알린다. 여기도 같게 맞춘다. 글자는 그대로 두고 배경만 한 톤 죽이면
          5.08:1 이 되고, 누를 수 없다는 것은 커서와 disabled 가 말한다.
        */}
        <button
          type="button"
          onClick={onLogin}
          disabled={!동의함}
          style={{
            marginTop: 4, minHeight: 56, borderRadius: RADIUS.button,
            background: 동의함 ? SURFACE : CANVAS,
            border: `1px solid ${BORDER}`, color: TEXT_2, fontSize: 15, fontWeight: 600,
            cursor: 동의함 ? "pointer" : "not-allowed",
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
