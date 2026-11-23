package ksvb.signrequest.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import ksvb.shared.error.BusinessException;
import org.junit.jupiter.api.Test;

class SignSlotTest {

    @Test
    void duOChoMoiNguoiKy_hopLe_choPhepNhieuOChoMotNguoi() {
        assertThatCode(() -> SignSlot.requireMatch(List.of(1, 2, 2, 3), 3)).doesNotThrowAnyException();
    }

    @Test
    void thieuO_baoSoThieu() {
        assertThatThrownBy(() -> SignSlot.requireMatch(List.of(1), 3))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Thiếu ô số 2, 3")
                .extracting("code").isEqualTo("SIGN_SLOTS_MISMATCH");
    }

    @Test
    void thuaO_baoSoThua() {
        assertThatThrownBy(() -> SignSlot.requireMatch(List.of(1, 2, 4), 2))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Thừa ô số 4")
                .hasMessageContaining("2 người ký");
    }
}
