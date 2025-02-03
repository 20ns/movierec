import React from 'react';
import SearchBar from './components/SearchBar';
import Bg from './components/Bg';
import { BrowserRouter } from 'react-router-dom'; // <-- Import BrowserRouter
import { HelmetProvider } from 'react-helmet-async'; // <-- Import HelmetProvider (if you are using react-helmet-async for SEO metadata)

function App() {
  return (
    <BrowserRouter> 
      <HelmetProvider>
        <div>
          <Bg />
          <SearchBar />
        </div>
      </HelmetProvider> 
    </BrowserRouter>
  );
}

export default App;