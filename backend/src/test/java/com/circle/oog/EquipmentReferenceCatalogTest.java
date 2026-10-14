package com.circle.oog;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class EquipmentReferenceCatalogTest {
 @Test void eightNonRefrigeratedTypesAndMassIdentity(){var rows=EquipmentReferenceCatalog.candidates();assertThat(rows).hasSize(8);assertThat(rows).extracting(EquipmentReferenceCatalog.Candidate::code).containsExactly("20GP","40GP","40HC","45HC","20OT","40OT","20FR","40FR");for(var c:rows)assertThat(c.tareKg()+c.payload()).isEqualTo(c.maximumGrossKg());assertThat(EquipmentReferenceCatalog.catalog().get("autoApply")).isEqualTo(false);}
 @Test void comparesSourceValuesWithoutModifyingCurrentData(){var e=new Equipment();e.code="40HC";e.length=12032;e.width=2352;e.height=2698;e.payload=26500;var diff=EquipmentReferenceCatalog.compare(List.of(e));var row=diff.stream().filter(v->((EquipmentReferenceCatalog.Candidate)v.get("reference")).code().equals("40HC")).findFirst().orElseThrow();assertThat(row.get("differentFields")).isEqualTo(List.of("height","payload"));assertThat(e.height).isEqualTo(2698);assertThat(diff.stream().filter(v->!((Boolean)v.get("registered"))).count()).isEqualTo(7);}
}
