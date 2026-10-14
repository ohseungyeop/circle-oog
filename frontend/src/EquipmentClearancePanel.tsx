import {useState} from 'react';
import {Alert,Button,Form,Input,InputNumber,Modal,Select,Switch,Table} from 'antd';
type Result={status:string;axes:string;orientations:{rotated:boolean;remainingAmm:number;remainingBmm:number;openingFits:boolean}[];notes:string[]};
export function EquipmentClearancePanel({code,calculate}:{code:string;calculate:(input:unknown)=>Promise<Result>}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result>();const [form]=Form.useForm();
 async function submit(value:unknown){setBusy(true);setResult(undefined);setError('');try{setResult(await calculate(value));}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <><Button onClick={()=>setOpen(true)}>개구부 검토</Button><Modal title={`${code} 반입 개구부 사전 검토`} open={open} onCancel={()=>{if(!busy)setOpen(false);}} onOk={()=>form.submit()} confirmLoading={busy} cancelButtonProps={{disabled:busy}}>
 <Alert type="info" message="실제 유효 개구부와 면당 작업 여유를 입력하세요" description="DOOR A=폭/B=높이, TOP A=길이/B=폭, SIDE A=길이/B=높이. 직사각형 단면 검사이며 내부 경로·기울임·인양·구조 검토는 별도입니다."/>
 <Form form={form} layout="vertical" onValuesChange={()=>{setResult(undefined);setError('');}} onFinish={submit} initialValues={{mode:'DOOR',rotationAllowed:false}} disabled={busy}>
 <Form.Item name="mode" label="반입 방향" rules={[{required:true}]}><Select options={['DOOR','TOP','SIDE'].map(value=>({value,label:value}))}/></Form.Item>
 {([['cargoLengthMm','화물 길이 mm'],['cargoWidthMm','화물 폭 mm'],['cargoHeightMm','화물 높이 mm'],['openingAmm','개구부 A mm'],['openingBmm','개구부 B mm'],['clearancePerSideMm','면당 작업 여유 mm']] as const).map(([name,label])=><Form.Item key={name} name={name} label={label} rules={[{required:true}]}><InputNumber aria-label={label} min={name==='clearancePerSideMm'?0:.001} max={name==='clearancePerSideMm'?10000:100000} style={{width:'100%'}}/></Form.Item>)}
 <Form.Item name="rotationAllowed" label="반입 전 수평 90도 회전 비교" valuePropName="checked"><Switch/></Form.Item>
 <Form.Item name="evidence" label="개구부 확인 근거" rules={[{required:true,whitespace:true,max:2000}]}><Input.TextArea maxLength={2000}/></Form.Item>
 </Form>{error&&<Alert type="error" message={error}/>}{result&&<><Alert type="info" message={({'RECTANGULAR_OPENING_FITS':'직사각형 개구부 통과 후보','RECTANGULAR_OPENING_EXCEEDED':'개구부 치수 초과','OPENING_MODE_UNAVAILABLE':'해당 면이 개방된 장비가 아닙니다'} as Record<string,string>)[result.status]||result.status} description={result.axes}/><Table size="small" pagination={false} rowKey={r=>String(r.rotated)} dataSource={result.orientations} columns={[{title:'방향',render:(_,r)=>r.rotated?'90도':'정방향'},{title:'A 잔여 mm',dataIndex:'remainingAmm'},{title:'B 잔여 mm',dataIndex:'remainingBmm'},{title:'단면',render:(_,r)=>r.openingFits?'범위 내':'초과/불가'}]}/>{result.notes.map(n=><p key={n}>{n}</p>)}</>}
 </Modal></>;
}
