from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name in ['verify-foundation.py','verify-core.py','verify-parallel.py','verify-master-pdf.py']:
 p=root/'tools'/name;s=p.read_text(encoding='utf-8').replace("'V5'","'V8'").replace("=='5'","=='8'").replace("('5',True)","('8',True)").replace('Flyway V5','Flyway V8').replace('(8,7,16)','(8,13,22)').replace('len(tables)==15','len(tables)==21').replace("'business':7,'flyway':1,'total':16","'business':13,'flyway':1,'total':22").replace('eight core seven business and Flyway tables','eight core thirteen business and Flyway tables').replace('eight common seven business sixteen total tables','eight common thirteen business twenty-two total tables')
 p.write_text(s,encoding='utf-8')
p=root/'frontend/src/main.tsx';s=p.read_text(encoding='utf-8').replace('await refresh(project!.id);await proposePlan(project!.id);setNewCargo(false);cargoForm.resetFields();setPlan(undefined);','await refresh(project!.id);setPlan(undefined);await proposePlan(project!.id);setNewCargo(false);cargoForm.resetFields();');p.write_text(s,encoding='utf-8')
print('V8 regression expectations and automatic cargo plan retention updated')
