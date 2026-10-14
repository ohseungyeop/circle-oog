package com.circle.oog;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/import-templates") public class ImportTemplateController {
 private final ImportTemplateService service;public ImportTemplateController(ImportTemplateService service){this.service=service;}
 @GetMapping public Object list(@RequestParam(defaultValue="")String customer){return service.list(VerifiedActor.tenantId(),customer);}
 @PostMapping public Object create(@RequestBody ImportTemplateService.Input input)throws Exception{var actor=VerifiedActor.current();return service.create(actor.getTenantId(),actor.getUserId(),input);}
}
