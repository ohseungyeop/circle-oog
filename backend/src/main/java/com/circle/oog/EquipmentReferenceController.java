package com.circle.oog;
import java.util.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/equipment/references")
public class EquipmentReferenceController {
 private final Equipments equipment;
 public EquipmentReferenceController(Equipments equipment){this.equipment=equipment;}
 @GetMapping public Object list(){return Map.of("catalog",EquipmentReferenceCatalog.catalog(),"comparison",EquipmentReferenceCatalog.compare(equipment.findAll()));}
}
