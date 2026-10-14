package com.circle.oog;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class EquipmentClearanceTest {
 Equipment e(){var e=new Equipment();e.code="40OT";e.openHeight=true;return e;}
 EquipmentClearance.Input input(String mode,double a,double b,double clearance,boolean rotate){return new EquipmentClearance.Input(mode,4000d,2000d,2500d,a,b,clearance,rotate,"confirmed aperture drawing");}
 @Test void equalityAndPerSideClearance(){assertThat(EquipmentClearance.calculate(e(),input("DOOR",2100,2600,50,false)).get("status")).isEqualTo("RECTANGULAR_OPENING_FITS");assertThat(EquipmentClearance.calculate(e(),input("DOOR",2099,2600,50,false)).get("status")).isEqualTo("RECTANGULAR_OPENING_EXCEEDED");}
 @Test void topUsesLengthWidthAndRotation(){assertThat(EquipmentClearance.calculate(e(),input("TOP",2100,4100,50,false)).get("status")).isEqualTo("RECTANGULAR_OPENING_EXCEEDED");assertThat(EquipmentClearance.calculate(e(),input("TOP",2100,4100,50,true)).get("status")).isEqualTo("RECTANGULAR_OPENING_FITS");}
 @Test void closedTopAndSideCannotPass(){var e=e();e.openHeight=false;assertThat(EquipmentClearance.calculate(e,input("TOP",10000,10000,0,true)).get("status")).isEqualTo("OPENING_MODE_UNAVAILABLE");assertThat(EquipmentClearance.calculate(e,input("SIDE",10000,10000,0,true)).get("status")).isEqualTo("OPENING_MODE_UNAVAILABLE");}
 @Test void invalidMissingOrNonfiniteInputsRejected(){assertThatThrownBy(()->EquipmentClearance.calculate(e(),input("TOP",Double.NaN,2000,0,false))).hasMessageContaining("400");assertThatThrownBy(()->EquipmentClearance.calculate(e(),input("TOP",4000,2000,-1,false))).hasMessageContaining("400");assertThatThrownBy(()->EquipmentClearance.calculate(e(),input("OTHER",4000,2000,0,false))).hasMessageContaining("400");}
}
