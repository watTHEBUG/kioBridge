# KioBridge Frontend

키오스크 앞에서 헤매는 분들을 대신해 앱이 주문을 담아 주는 화면입니다.
사용자는 미리 저장해 둔 **메뉴 프로필**을 고르고, 앱이 찾아온 결과를 **직접 승인**하면,
Agent 가 키오스크를 조작해 **장바구니까지만** 담아 둡니다.

Vite + React 18 + TypeScript + Tailwind 4.

---

## 실행

```bash
cd frontend
npm ci        # package-lock.json 그대로 설치. npm install 말고 npm ci 를 쓰세요
npm run dev   # http://localhost:5173
```

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | `dist/` 로 프로덕션 빌드 |
| `npm run typecheck` | `tsc --noEmit` |

Node 20 이상이면 됩니다.

---

## 폴더

```
frontend/
├─ src/
│  ├─ app/App.tsx        화면 전부 + 화면 전환 상태기계  ← 가장 큰 파일
│  ├─ domain/
│  │   types.ts          API 계약 타입 (백엔드와 맞춰야 하는 것)
│  │   catalog.tsx       장소별 세부 옵션 목록, 실행 단계 이름
│  ├─ api/
│  │   client.ts         KioBridgeApi 인터페이스 + Mock 구현  ← 백엔드 연결 지점
│  │   mock.ts           데모용 가짜 응답
│  ├─ design/
│  │   tokens.ts         색·간격·타이포 토큰. 색을 바꾸려면 여기만
│  │   Pictogram.tsx     아이콘 컴포넌트
│  ├─ assets/
│  │   icons/            Phosphor 아이콘 20종 (SVG 문자열로 인라인)
│  │   images/           메뉴 사진 4장
│  │   ATTRIBUTIONS.md   출처·라이선스. 지우지 마세요
│  └─ styles/
└─ vercel.json           Vercel 배포 설정
```

---

## 백엔드와 붙는 지점

**`src/api/client.ts` 한 곳입니다.** 여기 `KioBridgeApi` 인터페이스 4개 메서드만
실제 HTTP 호출로 바꾸면 화면 코드는 손대지 않아도 됩니다.

```ts
export interface KioBridgeApi {
  claimPairing(claimCode: string): Promise<PairingResult>;
  requestMapping(pairingId: string, profileId: string): Promise<MappingResponse>;
  approve(input: ApproveInput): Promise<PlanCreated>;   // 승인 버튼을 누른 뒤에만 호출된다
  getPlanStatus(planId: string): Promise<PlanStatus>;   // POLL_MS 간격으로 폴링
}
```

파일 맨 아래 `export const api: KioBridgeApi = mockApi;` 를 실제 구현으로 갈아끼우면 됩니다.
주고받는 타입은 전부 `src/domain/types.ts` 에 있습니다.

### 데모 시나리오 스위치

백엔드가 붙기 전까지 예외 상황을 시연하려고 `client.ts` 에 `setScenario()` 를 뒀습니다.
연결 실패·만료, 매핑 애매·없음·변경, 실행 중 안전중단을 화면에서 바로 재현할 수 있습니다.
실제 API 로 교체할 때 이 블록과 `mock.ts` 만 지우면 됩니다.

---

## 고치기 전에 알아야 할 규칙

심사에서 실격되는 항목들입니다. 코드에 `P0-n` 주석으로 근거를 달아 뒀습니다.

| | 규칙 |
| --- | --- |
| P0-1 | 프로필에는 **의미값(사람이 읽는 텍스트)만** 담습니다. 상품 ID·화면 좌표를 프론트에 저장하지 않습니다. |
| P0-2 | QR 은 **짧게 만료되는 연결 표**만 만듭니다. 개인정보나 영구 실행 권한을 담지 않습니다. |
| P0-4 | 실행 계획은 **승인 버튼을 누른 뒤에만** 만들어집니다. 그 전에 `approve()` 를 부르는 코드 경로가 있으면 위반입니다. |
| P0-7 | 최종 상태는 **`cart_ready` 뿐**입니다. `completed`·`paid` 상태는 존재하지 않습니다. |
| | **결제 UI 를 만들지 마세요.** 결제 버튼·결제수단 선택 화면이 있으면 실격입니다. |
| | **"주문 완료" 라고 쓰지 마세요.** 종료 문구는 **"장바구니에 담았어요"** 입니다. |
| | 오류 뒤에 **재시도 버튼을 함부로 두지 마세요.** 안전 중단은 사용자가 더 누를 게 없어야 합니다. |
| | **이모지를 쓰지 않습니다.** 아이콘은 `Pictogram` 으로만. |

메뉴 사진은 앱이 이름을 보고 짐작하지 않고, 매핑 응답에 실려 온 것만 씁니다.
사진이 없으면 안 보여 줍니다 — 틀린 사진을 보여 주느니 없는 편이 낫습니다.

---

## Vercel 배포

`vercel.json` 이 이 폴더에 있습니다. Vercel 프로젝트 설정에서
**Root Directory 를 `frontend` 로** 지정하면 나머지는 자동으로 잡힙니다.

---

## 알아 둘 것

이 프로젝트는 **Figma Make** 에서 내보낸 코드에서 출발했습니다. 그래서 지금 안 쓰는 파일이
섞여 있습니다 — `src/app/components/ui/` 의 shadcn 컴포넌트 48개와 `src/imports/` 의 PNG 7장은
어떤 코드도 참조하지 않습니다(빌드 결과물에도 들어가지 않습니다).

Figma Make 에서 다시 내보내 덮어쓸 때 구조가 어긋나지 않도록 일부러 남겨 뒀습니다.
디자인을 Figma Make 에서 더 고칠 계획이 없어지면 그때 지우는 게 안전합니다.

`src/assets/ATTRIBUTIONS.md` 는 사진·아이콘 출처와 라이선스입니다. **지우면 안 됩니다.**
