from pathlib import Path
p=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('if(candidate.lengthUnit)setLengthUnit(candidate.lengthUnit);if(candidate.weightUnit)setWeightUnit(candidate.weightUnit);if(candidate.weightBasis)setWeightBasis(candidate.weightBasis);','setLengthUnit(candidate.lengthUnit||\'\');setWeightUnit(candidate.weightUnit||\'\');setWeightBasis(candidate.weightBasis||\'\');')
s=s.replace("async function chooseFile(chosen?:File){", "async function chooseFile(chosen?:File,forceDetection=false){").replace("if(!chosen||importMode!=='AUTO')return;", "if(!chosen||importMode!=='AUTO'&&!forceDetection)return;")
s=s.replace('onChange={setImportMode}/><input type="file"', "onChange={value=>{setImportMode(value);if(value==='AUTO'&&file)void chooseFile(file,true);}}/><input type=\"file\"")
s=s.replace('<Select value={lengthUnit}', '<Select placeholder="길이 단위 확인" value={lengthUnit||undefined}').replace('<Select value={weightUnit}', '<Select placeholder="중량 단위 확인" value={weightUnit||undefined}').replace('<Select value={weightBasis}', '<Select placeholder="개당/행합계 확인" value={weightBasis||undefined}')
s=s.replace('||!importConfirmed} onClick=', '||!importConfirmed||!lengthUnit||!weightUnit||!weightBasis} onClick=')
p.write_text(s,encoding='utf-8');print('Unknown inferred units stay unselected; explicit manual selection is required')
