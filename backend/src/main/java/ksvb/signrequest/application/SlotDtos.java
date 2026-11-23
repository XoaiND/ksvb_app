package ksvb.signrequest.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import ksvb.signrequest.domain.SignSlot;

/** DTO của ô ký trên tệp PDF cần ký (toạ độ trang hiển thị, point, gốc trên-trái). */
public final class SlotDtos {

    private SlotDtos() {}

    public record SlotDto(
            @Min(1) @Max(99) int orderNo,
            @Min(1) int page,
            @DecimalMin("0") double x,
            @DecimalMin("0") double y,
            @DecimalMin("10") double width,
            @DecimalMin("10") double height) {

        static SlotDto of(SignSlot s) {
            return new SlotDto(s.orderNo(), s.page(), s.x(), s.y(), s.width(), s.height());
        }

        SignSlot toSlot() {
            return new SignSlot(orderNo, page, x, y, width, height);
        }
    }

    public record PageSizeDto(double width, double height) {}

    /** Kích thước các trang + ô ký đọc từ annotation trong PDF. */
    public record SlotLayoutDto(List<PageSizeDto> pages, List<SlotDto> slots) {}

    /** Thay toàn bộ ô ký của một tệp. */
    public record SaveSlots(@NotNull @Size(max = 200) List<@Valid @NotNull SlotDto> slots) {}

    /** Ảnh một trang (JPEG, data URL) để đặt ô ký trên giao diện. */
    public record PageImageDto(String imageDataUrl) {}
}
