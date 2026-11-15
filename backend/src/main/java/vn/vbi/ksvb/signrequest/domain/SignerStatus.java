package vn.vbi.ksvb.signrequest.domain;

/** Trạng thái của một người ký: WAITING = chưa đến lượt, PENDING = đang chờ ký. */
public enum SignerStatus {
    WAITING, PENDING, SIGNED, REJECTED
}
