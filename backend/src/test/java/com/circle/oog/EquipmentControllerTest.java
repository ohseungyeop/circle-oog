package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fms.security.FmsPrincipal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EquipmentControllerTest {
    @Test void registrationRejectsUnsafeCodesMissingEvidenceAndClosedSideAllowance() {
        for(String code:List.of("x","../40FR","40 FR"))assertThatThrownBy(()->EquipmentController.validateRegistration(new EquipmentController.Registration(code,specification(10000,0L),.94,.9,0d,0d,"source"))).hasMessageContaining("400");
        assertThatThrownBy(()->EquipmentController.validateRegistration(new EquipmentController.Registration("20OT",specification(10000,0L),.94,.9,10d,0d,"source"))).hasMessageContaining("400");
        assertThatThrownBy(()->EquipmentController.validateRegistration(new EquipmentController.Registration("20OT",specification(10000,0L),.94,.9,0d,0d," "))).hasMessageContaining("400");
        assertThatThrownBy(()->EquipmentController.validateRegistration(new EquipmentController.Registration("20OT",specification(10000,0L),Double.NaN,.9,0d,0d,"source"))).hasMessageContaining("400");
    }
    @Test void companyAdminCannotRegisterEquipment() {
        authenticate(2,"ADMIN");var repo=mock(Equipments.class);var jdbc=mock(JdbcTemplate.class);
        assertThatThrownBy(()->new EquipmentController(repo,jdbc,new ObjectMapper()).create(null)).hasMessageContaining("403");verifyNoInteractions(repo,jdbc);
    }
    EquipmentController.Specification specification(double length,Long version) {return new EquipmentController.Specification("40 HC",length,2352d,2698d,26500d,false,false,version);}
    void authenticate(long tenant,String role) {var actor=new FmsPrincipal("admin",1L,tenant,1L,0,role,List.of(),null);SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor,null,actor.getAuthorities()));}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    @Test void rejectsMissingNonfiniteAndOutOfRangeDimensions() {
        for(double length:new double[]{0,-1,Double.NaN,Double.POSITIVE_INFINITY,100001})assertThatThrownBy(()->EquipmentController.validate(specification(length,0L))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        assertThatThrownBy(()->EquipmentController.validate(specification(12032,null))).hasMessageContaining("400");
        assertThatThrownBy(()->EquipmentController.validate(new EquipmentController.Specification(" ",12032d,2352d,2698d,26500d,false,false,0L))).hasMessageContaining("400");
        assertThatThrownBy(()->EquipmentController.validate(new EquipmentController.Specification("HC",12032d,Double.NaN,2698d,26500d,false,false,0L))).hasMessageContaining("400");
        assertThatThrownBy(()->EquipmentController.validate(new EquipmentController.Specification("HC",12032d,2352d,2698d,0d,false,false,0L))).hasMessageContaining("400");
        assertThatCode(()->EquipmentController.validate(specification(100000,0L))).doesNotThrowAnyException();
    }
    @Test void staleVersionDoesNotSaveOrAudit() {
        authenticate(1,"SUPER_ADMIN");var repository=mock(Equipments.class);var jdbc=mock(JdbcTemplate.class);var existing=new Equipment();existing.code="40HC";existing.version=2;
        when(repository.findById("40HC")).thenReturn(Optional.of(existing));
        var controller=new EquipmentController(repository,jdbc,new ObjectMapper());
        assertThatThrownBy(()->controller.update("40HC",specification(12032,1L))).hasMessageContaining("409");
        verify(repository,never()).saveAndFlush(any());verifyNoInteractions(jdbc);
    }
    @Test void tenantAdministratorCannotChangeSharedSpecification() {
        authenticate(2,"ADMIN");var repository=mock(Equipments.class);var jdbc=mock(JdbcTemplate.class);var controller=new EquipmentController(repository,jdbc,new ObjectMapper());
        assertThatThrownBy(()->controller.update("40HC",specification(12032,0L))).hasMessageContaining("403");verifyNoInteractions(repository,jdbc);
    }
    @Test void successfulUpdatePreservesCodeAndRecordsBeforeAfterAndVersion() throws Exception {
        authenticate(1,"SUPER_ADMIN");var repository=mock(Equipments.class);var jdbc=mock(JdbcTemplate.class);var existing=new Equipment();existing.code="40HC";existing.name="Before";existing.length=12000;existing.version=3;
        when(repository.findById("40HC")).thenReturn(Optional.of(existing));when(repository.saveAndFlush(existing)).thenAnswer(invocation->{existing.version++;return existing;});
        var controller=new EquipmentController(repository,jdbc,new ObjectMapper());var saved=controller.update("40HC",specification(12032,3L));
        assertThat(saved.code).isEqualTo("40HC");assertThat(saved.length).isEqualTo(12032);assertThat(saved.version).isEqualTo(4);
        var detail=org.mockito.ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(contains("actor_user_id"),eq("EQUIPMENT_UPDATED"),eq("admin"),detail.capture(),eq(1L),eq(1L));
        var audit=new ObjectMapper().readTree(detail.getValue());assertThat(audit.path("before").path("length").asDouble()).isEqualTo(12000);assertThat(audit.path("after").path("version").asLong()).isEqualTo(4);
    }
}
