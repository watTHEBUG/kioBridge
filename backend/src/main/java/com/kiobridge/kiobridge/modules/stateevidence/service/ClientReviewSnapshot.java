package com.kiobridge.kiobridge.modules.stateevidence.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** RC5 reviewSnapshot 중 브라우저에 공개해도 되는 장바구니 필드만 담는다. */
public record ClientReviewSnapshot(
        List<CartItem> cartItems, // 키오스크 장바구니에 담긴 상품 목록
        BigDecimal total         // 장바구니 전체 금액
) {
    public static ClientReviewSnapshot from(Map<String, Object> raw) { // RC5가 반환한 원본 reviewSnapshot
        if (raw == null) {
            return null;
        }

        List<CartItem> items = new ArrayList<>(); // 허용 필드만 복사한 브라우저용 상품 목록

        if (raw.get("cartItems") instanceof List<?> rawItems) { // 원본 장바구니 상품 배열
            for (Object rawItem : rawItems) { // 타입을 아직 신뢰하지 않는 상품 원본 하나
                if (rawItem instanceof Map<?, ?> item) { // 상품의 키-값 원본
                    String name = item.get("name") instanceof String value // 검증된 상품명 문자열
                            ? value
                            : null;

                    BigDecimal price = toDecimal(item.get("price")); // 손실 없이 변환한 상품 가격

                    int quantity = toQuantity(item.get("quantity")); // 검증·정규화한 상품 수량

                    items.add(new CartItem(name, price, quantity));
                }
            }
        }

        return new ClientReviewSnapshot(
                List.copyOf(items),
                toDecimal(raw.get("total"))
        );
    }

    private static BigDecimal toDecimal(Object value) { // RC5에서 받은 숫자 후보 값
        return value instanceof Number number
                ? new BigDecimal(number.toString())
                : null;
    }

    private static int toQuantity(Object value) { // 정수 수량으로 변환할 RC5 원본 값
        if (!(value instanceof Number number)) {
            return 0;
        }
        try {
            int quantity = new BigDecimal(number.toString()).intValueExact(); // 범위와 소수 여부를 확인한 값
            return quantity < 0 ? 0 : quantity;
        } catch (NumberFormatException | ArithmeticException e) {
            return 0;
        }
    }

    public record CartItem(
            String name,       // 상품 표시 이름
            BigDecimal price,  // 상품 한 개 가격
            int quantity       // 장바구니 수량(유효하지 않은 값은 0)
    ) {}
}
