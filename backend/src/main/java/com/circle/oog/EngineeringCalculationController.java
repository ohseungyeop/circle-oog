package com.circle.oog;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequestMapping("/api/projects/{id}/plans/{planId}/engineering/calculations")
public class EngineeringCalculationController {
    private final EngineeringCalculationService service;
    public EngineeringCalculationController(EngineeringCalculationService service){this.service=service;}
    private void reviewer(){if(!Set.of("ENGINEER","ADMIN","SUPER_ADMIN").contains(VerifiedActor.current().getRoleCode()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"엔지니어 또는 관리자 역할이 필요합니다");}
    @GetMapping public Object list(@PathVariable UUID id,@PathVariable UUID planId)throws Exception{return service.list(VerifiedActor.tenantId(),id,planId);}
    @GetMapping("/context") public Object context(@PathVariable UUID id,@PathVariable UUID planId)throws Exception{return service.context(VerifiedActor.tenantId(),id,planId);}
    @PostMapping public Object create(@PathVariable UUID id,@PathVariable UUID planId,@RequestBody EngineeringCalculationService.Input request)throws Exception{reviewer();var actor=VerifiedActor.current();return service.create(actor.getTenantId(),actor.getUserId(),id,planId,request);}
    @GetMapping("/expanded/profiles") public Object expandedProfiles(@PathVariable UUID id,@PathVariable UUID planId)throws Exception{service.context(VerifiedActor.tenantId(),id,planId);return ExpandedEngineeringService.profiles();}
    @GetMapping("/expanded/references") public Object references(@PathVariable UUID id,@PathVariable UUID planId)throws Exception{service.context(VerifiedActor.tenantId(),id,planId);return PublishedCarrierGuidance.catalog();}
    @PostMapping("/expanded/load-distribution") public Object loadDistribution(@PathVariable UUID id,@PathVariable UUID planId,@RequestBody PublishedCarrierGuidance.Request request)throws Exception{service.context(VerifiedActor.tenantId(),id,planId);return PublishedCarrierGuidance.check(request);}
    @PostMapping("/expanded") public Object expanded(@PathVariable UUID id,@PathVariable UUID planId,@RequestBody ExpandedEngineeringService.Input request)throws Exception{reviewer();var actor=VerifiedActor.current();return service.createExpanded(actor.getTenantId(),actor.getUserId(),id,planId,request);}
    @PostMapping("/{calculationId}/decisions") public Object decide(@PathVariable UUID id,@PathVariable UUID planId,@PathVariable UUID calculationId,@RequestBody EngineeringCalculationService.Decision input)throws Exception{reviewer();var actor=VerifiedActor.current();return service.decide(actor.getTenantId(),actor.getUserId(),id,planId,calculationId,input);}
}
