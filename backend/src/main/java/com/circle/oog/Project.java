package com.circle.oog;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="oog_project")
public class Project {
    @Id public UUID id = UUID.randomUUID();
    public long tenantId;
    @NotBlank @Size(max=160) public String name;
    @NotBlank @Size(max=160) public String customer;
    @Size(max=160) public String destination;
    public String status = "DRAFT";
    public Instant createdAt = Instant.now();
    @Version public long version;
}
