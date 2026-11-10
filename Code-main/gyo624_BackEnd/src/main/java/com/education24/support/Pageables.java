package com.education24.support;

import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class Pageables {
    private Pageables() {}

    public static Pageable sanitize(Pageable pageable, Set<String> allowedProperties) {
        if (pageable == null) {
            return PageRequest.of(0, 20, Sort.by("id"));
        }
        int size = pageable.getPageSize() < 1 ? 20 : pageable.getPageSize();
        List<Sort.Order> orders = pageable.getSort().stream()
                .filter(order -> allowedProperties.contains(order.getProperty()))
                .toList();
        Sort sort = orders.isEmpty() ? Sort.by("id") : Sort.by(orders);
        return PageRequest.of(pageable.getPageNumber(), size, sort);
    }
}
