import MetaBallsBackground from "./components/MetaBallsBackground";
import HeroSection from "./sections/HeroSection";
import "./App.css";

function App() {
  return (
    <div className="App">
      <MetaBallsBackground />
      <div className="main-content">
        <HeroSection />
        {/* Add more sections here if needed */}
      </div>
    </div>
  );
}

export default App;
