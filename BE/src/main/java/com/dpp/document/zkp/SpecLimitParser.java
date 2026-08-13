package com.dpp.document.zkp;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 성적서에 인쇄된 규격 문자열("≤0.24" / "≥355" / "470–630")을 숫자로 파싱.
 * parser/judge.py의 _spec_check와 동일한 규칙(파이썬 판정 엔진과 1:1 대응) - 단 여기서는
 * 판정(적합/미달)을 내리지 않고 상한/하한 숫자만 뽑는다. 실제 판정은 zkp 회로가 한다.
 */
public final class SpecLimitParser {

    private static final Pattern RANGE = Pattern.compile("^([\\d.]+)\\s*[–-]\\s*([\\d.]+)$");

    private SpecLimitParser() {
    }

    public record SpecLimit(Double lower, Double upper) {
    }

    public static SpecLimit parse(String specText) {
        if (specText == null) {
            return null;
        }
        String s = specText.strip();
        if (s.startsWith("≤")) {
            return new SpecLimit(null, Double.parseDouble(s.substring(1)));
        }
        if (s.startsWith("≥")) {
            return new SpecLimit(Double.parseDouble(s.substring(1)), null);
        }
        Matcher m = RANGE.matcher(s);
        if (m.matches()) {
            return new SpecLimit(Double.parseDouble(m.group(1)), Double.parseDouble(m.group(2)));
        }
        return null;
    }
}
