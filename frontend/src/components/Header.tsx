// src/components/Header.tsx
const Header = () => {
    return (
      <header className="bg-gray-800 py-6 px-8 border-b border-purple-700 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-14 h-14 mr-4 relative">
              <div className="absolute inset-0 bg-purple-500 rounded-full opacity-50 animate-pulse"></div>
              <div className="absolute inset-1 bg-gray-800 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-purple-300">XIV DT Updater</h1>
              <p className="text-gray-400 text-sm">Dont we all love dawntrail?</p>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="px-4 py-2 bg-gray-700 rounded-lg border border-purple-600 text-purple-200 text-sm">
              Server status: OK
            </div>
          </div>
        </div>
      </header>
    );
  };
  
  export default Header;