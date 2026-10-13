package com.logistics.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class LogisticsCalcUtil {
    

    public static BigDecimal calculateCbm(BigDecimal width, BigDecimal length, BigDecimal height) {
        if (width == null || length == null || height == null) {
            return BigDecimal.ZERO;
        }
        // (W * L * H) / 1,000,000,000
        BigDecimal volumeMm3 = width.multiply(length).multiply(height);
        return volumeMm3.divide(new BigDecimal("1000000000"), 4, RoundingMode.HALF_UP);
    }
    

    public static BigDecimal calculateTotalWeight(BigDecimal unitWeight, int quantity) {
        if (unitWeight == null) {
            return BigDecimal.ZERO;
        }
        return unitWeight.multiply(new BigDecimal(quantity));
    }
}
