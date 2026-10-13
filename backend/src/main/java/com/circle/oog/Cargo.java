package com.circle.oog;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.util.UUID;

@Entity
@Table(name="oog_cargo")
public class Cargo {
    @Id public UUID id = UUID.randomUUID();
    @NotNull public UUID projectId;
    @NotBlank @Size(max=120) public String itemNo;
    @Size(max=500) public String description;
    @Min(1) @Max(10000) public int quantity = 1;
    @Positive public double length;
    @Positive public double width;
    @Positive public double height;
    @Positive public double grossWeight;
    @PositiveOrZero public double netWeight;
    @PositiveOrZero public double originalLength;
    @PositiveOrZero public double originalWidth;
    @PositiveOrZero public double originalHeight;
    public boolean rotationAllowed;
    public boolean stackable;
    public boolean estimated;
}
