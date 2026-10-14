from pathlib import Path
p=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('initialValues={{quantity:1,netWeight:0,rotationAllowed:false}}', 'initialValues={{quantity:1,netWeight:0,rotationAllowed:false,estimated:false}}')
s=s.replace('<Form.Item name="rotationAllowed" label="수평 회전">', '<Form.Item name="estimated" label="치수·중량 확인 상태"><Select options={[{value:false,label:"확인한 포장 값"},{value:true,label:"추정값 · 실제 포장 후 확인 필요"}]}/></Form.Item><Form.Item name="rotationAllowed" label="수평 회전">')
s=s.replace('<div className="secondary">{a.cargo.description}</div>', '<div className="secondary">{a.cargo.description} {a.cargo.estimated&&<Tag color="orange">포장 추정값</Tag>}</div>')
p.write_text(s,encoding='utf-8');print('Cargo entry and analysis distinguish estimated from verified packing values')
