package com.circle.oog;

import java.security.Principal;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/plans/{planId}/revisions")
public class PlanRevisionController {
    private final PlanRevisionService service;
    public PlanRevisionController(PlanRevisionService service) { this.service=service; }
    @PostMapping public Object revise(@PathVariable UUID projectId,@PathVariable UUID planId,
        @RequestBody PlanRevisionService.Revision request,Principal principal) throws Exception {
        return service.revise(projectId,planId,request,principal.getName());
    }
}
