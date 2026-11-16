package vn.vbi.ksvb.signrequest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Bộ đếm số hiệu theo khoá "{tiền tố loại}-{năm}". Luôn đọc với khoá ghi để tránh trùng số. */
@Entity
@Table(name = "doc_counter")
public class DocCounter {

    @Id
    @Column(name = "counter_key", length = 60)
    private String counterKey;

    @Column(name = "last_value", nullable = false)
    private int lastValue;

    protected DocCounter() {}

    public DocCounter(String counterKey) {
        this.counterKey = counterKey;
    }

    public int next() {
        return ++lastValue;
    }

}
