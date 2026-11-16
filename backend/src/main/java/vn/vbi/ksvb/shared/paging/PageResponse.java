package vn.vbi.ksvb.shared.paging;

import java.util.List;
import org.springframework.data.domain.Page;

/** Dạng trang chung (docs/kien-truc-chuan.md 3.1): {@code page} đếm từ 0; không phụ thuộc cấu trúc nội bộ của Spring Data Page. */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
    public static <T> PageResponse<T> of(Page<T> p) {
        return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }
}
