package com.circle.oog;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api")
public class QuotationController {
    private final QuotationService service;
    public QuotationController(QuotationService service){this.service=service;}
    @GetMapping("/packing/rules") public Object rules(){return service.rules(VerifiedActor.tenantId());}
    @PostMapping("/packing/rules") public Object rule(@RequestBody QuotationService.PackingRuleInput input){var actor=VerifiedActor.current();return service.createRule(actor.getTenantId(),actor.getUserId(),input);}
    @GetMapping("/quotation/rates") public Object rates(){return service.rates(VerifiedActor.tenantId());}
    @PostMapping("/quotation/rates") public Object rate(@RequestBody QuotationService.RateInput input){var actor=VerifiedActor.current();return service.createRate(actor.getTenantId(),actor.getUserId(),input);}
    @GetMapping("/projects/{id}/packing-estimates") public Object estimates(@PathVariable UUID id)throws Exception{return service.list(VerifiedActor.tenantId(),id,false);}
    @PostMapping("/projects/{id}/packing-estimates") public Object estimate(@PathVariable UUID id,@RequestBody QuotationService.EstimateInput input)throws Exception{var actor=VerifiedActor.current();return service.estimate(actor.getTenantId(),actor.getUserId(),id,input);}
    @GetMapping("/projects/{id}/quotations") public Object quotes(@PathVariable UUID id)throws Exception{return service.list(VerifiedActor.tenantId(),id,true);}
    @PostMapping("/projects/{id}/quotations") public Object quote(@PathVariable UUID id,@RequestBody QuotationService.QuoteInput input)throws Exception{var actor=VerifiedActor.current();return service.quote(actor.getTenantId(),actor.getUserId(),id,input);}
}
