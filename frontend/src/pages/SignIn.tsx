import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import AppTheme from '../theme/AppTheme';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchMe } from '../components/withAuth';
import { GoogleIcon } from '../components/CustomIcons';

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: 'auto',
    [theme.breakpoints.up('sm')]: {
        maxWidth: '450px',
    },
    boxShadow:
        'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
    ...theme.applyStyles('dark', {
        boxShadow:
            'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
    }),
}));

const apiUrl = import.meta.env.VITE_API_URL;

const SignInContainer = styled(Stack)(({ theme }) => ({
    height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
    minHeight: '100%',
    padding: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(4),
    },
    '&::before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        zIndex: -1,
        inset: 0,
        backgroundImage:
            'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
        backgroundRepeat: 'no-repeat',
        ...theme.applyStyles('dark', {
            backgroundImage:
                'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
        }),
    },
}));

// 로그인 화면으로 돌아올 때 붙는 오류 코드 (백엔드 authApi.js 의 redirectToLogin)
const ERRORS: Record<string, string> = {
    expired: '로그인 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.',
    not_allowed: '이 주소는 아직 허용 목록에 없습니다. 관리자에게 사용 신청이 전달되었습니다. 승인 후 다시 로그인해 주세요.',
    google: '구글 로그인에 실패했습니다. 다시 시도해 주세요.',
    google_off: '구글 로그인이 설정되어 있지 않습니다. 이메일 링크로 로그인해 주세요.',
    server: '서버 오류로 로그인하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.',
};

const SignIn: React.FC<{ disableCustomTheme?: boolean }> = (props) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [busy, setBusy] = React.useState(false);
    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const [dialogMessage, setDialogMessage] = React.useState('');

    React.useEffect(() => {
        const root = document.getElementById('root');
        if (root) {
            root.setAttribute('aria-hidden', 'false');
        }
        return () => {
            if (root) {
                root.removeAttribute('aria-hidden');
            }
        };
    }, [open]);

    // 이미 로그인되어 있으면 메인으로
    React.useEffect(() => {
        fetchMe(apiUrl).then((me) => {
            if (me) navigate('/mainPage');
        });
    }, [navigate]);

    // 로그인 링크·구글 로그인 실패로 돌아온 경우 안내
    React.useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            setDialogMessage(ERRORS[error] ?? '로그인에 실패했습니다.');
            setOpen(true);
        }
    }, [searchParams]);

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validateInputs()) {
            return;
        }
        const data = new FormData(event.currentTarget);
        const email = data.get('email');

        setBusy(true);
        try {
            const response = await fetch(`${apiUrl}/vos/oog/v1/auth/email`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email }),
            });

            const result = await response.json();
            setDialogMessage(result.message ?? '메일을 확인하세요.');
            setOpen(true);
        } catch (error) {
            console.error('오류 발생:', error);
            setDialogMessage('오류가 발생했습니다. 다시 시도해주세요.');
            setOpen(true);
        } finally {
            setBusy(false);
        }
    };

    const validateInputs = () => {
        const email = document.getElementById('email') as HTMLInputElement;
        let isValid = true;

        if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
            setEmailError(true);
            setEmailErrorMessage('올바른 이메일 주소를 입력해 주세요.');
            isValid = false;
        } else {
            setEmailError(false);
            setEmailErrorMessage('');
        }

        return isValid;
    };

    return (
        <AppTheme {...props}>
            <CssBaseline enableColorScheme />
            <SignInContainer direction="column" justifyContent="space-between">
                <Card variant="outlined">
                    <object
                        data="https://www.valueonsys.com/logo.html?size=24&amp;option=1&amp;anim=yes&amp;bw=b&amp;t=1738630981328"
                        type="text/html"
                title="ValueOnSys 로고"
                aria-label="ValueOnSys 로고"
                        width="230"
                        height="35"
                    ></object>
                    <Typography
                        component="h1"
                        variant="h4"
                        sx={{ width: '100%', textAlign: 'center' }}
                    >
                        Out of Gauge System
                    </Typography>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<GoogleIcon />}
                        href={`${apiUrl}/vos/oog/v1/auth/google`}
                    >
                        Google 계정으로 로그인
                    </Button>
                    <Divider>또는</Divider>
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            gap: 2,
                        }}
                    >
                        <FormControl>
                            <FormLabel htmlFor="email">Email</FormLabel>
                            <TextField
                                error={emailError}
                                helperText={emailErrorMessage}
                                id="email"
                                type="email"
                                name="email"
                                placeholder="your@email.com"
                                autoComplete="email"
                                autoFocus
                                required
                                fullWidth
                                variant="outlined"
                                color={emailError ? 'error' : 'primary'}
                            />
                        </FormControl>
                        <Button type="submit" fullWidth variant="contained" disabled={busy}>
                            {busy ? '보내는 중…' : '로그인 링크 받기'}
                        </Button>
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            등록된 이메일로만 로그인할 수 있습니다. 처음이면 로그인을 시도하면 관리자에게 사용 신청이 전달됩니다.
                        </Typography>
                    </Box>
                </Card>
            </SignInContainer>
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
            >
                <DialogTitle id="dialog-title">알림</DialogTitle>
                <DialogContent>
                    <DialogContentText id="dialog-description">
                        {dialogMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        닫기
                    </Button>
                </DialogActions>
            </Dialog>
        </AppTheme>
    );
};

export default SignIn;
