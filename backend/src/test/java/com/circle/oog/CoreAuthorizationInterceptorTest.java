package com.circle.oog;

import com.fms.security.FmsPrincipal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoreAuthorizationInterceptorTest {
    static void authenticate() {
        var actor=new FmsPrincipal("test",1L,2L,3L,10,"ADMIN",List.of(),null);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor,null,actor.getAuthorities()));
    }
    @AfterEach void cleanup(){SecurityContextHolder.clearContext();}
    public void endpoint() {}
    @Test void mapsAllSensitiveRoutesWithoutGenericFallback() {
        assertThat(CoreAuthorizationInterceptor.permission("/api/projects/{projectId}/plans/{planId}/revisions","POST")).isEqualTo(new CoreAuthorizationInterceptor.Permission("PLANNING","edit"));
        assertThat(CoreAuthorizationInterceptor.permission("/api/imports/preview","POST")).isEqualTo(new CoreAuthorizationInterceptor.Permission("PACKING","view"));
        assertThat(CoreAuthorizationInterceptor.permission("/api/projects/{id}/imports/{uploadId}/file","GET")).isEqualTo(new CoreAuthorizationInterceptor.Permission("PACKING","export"));
        assertThat(CoreAuthorizationInterceptor.permission("/api/projects/{id}/future-unknown","GET")).isNull();
    }
    @Test void foreignTenantRejectedBeforeMenuAndHandlerExecution() throws Exception {
        authenticate();var jdbc=mock(JdbcTemplate.class);UUID project=UUID.randomUUID();
        when(jdbc.queryForObject(anyString(),eq(Long.class),eq(project),eq(2L))).thenReturn(0L);
        var request=new MockHttpServletRequest("GET","/api/projects/"+project+"/history");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE,"/api/projects/{id}/history");request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,Map.of("id",project.toString()));
        var handler=new HandlerMethod(this,getClass().getMethod("endpoint"));
        assertThatThrownBy(()->new CoreAuthorizationInterceptor(jdbc).preHandle(request,new MockHttpServletResponse(),handler)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        verify(jdbc).queryForObject(contains("tenant_id=?"),eq(Long.class),eq(project),eq(2L));verifyNoMoreInteractions(jdbc);
    }
    @Test void projectCreateOverridesForgedTenant() throws Exception {
        authenticate();var projects=mock(Projects.class);var jdbc=mock(JdbcTemplate.class);
        when(projects.saveAndFlush(any(Project.class))).thenAnswer(invocation->invocation.getArgument(0));
        var controller=new OogController(projects,null,null,null,null,jdbc,new com.fasterxml.jackson.databind.ObjectMapper(),".","http://localhost:9999");
        var project=new Project();project.tenantId=999;project.name="test";
        assertThat(controller.create(project,()->"forged").tenantId).isEqualTo(2);
        verify(projects).saveAndFlush(argThat(p->p.tenantId==2));
    }
}
