package com.circle.oog;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

interface Projects extends JpaRepository<Project, UUID> {
    java.util.Optional<Project> findByIdAndTenantId(UUID id,long tenantId);
    org.springframework.data.domain.Page<Project> findByTenantId(long tenantId,org.springframework.data.domain.Pageable pageable);
}
interface Cargos extends JpaRepository<Cargo, UUID> { List<Cargo> findByProjectIdOrderByItemNo(UUID id); }
interface Equipments extends JpaRepository<Equipment, String> {}
interface Rules extends JpaRepository<PlanningRule, String> {}
