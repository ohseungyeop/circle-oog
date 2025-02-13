import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StyledEngineProvider } from '@mui/material/styles';
import SignIn from './SignIn.tsx';
import GridIndex from './grid.tsx';
import withAuth from './withAuth.tsx';
import FileListGrid from './fileList.tsx';
const ProtectedGridIndex = withAuth(FileListGrid);
const root = ReactDOM.createRoot(document.querySelector("#root")!);

root.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <Router>
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/mainPage" element={<ProtectedGridIndex />} />
          <Route path="/exportGrid" element={<GridIndex />} />
        </Routes>
      </Router>
    </StyledEngineProvider>
  </React.StrictMode>
);
