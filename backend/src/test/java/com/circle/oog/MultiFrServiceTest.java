package com.circle.oog;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class MultiFrServiceTest {
    private Equipment equipment(){var e=new Equipment();e.code="40FR";e.length=12000;e.width=2400;e.height=2200;e.payload=40000;return e;}
    private PlanningRule rule(){var r=new PlanningRule();r.usableLengthRatio=.94;r.planningWeightRatio=.9;r.maxOverHeight=1800;r.version=7;return r;}
    private Cargo cargo(){var c=new Cargo();c.length=20000;c.width=4000;c.height=3000;c.grossWeight=100000;return c;}
    @Test void necessaryScreenNeverClaimsApprovalAndKeepsArrayAndVersion(){var v=MultiFrService.candidate(cargo(),equipment(),rule(),2,2,500);assertEquals("NECESSARY_SCREEN_ONLY",v.status());assertEquals(4,v.equipmentArray().size());assertEquals(7,v.ruleVersion());assertEquals(24500,v.arrayLength());assertEquals(5300,v.arrayWidth());}
    @Test void insufficientManualCountIsReported(){var v=MultiFrService.candidate(cargo(),equipment(),rule(),2,1,0);assertEquals("SCREEN_INSUFFICIENT",v.status());assertFalse(v.dimensionalScreen());assertFalse(v.aggregateWeightScreen());}
    @Test void gapCannotMakeInsufficientDeckPass(){var c=cargo();c.length=23000;c.width=2000;c.grossWeight=1000;var v=MultiFrService.candidate(c,equipment(),rule(),2,1,5000);assertFalse(v.dimensionalScreen());}
    @Test void invalidAndOversizedArraysRejected(){assertThrows(ResponseStatusException.class,()->MultiFrService.candidate(cargo(),equipment(),rule(),0,2,0));assertThrows(ResponseStatusException.class,()->MultiFrService.candidate(cargo(),equipment(),rule(),Integer.MAX_VALUE,2,0));}
}
