package com.circle.oog;

import jakarta.persistence.*;

@Entity
@Table(name="oog_equipment")
public class Equipment {
    @Id public String code;
    public String name;
    public double length;
    public double width;
    public double height;
    public double payload;
    public boolean openWidth;
    public boolean openHeight;
}
