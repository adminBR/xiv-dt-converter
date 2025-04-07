// src/components/Footer.tsx
const Footer = () => {
    return (
      <footer className="bg-gray-800 py-6 px-8 border-t border-purple-700">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <p className="text-gray-400 mb-1">Made with <span className="text-red-500">HATE</span> by a Raider</p>
            <p className="text-xs text-gray-500">Shit ass game.</p>
          </div>
          
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            This is a fan-made tool not affiliated with Square Enix. Final Fantasy XIV and all related titles are registered trademarks of Square Enix Holdings Co., Ltd.
          </p>
        </div>
      </footer>
    );
  };
  
  export default Footer;