package com.dpp.mypage.entity;

/** V8__scan_history.sql의 scan_history.status CHECK 제약과 1:1로 맞춘다. */
public enum ScanStatus {
    VERIFIED,
    UPDATED,
    FAILED
}
