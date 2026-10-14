package com.circle.oog;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;

@RestController
@RequestMapping("/api/imports")
public class ImportDetectionController {
    private final ImportTemplateService templates;
    public ImportDetectionController(ImportTemplateService templates){this.templates=templates;}
    @SuppressWarnings("unchecked") @PostMapping("/detect") public Object detect(@RequestParam MultipartFile file,@RequestParam(defaultValue="")String customer) throws Exception {
        String name=file.getOriginalFilename()==null?"":file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if(file.isEmpty()||file.getSize()>15*1024*1024||!(name.endsWith(".xls")||name.endsWith(".xlsx")))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"15MB 이하 Excel 파일을 선택하세요");
        try(var input=file.getInputStream();var wb=ExcelWorkbookReader.read(input)) {var result=new ImportDetectionService().detect(wb);for(var c:(java.util.List<java.util.Map<String,Object>>)result.get("candidates")){var headers=(java.util.List<String>)c.get("combinedHeaders");c.put("headerFingerprint",ImportTemplateService.fingerprint(headers));c.put("templateSuggestions",templates.suggestions(VerifiedActor.tenantId(),customer,headers));}return result;}
        catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());}
        catch(java.io.IOException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"읽을 수 없는 Excel 파일입니다");}
    }
}
