import {Button, Checkbox, Form, InputNumber, Modal, Select, Space, Tag} from 'antd';
import {useState} from 'react';

export type EditableAssignment={cargoId:string;itemNo:string;piece:number;x:number;y:number;locked:boolean;rotated?:boolean};
export type PlanChange={cargoId:string;piece:number;targetContainerNumber:number;x:number;y:number;locked:boolean;rotated:boolean};

export function PlanEditor({assignment,containerNumber,containers,save}:{assignment:EditableAssignment;containerNumber:number;containers:{number:number;equipment:string}[];save:(change:PlanChange)=>Promise<void>}) {
    const [open,setOpen]=useState(false);
    const [busy,setBusy]=useState(false);
    const [failure,setFailure]=useState('');
    const [form]=Form.useForm();
    async function submit(change:PlanChange) {
        setBusy(true);setFailure('');
        try {await save({...change,cargoId:assignment.cargoId,piece:assignment.piece});setOpen(false);}
        catch(e) {setFailure(e instanceof Error?e.message:'계획 개정 실패');}
        finally {setBusy(false);}
    }
    return <><Space><Tag color={assignment.locked?'gold':'default'}>{assignment.locked?'잠금':'편집 가능'}</Tag><Button size="small" onClick={()=>{setFailure('');form.setFieldsValue({...assignment,targetContainerNumber:containerNumber});setOpen(true);}}>이동 · 잠금</Button></Space>
        <Modal title={`${assignment.itemNo} #${assignment.piece} · 계획 개정`} open={open} onCancel={()=>setOpen(false)} onOk={()=>form.submit()} confirmLoading={busy} destroyOnHidden>
            <p>좌표는 mm입니다. 길이·중량·회전·겹침을 서버에서 다시 검사하며 새 계획 사본으로 저장합니다.</p>
            {assignment.locked&&<p>잠긴 화물을 이동하려면 잠금을 명시적으로 해제하세요.</p>}
            <Form form={form} layout="vertical" onFinish={submit}>
                <Form.Item name="targetContainerNumber" label="대상 장비" rules={[{required:true}]}><Select options={containers.map(c=>({value:c.number,label:`#${c.number} ${c.equipment}`}))}/></Form.Item>
                <Space><Form.Item name="x" label="X · 길이 방향" rules={[{required:true}]}><InputNumber min={0}/></Form.Item><Form.Item name="y" label="Y · 폭 방향" rules={[{required:true}]}><InputNumber/></Form.Item></Space>
                <Form.Item name="locked" valuePropName="checked"><Checkbox>이 위치 잠금</Checkbox></Form.Item>
                <Form.Item name="rotated" valuePropName="checked"><Checkbox>수평 90° 회전</Checkbox></Form.Item>
            </Form>
            {failure&&<p role="alert" style={{color:'#b42318'}}>{failure}</p>}
        </Modal></>;
}
