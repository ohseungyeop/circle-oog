package com.circle.oog;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/carrier-rules")
public class CarrierRuleController {
    private final CarrierRuleService service;
    public CarrierRuleController(CarrierRuleService service){this.service=service;}
    @GetMapping public Object list(){return service.list(VerifiedActor.tenantId());}
    @PostMapping public Object create(@RequestBody CarrierRuleService.Input input){var actor=VerifiedActor.current();return service.create(actor.getTenantId(),actor.getUserId(),input);}
}
