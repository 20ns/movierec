import React from 'react';
import SearchBar from './SearchBar';

const Navbar = () => {
  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md flex justify-center">
      <SearchBar />
      {/* Navbar content */}
    </nav>
  );
};

export default Navbar;
