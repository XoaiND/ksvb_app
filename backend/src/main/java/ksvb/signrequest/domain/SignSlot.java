package ksvb.signrequest.domain;

import java.util.Collection;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import ksvb.shared.error.BusinessException;

/**
 * Ô ký trên tệp PDF cần ký: annotation có nội dung là số thứ tự người ký ({@code orderNo}, 1..N). Vị trí tính theo
 * trang đang hiển thị (đã xoay theo /Rotate, cắt theo CropBox), đơn vị point (1/72 inch), gốc ở góc TRÊN-TRÁI,
 * {@code y} hướng xuống; {@code page} bắt đầu từ 1. Không lưu DB: annotation trong PDF là nguồn sự thật.
 */
public record SignSlot(int orderNo, int page, double x, double y, double width, double height) {

    /**
     * Luật khi trình ký: mỗi người ký thứ k (1..signerCount) phải có ít nhất một ô số k trên các tệp cần ký, và không
     * có ô số nào lớn hơn số người ký.
     */
    public static void requireMatch(Collection<Integer> orders, int signerCount) {
        Set<Integer> present = new TreeSet<>(orders);
        Set<Integer> missing = new TreeSet<>();
        for (int k = 1; k <= signerCount; k++) {
            if (!present.contains(k)) missing.add(k);
        }
        Set<Integer> extra = present.stream().filter(k -> k > signerCount).collect(Collectors.toCollection(TreeSet::new));
        if (missing.isEmpty() && extra.isEmpty()) {
            return;
        }
        StringBuilder msg = new StringBuilder("Ô ký trong tệp PDF chưa khớp người ký.");
        if (!missing.isEmpty()) msg.append(" Thiếu ô số ").append(join(missing)).append('.');
        if (!extra.isEmpty()) {
            msg.append(" Thừa ô số ").append(join(extra)).append(" (văn bản có ").append(signerCount).append(" người ký).");
        }
        throw new BusinessException("SIGN_SLOTS_MISMATCH", msg.toString());
    }

    private static String join(Set<Integer> s) {
        return s.stream().map(String::valueOf).collect(Collectors.joining(", "));
    }
}
