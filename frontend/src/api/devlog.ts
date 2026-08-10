/**
 * 지금 어디에 붙어 있는지, 방금 무엇이 오갔는지 눈으로 보게 한다.
 *
 * 화면만 봐서는 목인지 실서버인지 구분할 방법이 없다. 둘 다 그럴듯한 답을
 * 돌려주기 때문이다. 그래서 실제로 나간 요청을 여기 모아 두고, 개발 중에만
 * 옆에 띄운다.
 *
 * 팀 백엔드 모드(npm run dev:team · build:team)에서만 기록한다.
 * 기본 빌드에서는 __TEAM_BACKEND__ 가 거짓이라 이 모듈을 부르는 쪽이 통째로 사라진다.
 */

export interface 오간것 {
  방법: string;
  경로: string;
  상태: number | "실패";
  걸린시간: number;
  시각: number;
}

/**
 * 경로에 실린 userId 를 가린다.
 *
 * 이 기록은 화면 구석 패널에 그대로 뜬다. 시연 화면이나 녹화에도 같이 찍힌다.
 * 그런데 백엔드가 토큰을 발급하지 않아서 **userId 자체가 열쇠다** — 숫자만 알면
 * 그 사람의 주문표를 읽고 쓸 수 있다(docs/BACKEND_INTEGRATION.md 의 ②).
 * 화면에 띄우는 것이 곧 그 열쇠를 보여 주는 일이 된다.
 *
 * 무엇을 불렀는지는 그대로 알 수 있게 두고, 누구인지만 가린다.
 *   /api/v1/users/12345/profiles  ->  /api/v1/users/***\/profiles
 */
const 가린경로 = (경로: string): string => 경로.replace(/\/users\/[^/]+\//, "/users/***/");

const 최대 = 12;
let 기록: 오간것[] = [];
const 듣는이 = new Set<() => void>();

export const 연동기록 = {
  남기기(x: 오간것): void {
    // 오래된 것부터 버린다. 개발용이라 다 쌓아 둘 이유가 없다.
    기록 = [{ ...x, 경로: 가린경로(x.경로) }, ...기록].slice(0, 최대);
    for (const f of 듣는이) f();
  },
  읽기: (): 오간것[] => 기록,
  구독(f: () => void): () => void {
    듣는이.add(f);
    return () => { 듣는이.delete(f); };
  },
};

/** 팀 백엔드 모드인가. 빌드할 때 정해지므로 아닌 쪽 코드는 번들에서 빠진다. */
export const 팀백엔드모드 = __TEAM_BACKEND__;
