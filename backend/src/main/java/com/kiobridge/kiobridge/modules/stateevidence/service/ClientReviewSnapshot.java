package com.kiobridge.kiobridge.modules.stateevidence.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** RC5 reviewSnapshot 중 브라우저에 공개해도 되는 장바구니 필드만 담는다. */
public record ClientReviewSnapshot(
        List<CartItem> cartItems,
        BigDecimal total
) {
    public static ClientReviewSnapshot from(Map<String, Object> raw) {
        if (raw == null) {
            return null;
        }

        List<CartItem> items = new ArrayList<>();

        if (raw.get("cartItems") instanceof List<?> rawItems) {
            for (Object rawItem : rawItems) {
                if (rawItem instanceof Map<?, ?> item) {
                    String name = item.get("name") instanceof String value
                            ? value
                            : null;

                    BigDecimal price = toDecimal(item.get("price"));

                    int quantity = item.get("quantity") instanceof Number value
                            ? value.intValue()
                            : 0;

                    items.add(new CartItem(name, price, quantity));
                }
            }
        }

        return new ClientReviewSnapshot(
                List.copyOf(items),
                toDecimal(raw.get("total"))
        );
    }

    private static BigDecimal toDecimal(Object value) {
        return value instanceof Number number
                ? new BigDecimal(number.toString())
                : null;
    }

    public record CartItem(
            String name,
            BigDecimal price,
            int quantity
    ) {}
}
