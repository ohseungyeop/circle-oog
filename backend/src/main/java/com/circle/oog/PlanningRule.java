package com.circle.oog;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name="oog_carrier_rule")
public class PlanningRule {
    @Id public String equipmentCode;
    public String carrier = "DEFAULT";
    @DecimalMin("0.1") @DecimalMax("1.0") public double usableLengthRatio;
    @DecimalMin("0.1") @DecimalMax("1.0") public double planningWeightRatio;
    @PositiveOrZero public double maxOverWidth;
    @PositiveOrZero public double maxOverHeight;
    @Version public long version;
}
