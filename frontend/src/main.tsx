import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StyledEngineProvider } from '@mui/material/styles';
import SignIn from './SignIn.tsx';
import GridIndex from './grid.tsx';

const root = ReactDOM.createRoot(document.querySelector("#root")!);

root.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <Router>
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/mainPage" element={<GridIndex />} />
        </Routes>
      </Router>
    </StyledEngineProvider>
  </React.StrictMode>
);
