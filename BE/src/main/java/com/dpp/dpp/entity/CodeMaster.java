package com.dpp.dpp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

/**
 * code_master 매핑 - 코드 그룹별 선택지 마스터.
 *
 * V1__schema.sql 때부터 있던 테이블인데 자바에 엔티티가 없어서 지금까지 한 번도 읽힌 적이
 * 없었다(requirement_field.code_group도 그래서 무의미한 컬럼이었다). 2026-08-19 T0·T1
 * 시딩으로 Enum 타입 필드가 25개 생기면서 실제로 필요해졌다.
 *
 * 복합 PK(code_group, code)라 @IdClass를 쓴다.
 */
@Entity
@Table(name = "code_master")
@IdClass(CodeMaster.Key.class)
@Getter
@Setter
public class CodeMaster {

    @Id
    @Column(name = "code_group", length = 40)
    private String codeGroup;

    @Id
    @Column(name = "code", length = 40)
    private String code;

    @Column(name = "name_ko", nullable = false, length = 200)
    private String nameKo;

    @Column(name = "name_en", length = 200)
    private String nameEn;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    /** @IdClass용 복합키. equals/hashCode가 없으면 JPA가 엔티티 동일성 판정을 못 한다. */
    public static class Key implements Serializable {
        private String codeGroup;
        private String code;

        public Key() {
        }

        public Key(String codeGroup, String code) {
            this.codeGroup = codeGroup;
            this.code = code;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Key key)) {
                return false;
            }
            return Objects.equals(codeGroup, key.codeGroup) && Objects.equals(code, key.code);
        }

        @Override
        public int hashCode() {
            return Objects.hash(codeGroup, code);
        }
    }
}
