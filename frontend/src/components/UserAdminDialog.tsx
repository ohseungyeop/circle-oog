import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface UserRow {
    email: string;
    status: 'A' | 'I' | 'S';
    admin: boolean;
    creDt: string | null;
}

const STATUS_LABEL: Record<UserRow['status'], { label: string; color: 'success' | 'warning' | 'default' }> = {
    A: { label: '허용', color: 'success' },
    I: { label: '승인 대기', color: 'warning' },
    S: { label: '차단', color: 'default' },
};

interface UserAdminDialogProps {
    open: boolean;
    onClose: () => void;
}

/** 로그인 허용 사용자 관리 (관리자 전용) */
const UserAdminDialog: React.FC<UserAdminDialogProps> = ({ open, onClose }) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [users, setUsers] = React.useState<UserRow[]>([]);
    const [newEmail, setNewEmail] = React.useState('');
    const [error, setError] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [removeTarget, setRemoveTarget] = React.useState<string | null>(null);

    const request = async (method: string, query = '', body?: object) => {
        const response = await fetch(`${apiUrl}/vos/oog/v1/admin/users${query}`, {
            method,
            credentials: 'include',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error ?? result.message ?? '요청 실패');
        return result.data;
    };

    const loadUsers = async () => {
        try {
            setUsers(await request('GET'));
            setError('');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    React.useEffect(() => {
        if (open) loadUsers();
    }, [open]);

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await action();
            await loadUsers();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    const setStatus = (email: string, status: UserRow['status']) => run(() => request('PUT', '', { email, status }));
    const removeUser = (email: string) => {
        setRemoveTarget(null);
        return run(() => request('DELETE', `?email=${encodeURIComponent(email)}`));
    };
    const addUser = () =>
        run(async () => {
            await request('PUT', '', { email: newEmail, status: 'A' });
            setNewEmail('');
        });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>로그인 허용 사용자</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 1 }}>
                    <TextField
                        size="small"
                        type="email"
                        label="이메일"
                        placeholder="name@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        sx={{ flex: 1 }}
                    />
                    <Button variant="contained" onClick={addUser} disabled={!newEmail || busy}>
                        추가
                    </Button>
                </Box>
                {error && (
                    <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                        {error}
                    </Typography>
                )}
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>이메일</TableCell>
                            <TableCell>상태</TableCell>
                            <TableCell>등록일</TableCell>
                            <TableCell align="right"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4}>등록된 사용자가 없습니다.</TableCell>
                            </TableRow>
                        )}
                        {users.map((user) => (
                            <TableRow key={user.email}>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.admin ? (
                                        <Chip size="small" color="primary" label="관리자" />
                                    ) : (
                                        <Chip size="small" color={STATUS_LABEL[user.status].color} label={STATUS_LABEL[user.status].label} />
                                    )}
                                </TableCell>
                                <TableCell>{user.creDt ? new Date(user.creDt).toLocaleString('ko-KR') : ''}</TableCell>
                                <TableCell align="right">
                                    {!user.admin && (
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            {user.status !== 'A' && (
                                                <Button size="small" disabled={busy} onClick={() => setStatus(user.email, 'A')}>
                                                    허용
                                                </Button>
                                            )}
                                            {user.status !== 'S' && (
                                                <Button size="small" color="warning" disabled={busy} onClick={() => setStatus(user.email, 'S')}>
                                                    차단
                                                </Button>
                                            )}
                                            <Button size="small" color="error" disabled={busy} onClick={() => setRemoveTarget(user.email)}>
                                                삭제
                                            </Button>
                                        </Box>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>닫기</Button>
            </DialogActions>
            <Dialog open={removeTarget !== null} onClose={() => setRemoveTarget(null)}>
                <DialogTitle>사용자 삭제</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {removeTarget} 을(를) 목록에서 지웁니다. 다시 로그인을 시도하면 신규 신청으로 들어옵니다.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemoveTarget(null)}>취소</Button>
                    <Button color="error" variant="contained" onClick={() => removeTarget && removeUser(removeTarget)}>
                        삭제
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default UserAdminDialog;
