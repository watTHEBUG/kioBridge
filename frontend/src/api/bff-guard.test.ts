import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/*
 * BFF 의 통과 규칙을 잠근다.
 *
 * api/bff.ts 는 Vercel 서버 함수라 브라우저 테스트 환경에서 import 할 수 없다
 * (node:http 타입에 기대고 있다). 대신 소스에서 규칙만 뽑아 와 검사한다.
 *
 * 왜 잠그나 — 개발 서버는 /api/bff 를 그냥 프록시한다. 그래서 로컬에서는
 * 무엇이든 통하고 **배포본에서만 막힌다.** 실제로 삭제 API 를 붙일 때 이 파일을
 * 빠뜨려서 로컬은 되는데 프로덕션은 405 가 나는 상태를 만들 뻔했다.
 * 로컬에서 안 보이는 규칙일수록 테스트로 붙잡아 둔다.
 */
const 소스 = readFileSync(path.join(process.cwd(), "api", "bff.ts"), "utf8");

/** 소스에 적힌 정규식 목록을 그대로 꺼내 온다. */
const 정규식들 = (블록: string): RegExp[] =>
  [...블록.matchAll(/\/\^api[^\n]*?\/(?=[,\s])/g)].map((m) => {
    const 원문 = m[0];
    return new RegExp(원문.slice(1, 원문.lastIndexOf("/")));
  });

const 허용경로 = 정규식들(소스.slice(소스.indexOf("const 허용경로"), 소스.indexOf("const 기본허용메서드")));
const 경로가되나 = (p: string) => 허용경로.some((r) => r.test(p));

describe("BFF 통과 규칙", () => {
  it("주문표 하나를 가리키는 경로가 열려 있다", () => {
    // 이게 없으면 삭제 요청이 배포본에서 404 로 막힌다.
    expect(경로가되나("api/v1/users/7/profiles/p1")).toBe(true);
    expect(경로가되나("api/v1/users/7/profiles")).toBe(true);
  });

  it("경로 한 칸만 받는다 — 더 깊이 들어가지 못한다", () => {
    expect(경로가되나("api/v1/users/7/profiles/p1/뭔가")).toBe(false);
  });

  it("userId 자리는 숫자만 받는다", () => {
    // [^/]+ 로 두면 경로 한 칸을 아무 문자열이나 통과시키게 된다.
    expect(경로가되나("api/v1/users/..%2Fadmin/profiles/p1")).toBe(false);
    expect(경로가되나("api/v1/users/abc/profiles")).toBe(false);
  });

  it("DELETE 는 주문표 하나에만 열려 있다", () => {
    const 열린DELETE = /\{\s*메서드:\s*"DELETE",\s*경로:\s*(\/\^api[^\n]*?\/)\s*\}/.exec(소스);
    expect(열린DELETE).not.toBeNull();
    const 원문 = 열린DELETE![1];
    const r = new RegExp(원문.slice(1, 원문.lastIndexOf("/")));

    expect(r.test("api/v1/users/7/profiles/p1")).toBe(true);
    // 목록을 통째로 지우는 길이 열리면 안 된다.
    expect(r.test("api/v1/users/7/profiles")).toBe(false);
    // 세션.추천 쪽으로도 못 간다.
    expect(r.test("api/v1/sessions/s1")).toBe(false);
    expect(r.test("internal/orchestrator/approve")).toBe(false);
  });

  it("음성 인식 경로가 열려 있다", () => {
    /*
     * 이게 없으면 배포본에서 404 NOT_ALLOWED 로 막힌다 — 그런데 **로컬에서는
     * 멀쩡히 된다.** 개발 서버는 이 함수를 안 거치고 프록시로 바로 넘기기
     * 때문이다(파일 맨 위 주석). 삭제 API 때 겪은 것과 같은 함정이다.
     */
    expect(경로가되나("api/v1/voice/transcribe")).toBe(true);
  });

  it("multipart 취급은 음성 경로 하나뿐이다", () => {
    // 여기가 넓어지면 클라이언트가 준 content-type 이 다른 경로로도 새어 나간다.
    const m = /const 멀티파트경로 = (\/\^api[^\n]*?\/);/.exec(소스);
    expect(m).not.toBeNull();
    const 원문 = m![1];
    const r = new RegExp(원문.slice(1, 원문.lastIndexOf("/")));

    expect(r.test("api/v1/voice/transcribe")).toBe(true);
    expect(r.test("api/v1/auth/login")).toBe(false);
    expect(r.test("internal/orchestrator/approve")).toBe(false);
    expect(r.test("api/v1/users/7/profiles")).toBe(false);
  });

  it("본문을 문자열로 바꾸지 않는다", () => {
    /*
     * 오디오가 여기를 지난다. UTF-8 문자열로 바꾸면 유효하지 않은 바이트가
     * 전부 U+FFFD 가 되어 **되돌릴 수 없게 망가진다.** 경로를 열고 헤더를
     * 고쳐도 이 한 줄이 살아 있으면 소리는 끝내 서버에 안 닿는다.
     */
    const 읽기 = 소스.slice(소스.indexOf("function 본문읽기"));
    expect(읽기).not.toContain('toString("utf8")');
    expect(읽기).toContain("resolve(Buffer.concat(조각))");
  });

  it("content-type 을 무조건 application/json 으로 박지 않는다", () => {
    /*
     * multipart 는 boundary 가 헤더에 들어 있어야 서버가 본문을 쪼갤 수 있다.
     * 박아 두면 boundary 가 사라져서 MultipartFile 이 아무것도 못 읽는다.
     */
    const 헤더칸 = 소스.slice(소스.indexOf("headers: {"), 소스.indexOf("...(인증"));
    expect(헤더칸).not.toMatch(/"content-type":\s*"application\/json"/);
    expect(헤더칸).toContain("넘길타입(");
  });

  it("넘겨받은 content-type 은 모양을 보고만 쓴다", () => {
    // 아무 값이나 그대로 실어 보내면 이 함수가 헤더 통로가 된다.
    const 고르기 = 소스.slice(소스.indexOf("const 넘길타입"), 소스.indexOf("function 본문읽기"));
    expect(고르기).toContain('startsWith("multipart/form-data")');
    // 길이 상한도 있어야 한다. 헤더 하나로 큰 값을 밀어 넣는 길을 막는다.
    expect(고르기).toMatch(/length > \d+/);
  });

  it("본문 상한이 경로별로 갈린다", () => {
    // 오디오는 JSON 상한(1MB)으로는 못 받는다. 백엔드 multipart 설정과 맞춘다.
    expect(소스).toMatch(/const 최대오디오 = [\d_]+/);
    expect(소스).toContain("본문읽기(req, 멀티파트인가 ? 최대오디오 : 최대본문)");
  });

  it("기본 허용 메서드에는 DELETE 가 없다", () => {
    // DELETE 를 통째로 열면 이 함수가 지우는 통로가 된다.
    const 기본 = /const 기본허용메서드 = new Set\(\[([^\]]*)\]\)/.exec(소스);
    expect(기본).not.toBeNull();
    expect(기본![1]).not.toContain("DELETE");
  });

  it("메서드 검사가 경로를 안 뒤에 온다", () => {
    // 순서가 뒤집히면 경로별 허용이 동작하지 않는다.
    expect(소스.indexOf("const 경로 =")).toBeLessThan(소스.indexOf("메서드가되나(req.method"));
  });
});
