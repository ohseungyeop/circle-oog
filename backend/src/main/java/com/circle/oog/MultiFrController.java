package com.circle.oog;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/projects/{id}/multifr")
public class MultiFrController {
    private final MultiFrService service;public MultiFrController(MultiFrService service){this.service=service;}
    @PostMapping("/preview")public Object preview(@PathVariable UUID id,@RequestBody MultiFrService.Request input){return service.preview(id,input);}
    @PostMapping("/reviews")public Object save(@PathVariable UUID id,@RequestBody MultiFrService.Request input)throws Exception{return service.save(id,input);}
    @GetMapping("/reviews")public Object history(@PathVariable UUID id,@RequestParam(defaultValue="0")int page){return service.history(id,page);}
}
