package com.kiobridge.kiobridge.common.text;

import java.util.List;

/**
 * 두 자모열 사이의 편집 거리(레벤슈타인). 삽입·삭제·치환을 각각 1로 센다.
 *
 * 한글 자모에 매인 것이 없는 일반 알고리즘이다 — HangulJamo 가 글자를 자모로
 * 푸는 것까지 하고, 그 결과를 비교하는 일은 여기서 한다. 둘을 나눈 이유는
 * HangulJamo 클래스 주석에 있다.
 */
public final class LevenshteinDistance {

    private LevenshteinDistance() {}

    public static int 거리(List<Character> a, List<Character> b) {
        int m = a.size();
        int n = b.size();
        int[][] dp = new int[m + 1][n + 1];

        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                int 비용 = a.get(i - 1).equals(b.get(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(
                    Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                    dp[i - 1][j - 1] + 비용
                );
            }
        }
        return dp[m][n];
    }
}
