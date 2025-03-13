import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StyledEngineProvider } from '@mui/material/styles';
import SignIn from './pages/SignIn.tsx';
import withAuth from './components/withAuth.tsx';
import FileListPage from './pages/FileListPage.tsx';

const ProtectedFileListPage = withAuth(FileListPage);
const root = ReactDOM.createRoot(document.querySelector("#root")!);

root.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <Router basename="/">
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/mainPage" element={<ProtectedFileListPage />} />
        </Routes>
      </Router>
    </StyledEngineProvider>
  </React.StrictMode>
);
