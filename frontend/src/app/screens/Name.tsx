import { useState } from "react";
import { Pictogram } from "@/design/Pictogram";
import { BORDER, CANVAS, FONT, GAP, RADIUS, TEXT_1, TEXT_2, TYPE } from "@/design/tokens";
import { BackButton, CenterHeadline, PrimaryBtn, ProgressBar } from "@/app/ui";

export function NameScreen({ onNext, onBack }: { onNext: (name: string) => void; onBack: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col h-full kb-paper">
      <div className="shrink-0 flex items-center" style={{ padding: `12px ${GAP.screenX}px 0` }}>
        <BackButton onClick={onBack} />
        <div className="flex-1 flex justify-center" style={{ marginRight: 34 }}>
          <ProgressBar step={2} total={3} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, padding: `48px ${GAP.screenX}px 0` }}>
        {/*
         * 실제 이름을 받지 않는다. 화면에 부를 호칭만 받는다.
         * 심사 규칙이 실제 개인정보 수집을 금지하고, 개인정보 화면도
         * "이름은 받지도 저장하지도 않아요" 라고 약속하고 있다.
         * 예전에는 autoComplete="name" 에 '이름 입력' 이라고 적어 두어
         * 브라우저 자동완성이 진짜 이름을 채워 넣었다. 약속과 정반대였다.
         */}
        <CenterHeadline
          title={<>반갑습니다!<br />어떻게 불러드릴까요?</>}
          desc="실제 이름 말고, 불리고 싶은 말을 적어 주세요"
        />

        <label htmlFor="name-input" className="sr-only">부를 호칭</label>
        <input
          id="name-input"
          type="text"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 할머니, 김씨"
          /*
           * 호칭 길이로 잘라 둔다(#96 리뷰).
           *
           * 실제 이름인지 아닌지는 코드가 가려낼 수 없다 — '김씨' 도 호칭이고
           * 성씨이기도 하다. 대신 이 칸이 **호칭 말고 다른 것을 담을 수 없게**
           * 만든다. 열두 자면 부르는 말은 다 들어가지만 주소나 전화번호,
           * 주민등록번호는 들어가지 않는다.
           */
          maxLength={12}
          data-autofocus
          style={{
            width: "100%", marginTop: 36, textAlign: "center",
            fontSize: 22, fontWeight: 600, color: TEXT_1, fontFamily: FONT, letterSpacing: "-0.02em",
            /*
              경계를 준다. 예전에는 테두리도 바탕도 없어서 어디가 적는 자리인지
              placeholder 글자로만 알 수 있었고, 한 글자만 적으면 그마저 사라졌다.
              심사 기준이 컨트롤 경계 대비 3:1 을 보는데, 경계가 없으면 잴 대상이
              없다.

              outline 도 지웠었다. 그러면 키보드로 이 칸에 왔을 때 어디에 와 있는지
              표시가 사라진다 — 전역 :focus-visible 규칙에 맡긴다(FOCUS_STYLES).
            */
            border: `1.5px solid ${BORDER}`, borderRadius: RADIUS.input,
            backgroundColor: CANVAS,
            padding: "12px 14px", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ padding: `0 ${GAP.screenX}px 32px` }}>
        <PrimaryBtn onClick={() => name.trim() && onNext(name.trim())} disabled={!name.trim()}>계속하기</PrimaryBtn>
      </div>
    </div>
  );
}

export function GreetingScreen({ name, onNext }: { name: string; onNext: () => void }) {
  // 자동 넘김이 없다. 사용자가 '계속하기' 를 누를 때만 넘어간다.
  //
  // 예전에는 2.6초 뒤 저절로 사라졌고, 그다음엔 8초로 늘렸다. 둘 다 부족하다 —
  // WCAG 2.2.1(Level A)은 시간 제한을 끄거나 늘리거나 넘길 수 있을 것을 요구하는데,
  // 자동으로 넘어가면 늘리는 것도 끄는 것도 안 되고 '머무를' 수가 없다.
  // 천천히 읽는 분이 주 사용자인 앱에서 읽던 화면이 사라지는 건 예외에 해당하지 않는다.

  return (
    <div
      className="flex flex-col h-full items-center justify-center text-center kb-paper"
      style={{ padding: `0 ${GAP.screenX}px` }}
      role="status"
      aria-live="polite"
    >
      <Pictogram name="handsClapping" size={72} color={TEXT_1} />
      <h1 style={{ ...TYPE.title, color: TEXT_1, marginTop: 32 }}>
        반가워요, <span data-원문 style={{ color: TEXT_1 }}>{name}</span>님!
      </h1>
      <p style={{ ...TYPE.caption, color: TEXT_2, marginTop: 10 }}>
        자주 시키는 주문을 저장해 두면<br />키오스크 앞에서 바로 꺼내 쓸 수 있어요
      </p>
      <div style={{ width: "100%", marginTop: 36 }}>
        <PrimaryBtn onClick={onNext}>계속하기</PrimaryBtn>
      </div>
    </div>
  );
}
