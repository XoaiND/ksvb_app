package vn.vbi.ksvb.common;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Dạng trang chung của hệ sinh thái (ECOSYSTEM.md 12.2, giống HRM): {@code page} đếm từ 0, {@code size} tối đa 100.
 * Không trả {@link Page} của Spring ra API vì cấu trúc JSON của nó đổi theo phiên bản.
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static final int MAX_SIZE = 100;

    public static <T> PageResponse<T> of(Page<T> p) {
        return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }
}
