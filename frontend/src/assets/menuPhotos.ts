import dakgangjeongImg from "@/assets/images/dakgangjeong.jpg";
import chickenNalgaeImg from "@/assets/images/chicken-nalgae.png";
import chickenNalgaeSpicyImg from "@/assets/images/chicken-nalgae-spicy.png";
import chickenBanbanImg from "@/assets/images/chicken-banban.png";
import chickenBonelessSoyImg from "@/assets/images/chicken-boneless-soy.png";

/**
 * chicken-store 환경의 candidateId 별 메뉴 사진.
 *
 * 킷의 Candidate 계약(candidates.json)에는 이미지 필드가 아예 없다 — 백엔드가
 * 아무리 잘 짜도 킷이 안 주는 값을 실어 보낼 수 없다. 그래서 목(mock.ts)이
 * 이름으로 하던 것과 같은 자리표시자 전략을, candidateId 로 여기 한 번 더 둔다.
 *
 * name 이 아니라 candidateId 로 키를 잡은 이유 — candidateId 는 킷이 정한
 * 고정 식별자라 절대 안 바뀌지만, name 은 표시용 문구라 나중에 바뀔 수 있다.
 *
 * 네 장은 라이선스가 확인된 Wikimedia Commons 사진으로 바꿨다(ATTRIBUTIONS.md 참고).
 *   001 매운 순살 → nalgae-spicy.jpg (양념·깨가 뚜렷해 "매운"에 가깝다)
 *   002 순한 순살 → nalgae.jpg
 *   003 매운 뼈  → banban.jpg (뼈·양념이 뚜렷이 보임)
 *   004 간장 순살 → boneless-soy.jpg (제목부터 "Sweet Soy" 라 정확히 일치)
 * 005(땅콩 토핑)·006~008(포장·매장·품절)은 맞는 사진이 아직 없어 자리표시자 그대로.
 */
export const CHICKEN_STORE_PHOTOS: Record<string, string> = {
  "CHICKEN-001": chickenNalgaeSpicyImg,
  "CHICKEN-002": chickenNalgaeImg,
  "CHICKEN-003": chickenBanbanImg,
  "CHICKEN-004": chickenBonelessSoyImg,
  "CHICKEN-005": dakgangjeongImg,
  "CHICKEN-006": dakgangjeongImg,
  "CHICKEN-007": dakgangjeongImg,
  "CHICKEN-008": dakgangjeongImg,
};
